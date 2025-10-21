import { genAI, EMBEDDING_MODEL } from '../../config/gemini';
import { logger } from '../../utils/logger';

export class EmbeddingService {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }
}