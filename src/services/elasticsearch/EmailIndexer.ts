import { elasticsearchClient, ELASTICSEARCH_INDEX } from '../../config/database';
import { EmailDocument } from '../../models/Email';
import { logger } from '../../utils/logger';
import { retryWithExponentialBackoff } from '../../utils/retry';

export class EmailIndexer {
  private batchQueue: EmailDocument[] = [];
  private batchSize: number = 50;
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchTimeoutMs: number = 5000; // 5 seconds

  constructor(batchSize?: number, batchTimeoutMs?: number) {
    if (batchSize) this.batchSize = batchSize;
    if (batchTimeoutMs) this.batchTimeoutMs = batchTimeoutMs;
  }

  /**
   * Index a single email (with automatic batching)
   */
  public async indexEmail(email: EmailDocument): Promise<void> {
    this.batchQueue.push(email);

    // If batch size reached, flush immediately
    if (this.batchQueue.length >= this.batchSize) {
      await this.flushBatch();
    } else {
      // Otherwise, schedule a flush
      this.scheduleBatchFlush();
    }
  }

  /**
   * Index a single email immediately (bypass batching)
   */
  public async indexEmailImmediate(email: EmailDocument): Promise<void> {
    try {
      await retryWithExponentialBackoff(async () => {
        await elasticsearchClient.index({
          index: ELASTICSEARCH_INDEX,
          id: email.id,
          document: email,
          refresh: 'wait_for', // Ensure searchable immediately
        });
      });

      logger.info(`✓ Email indexed immediately: ${email.id}`);
    } catch (error) {
      logger.error(`Failed to index email ${email.id}:`, error);
      throw error;
    }
  }

  /**
   * Bulk index multiple emails
   */
  public async bulkIndexEmails(emails: EmailDocument[]): Promise<{
    success: number;
    failed: number;
    errors: any[];
  }> {
    if (emails.length === 0) {
      return { success: 0, failed: 0, errors: [] };
    }

    try {
      const operations = emails.flatMap(email => [
        { index: { _index: ELASTICSEARCH_INDEX, _id: email.id } },
        email,
      ]);

      const response = await retryWithExponentialBackoff(async () => {
        return await elasticsearchClient.bulk({
          operations,
          refresh: 'wait_for',
        });
      });

      const errors: any[] = [];
      let successCount = 0;
      let failedCount = 0;

      if (response.items) {
        response.items.forEach((item: any, index: number) => {
          if (item.index?.error) {
            failedCount++;
            errors.push({
              emailId: emails[Math.floor(index / 2)]?.id,
              error: item.index.error,
            });
          } else {
            successCount++;
          }
        });
      }

      logger.info(
        `Bulk indexed ${successCount} emails, ${failedCount} failed`
      );

      return { success: successCount, failed: failedCount, errors };
    } catch (error) {
      logger.error('Bulk indexing failed:', error);
      throw error;
    }
  }

  /**
   * Schedule a batch flush
   */
  private scheduleBatchFlush(): void {
    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Schedule new flush
    this.batchTimeout = setTimeout(async () => {
      await this.flushBatch();
    }, this.batchTimeoutMs);
  }

  /**
   * Flush the current batch
   */
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    // Clear timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Get emails to index and clear queue
    const emailsToIndex = [...this.batchQueue];
    this.batchQueue = [];

    logger.info(`Flushing batch of ${emailsToIndex.length} emails...`);

    try {
      const result = await this.bulkIndexEmails(emailsToIndex);

      if (result.failed > 0) {
        logger.warn(
          `Batch indexing completed with ${result.failed} failures`,
          result.errors
        );
      }
    } catch (error) {
      logger.error('Failed to flush batch:', error);
      
      // Re-add failed emails to queue for retry
      this.batchQueue.push(...emailsToIndex);
    }
  }

  /**
   * Update email category
   */
  public async updateEmailCategory(
    emailId: string,
    category: string
  ): Promise<void> {
    try {
      await retryWithExponentialBackoff(async () => {
        await elasticsearchClient.update({
          index: ELASTICSEARCH_INDEX,
          id: emailId,
          doc: {
            aiCategory: category,
          },
          refresh: 'wait_for',
        });
      });

      logger.info(`✓ Email category updated: ${emailId} -> ${category}`);
    } catch (error) {
      logger.error(`Failed to update category for ${emailId}:`, error);
      throw error;
    }
  }

  /**
   * Update multiple fields for an email
   */
  public async updateEmail(
    emailId: string,
    updates: Partial<EmailDocument>
  ): Promise<void> {
    try {
      await retryWithExponentialBackoff(async () => {
        await elasticsearchClient.update({
          index: ELASTICSEARCH_INDEX,
          id: emailId,
          doc: updates,
          refresh: 'wait_for',
        });
      });

      logger.info(`✓ Email updated: ${emailId}`);
    } catch (error) {
      logger.error(`Failed to update email ${emailId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an email from index
   */
  public async deleteEmail(emailId: string): Promise<void> {
    try {
      await retryWithExponentialBackoff(async () => {
        await elasticsearchClient.delete({
          index: ELASTICSEARCH_INDEX,
          id: emailId,
          refresh: 'wait_for',
        });
      });

      logger.info(`✓ Email deleted: ${emailId}`);
    } catch (error) {
      logger.error(`Failed to delete email ${emailId}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple emails
   */
  public async bulkDeleteEmails(emailIds: string[]): Promise<void> {
    if (emailIds.length === 0) {
      return;
    }

    try {
      const operations = emailIds.map(id => ({
        delete: { _index: ELASTICSEARCH_INDEX, _id: id },
      }));

      await retryWithExponentialBackoff(async () => {
        await elasticsearchClient.bulk({
          operations,
          refresh: 'wait_for',
        });
      });

      logger.info(`✓ Deleted ${emailIds.length} emails`);
    } catch (error) {
      logger.error('Bulk delete failed:', error);
      throw error;
    }
  }

  /**
   * Check if email exists in index
   */
  public async emailExists(emailId: string): Promise<boolean> {
    try {
      const response = await elasticsearchClient.exists({
        index: ELASTICSEARCH_INDEX,
        id: emailId,
      });

      return response;
    } catch (error) {
      logger.error(`Error checking email existence ${emailId}:`, error);
      return false;
    }
  }

  /**
   * Get indexing statistics
   */
  public async getIndexStats(): Promise<{
    totalEmails: number;
    indexSize: string;
    categoryCounts: Record<string, number>;
  }> {
    try {
      // Get total count
      const countResponse = await elasticsearchClient.count({
        index: ELASTICSEARCH_INDEX,
      });

      // Get index stats
      const statsResponse = await elasticsearchClient.indices.stats({
        index: ELASTICSEARCH_INDEX,
      });

      // Get category aggregation
      const aggResponse = await elasticsearchClient.search({
        index: ELASTICSEARCH_INDEX,
        size: 0,
        aggs: {
          categories: {
            terms: {
              field: 'aiCategory',
              size: 10,
            },
          },
        },
      });

      const categoryCounts: Record<string, number> = {};
      if (aggResponse.aggregations?.categories) {
        const buckets = (aggResponse.aggregations.categories as any).buckets;
        buckets.forEach((bucket: any) => {
          categoryCounts[bucket.key] = bucket.doc_count;
        });
      }

      const indexSize =
        statsResponse.indices?.[ELASTICSEARCH_INDEX]?.primaries?.store?.size_in_bytes || 0;

      return {
        totalEmails: countResponse.count,
        indexSize: this.formatBytes(indexSize),
        categoryCounts,
      };
    } catch (error) {
      logger.error('Error getting index stats:', error);
      throw error;
    }
  }

  /**
   * Reindex emails with new settings
   */
  public async reindexEmails(
    sourceIndex?: string,
    targetIndex?: string
  ): Promise<void> {
    const source = sourceIndex || ELASTICSEARCH_INDEX;
    const target = targetIndex || `${ELASTICSEARCH_INDEX}_new`;

    try {
      logger.info(`Starting reindex from ${source} to ${target}...`);

      const response = await elasticsearchClient.reindex({
        wait_for_completion: false,
        body: {
          source: { index: source },
          dest: { index: target },
        },
      });

      logger.info(`Reindex task started: ${response.task}`);
    } catch (error) {
      logger.error('Reindex failed:', error);
      throw error;
    }
  }

  /**
   * Force flush any pending batches (cleanup method)
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down EmailIndexer...');
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    await this.flushBatch();
    
    logger.info('EmailIndexer shutdown complete');
  }

  /**
   * Utility: Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get current batch queue size
   */
  public getBatchQueueSize(): number {
    return this.batchQueue.length;
  }
}