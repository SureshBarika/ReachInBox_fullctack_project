import { qdrantClient, QDRANT_COLLECTION } from '../../config/database';
import { logger } from '../../utils/logger';

export interface ProductKnowledge {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

export class QdrantService {
  async initialize() {
    try {
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some(c => c.name === QDRANT_COLLECTION);

      if (!exists) {
        await qdrantClient.createCollection(QDRANT_COLLECTION, {
          vectors: {
            size: 768, // Gemini embedding dimension
            distance: 'Cosine',
          },
        });
        logger.info('Qdrant collection created');
      }
    } catch (error) {
      logger.error('Error initializing Qdrant:', error);
    }
  }

  async upsertKnowledge(id: string, text: string, embedding: number[], metadata?: Record<string, any>) {
    try {
      await qdrantClient.upsert(QDRANT_COLLECTION, {
        points: [{
          id,
          vector: embedding,
          payload: { text, ...metadata },
        }],
      });
      logger.info(`Knowledge upserted: ${id}`);
    } catch (error) {
      logger.error('Error upserting knowledge:', error);
      throw error;
    }
  }

  async search(queryEmbedding: number[], limit: number = 3): Promise<ProductKnowledge[]> {
    try {
      const results = await qdrantClient.search(QDRANT_COLLECTION, {
        vector: queryEmbedding,
        limit,
      });

      return results.map(result => ({
            id: result.id.toString(),
            text: result.payload?.text as string,
            metadata: result.payload,
}));
} catch (error) {
logger.error('Error searching vector DB:', error);
return [];
}
}
async deleteKnowledge(id: string) {
try {
await qdrantClient.delete(QDRANT_COLLECTION, {
points: [id],
});
logger.info(Knowledge deleted: ${id});
} catch (error) {
logger.error('Error deleting knowledge:', error);
}
}
}