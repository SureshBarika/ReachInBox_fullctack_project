import dotenv from 'dotenv';
dotenv.config();

import { ConnectionManager } from './services/imap/ConnectionManager';
import { ElasticsearchService } from './services/elasticsearch/ElasticsearchService';
import { EmailIndexer } from './services/elasticsearch/EmailIndexer';
import { QdrantService } from './services/vector/QdrantService';
import { CategorizationService } from './services/ai/CategorizationService';
import { SlackNotifier } from './services/webhooks/SlackNotifier';
import { WebhookTrigger } from './services/webhooks/WebhookTrigger';
import { ApiServer } from './api/server';
import { getEmailAccounts } from './config/imap';
import { logger } from './utils/logger';
import { EmailDocument } from './models/Email';

class ReachInboxApp {
  private connectionManager: ConnectionManager;
  private esService: ElasticsearchService;
  private emailIndexer: EmailIndexer;
  private qdrantService: QdrantService;
  private categorizationService: CategorizationService;
  private slackNotifier: SlackNotifier;
  private webhookTrigger: WebhookTrigger;
  private apiServer: ApiServer;

  constructor() {
    this.connectionManager = new ConnectionManager();
    this.esService = new ElasticsearchService();
    this.emailIndexer = new EmailIndexer(50, 5000); // Batch size: 50, timeout: 5s
    this.qdrantService = new QdrantService();
    this.categorizationService = new CategorizationService();
    this.slackNotifier = new SlackNotifier();
    this.webhookTrigger = new WebhookTrigger();
    this.apiServer = new ApiServer(parseInt(process.env.PORT || '3000'));
  }

  async initialize() {
    logger.info('🚀 Initializing ReachInbox Application...');

    // Initialize Elasticsearch
    await this.esService.initialize();
    logger.info('✓ Elasticsearch initialized');

    // Initialize Qdrant
    await this.qdrantService.initialize();
    logger.info('✓ Qdrant initialized');

    // Start API Server
    this.apiServer.start();
    logger.info('✓ API Server started');

    // Set up connection manager event listeners
    this.setupConnectionManagerListeners();

    // Initialize IMAP connections for all accounts
    const accounts = getEmailAccounts();
    
    if (accounts.length === 0) {
      logger.warn('⚠️  No email accounts configured!');
      return;
    }

    await this.connectionManager.initializeAccounts(accounts);
    
    // Log connection statistics
    const stats = this.connectionManager.getStatistics();
    logger.info(`📊 Connection Statistics: ${stats.activeConnections}/${stats.totalAccounts} active`);

    logger.info('🎉 ReachInbox Application is running!');
  }

  private setupConnectionManagerListeners() {
    // Handle new emails
    this.connectionManager.on('newEmail', async (email: EmailDocument) => {
      await this.handleNewEmail(email);
    });

    // Handle connection ready
    this.connectionManager.on('connectionReady', (accountId: string) => {
      logger.info(`✓ Connection ready: ${accountId}`);
    });

    // Handle connection failures
    this.connectionManager.on('connectionFailed', (accountId: string, error: Error) => {
      logger.error(`❌ Connection failed permanently: ${accountId}`, error);
    });
  }

  private async handleNewEmail(email: EmailDocument) {
    try {
      logger.info(`📧 Processing new email: ${email.subject}`);

      // Step 1: Index email using EmailIndexer (with batching)
      await this.emailIndexer.indexEmail(email);
      logger.info('✓ Email queued for indexing');

      // Step 2: Categorize email using AI
      const category = await this.categorizationService.categorizeEmail(
        email.subject,
        email.body
      );
      logger.info(`✓ Email categorized as: ${category}`);

      // Step 3: Update category in Elasticsearch
      await this.emailIndexer.updateEmailCategory(email.id, category);

      // Step 4: Trigger webhooks if interested
      if (category === 'Interested') {
        logger.info('🎯 Interested lead detected! Triggering webhooks...');
        
        await Promise.all([
          this.slackNotifier.notifyInterestedLead(email),
          this.webhookTrigger.triggerInterestedEvent(email),
        ]);
        
        logger.info('✓ Webhooks triggered');
      }
    } catch (error) {
      logger.error('❌ Error handling new email:', error);
    }
  }

  async shutdown() {
    logger.info('🛑 Shutting down application...');
    
    // Shutdown connection manager
    await this.connectionManager.shutdown();
    
    // Flush any pending email batches
    await this.emailIndexer.shutdown();
    
    logger.info('✅ Application shutdown complete');
    process.exit(0);
  }
}

// Main execution
const app = new ReachInboxApp();

app.initialize().catch(error => {
  logger.error('❌ Failed to initialize application:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => app.shutdown());
process.on('SIGTERM', () => app.shutdown());