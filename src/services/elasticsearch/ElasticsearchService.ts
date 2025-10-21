import { elasticsearchClient, ELASTICSEARCH_INDEX } from '../../config/database';
import { EmailDocument, EmailSearchQuery } from '../../models/Email';
import { logger } from '../../utils/logger';

export class ElasticsearchService {
  async initialize() {
    const indexExists = await elasticsearchClient.indices.exists({
      index: ELASTICSEARCH_INDEX,
    });

    if (!indexExists) {
      await elasticsearchClient.indices.create({
        index: ELASTICSEARCH_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              accountId: { type: 'keyword' },
              folder: { type: 'keyword' },
              subject: { type: 'text' },
              body: { type: 'text' },
              from: { type: 'text' },
              to: { type: 'keyword' },
              date: { type: 'date' },
              aiCategory: { type: 'keyword' },
              indexedAt: { type: 'date' },
            },
          },
        },
      });
      logger.info('Elasticsearch index created');
    }
  }

  async indexEmail(email: EmailDocument) {
    try {
      await elasticsearchClient.index({
        index: ELASTICSEARCH_INDEX,
        id: email.id,
        body: email,
      });
      logger.info(`Email indexed: ${email.id}`);
    } catch (error) {
      logger.error('Error indexing email:', error);
      throw error;
    }
  }

  async updateEmailCategory(emailId: string, category: string) {
    try {
      await elasticsearchClient.update({
        index: ELASTICSEARCH_INDEX,
        id: emailId,
        body: {
          doc: { aiCategory: category },
        },
      });
      logger.info(`Email category updated: ${emailId} -> ${category}`);
    } catch (error) {
      logger.error('Error updating email category:', error);
    }
  }

  async searchEmails(query: EmailSearchQuery) {
    const mustClauses: any[] = [];
    const filterClauses: any[] = [];

    if (query.query) {
      mustClauses.push({
        multi_match: {
          query: query.query,
          fields: ['subject^2', 'body', 'from'],
        },
      });
    }

    if (query.accountId) {
      filterClauses.push({ term: { accountId: query.accountId } });
    }

    if (query.folder) {
      filterClauses.push({ term: { folder: query.folder } });
    }

    if (query.category) {
      filterClauses.push({ term: { aiCategory: query.category } });
    }

    const response = await elasticsearchClient.search({
      index: ELASTICSEARCH_INDEX,
      body: {
        from: query.from || 0,
        size: query.size || 20,
        query: {
          bool: {
            must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
            filter: filterClauses,
          },
        },
        sort: [{ date: { order: 'desc' } }],
      },
    });

    return {
      total: response.hits.total,
      emails: response.hits.hits.map(hit => hit._source as EmailDocument),
    };
  }

  async getEmailById(id: string): Promise<EmailDocument | null> {
    try {
      const response = await elasticsearchClient.get({
        index: ELASTICSEARCH_INDEX,
        id,
      });
      return response._source as EmailDocument;
    } catch (error) {
      return null;
    }
  }
}