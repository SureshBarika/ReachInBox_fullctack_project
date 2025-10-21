import { Request, Response } from 'express';
import { RAGService } from '../../services/ai/RAGService';
import { ElasticsearchService } from '../../services/elasticsearch/ElasticsearchService';
import { logger } from '../../utils/logger';

export class SuggestionController {
  private ragService: RAGService;
  private esService: ElasticsearchService;

  constructor() {
    this.ragService = new RAGService();
    this.esService = new ElasticsearchService();
  }

  async suggestReply(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Fetch the original email
      const email = await this.esService.getEmailById(id);
      
      if (!email) {
        return res.status(404).json({
          status: 'error',
          message: 'Email not found',
        });
      }

      // Generate suggested reply using RAG
      const originalEmailText = `Subject: ${email.subject}\n\nFrom: ${email.from}\n\n${email.body}`;
      const suggestedReply = await this.ragService.suggestReply(originalEmailText);

      res.json({
        status: 'success',
        data: {
          emailId: id,
          suggestedReply,
        },
      });
    } catch (error) {
      logger.error('Error generating suggested reply:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate suggested reply',
      });
    }
  }
}