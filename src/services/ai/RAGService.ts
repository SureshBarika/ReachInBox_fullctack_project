import { genAI, RAG_MODEL } from '../../config/gemini';
import { QdrantService } from '../vector/QdrantService';
import { EmbeddingService } from './EmbeddingService';
import { logger } from '../../utils/logger';

export class RAGService {
  private model;
  private vectorService: QdrantService;
  private embeddingService: EmbeddingService;

  constructor() {
    this.model = genAI.getGenerativeModel({
      model: RAG_MODEL,
      systemInstruction: `You are a helpful email assistant. Draft professional, concise email replies based ONLY on the context provided and the original email. Be polite, relevant, and actionable.`,
    });
    this.vectorService = new QdrantService();
    this.embeddingService = new EmbeddingService();
  }

  async suggestReply(originalEmail: string): Promise<string> {
    try {
      // Step 1: Generate embedding for the original email
      logger.info('Generating query embedding...');
      const queryEmbedding = await this.embeddingService.generateEmbedding(originalEmail);

      // Step 2: Retrieve relevant context from vector DB
      logger.info('Searching vector database...');
      const relevantContext = await this.vectorService.search(queryEmbedding, 3);

      // Step 3: Assemble prompt with context
      const contextText = relevantContext.map(item => item.text).join('\n\n');
      
      const prompt = `Context (Product/Company Information):
${contextText}

Original Email:
${originalEmail}

Based ONLY on the context provided above and the original email, draft a professional and helpful reply. Be concise and relevant.`;

      // Step 4: Generate reply
      logger.info('Generating reply...');
      const result = await this.model.generateContent(prompt);
      const reply = result.response.text();

      logger.info('Reply generated successfully');
      return reply;
    } catch (error) {
      logger.error('Error in RAG pipeline:', error);
      throw error;
    }
  }
}