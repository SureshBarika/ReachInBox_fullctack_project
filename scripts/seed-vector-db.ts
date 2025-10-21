import dotenv from 'dotenv';
dotenv.config();

import { QdrantService } from '../src/services/vector/QdrantService';
import { EmbeddingService } from '../src/services/ai/EmbeddingService';
import { logger } from '../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Product knowledge base
const productKnowledge = [
  {
    title: 'Meeting Scheduler',
    text: 'Our product helps automate meeting scheduling. You can book a demo at https://calendly.com/yourcompany/demo. The demo takes 30 minutes and covers all features.',
  },
  {
    title: 'Pricing Plans',
    text: 'We offer three pricing tiers: Starter ($29/month), Professional ($99/month), and Enterprise (custom pricing). All plans include a 14-day free trial with no credit card required.',
  },
  {
    title: 'Product Features',
    text: 'Key features include: Real-time email synchronization, AI-powered categorization, advanced search with filters, webhook integrations, and suggested replies using RAG technology.',
  },
  {
    title: 'Integration Capabilities',
    text: 'Our platform integrates with Slack, Zapier, HubSpot, Salesforce, and supports custom webhooks for automation. API documentation is available at docs.yourcompany.com/api.',
  },
  {
    title: 'Support and Onboarding',
    text: 'We provide 24/7 customer support via email and chat. Enterprise customers get dedicated account managers and custom onboarding sessions. Support response time is under 2 hours.',
  },
  {
    title: 'Company Information',
    text: 'We are ReachInbox, a leading email intelligence platform founded in 2023. Our mission is to help sales teams manage and respond to emails more efficiently using AI.',
  },
];

async function seedVectorDatabase() {
  logger.info('Starting vector database seeding...');

  const qdrantService = new QdrantService();
  const embeddingService = new EmbeddingService();

  try {
    // Initialize Qdrant collection
    await qdrantService.initialize();
    logger.info('✓ Qdrant initialized');

    // Generate embeddings and upsert each knowledge item
    for (const item of productKnowledge) {
      const id = uuidv4();
      logger.info(`Processing: ${item.title}`);

      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(item.text);
      
      // Upsert to vector DB
      await qdrantService.upsertKnowledge(id, item.text, embedding, {
        title: item.title,
      });

      logger.info(`✓ Inserted: ${item.title}`);
    }

    logger.info('🎉 Vector database seeding completed!');
  } catch (error) {
    logger.error('Error seeding vector database:', error);
    throw error;
  }
}

// Run the seeding
seedVectorDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('Seeding failed:', error);
    process.exit(1);
  });