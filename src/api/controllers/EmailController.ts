import { Request, Response } from 'express';
import { ElasticsearchService } from '../../services/elasticsearch/ElasticsearchService';
import { logger } from '../../utils/logger';

export class EmailController {
  private esService: ElasticsearchService;

  constructor() {
    this.esService = new ElasticsearchService();
  }

  async getEmails(req: Request, res: Response) {
    try {
      const { from = 0, size = 20, accountId, folder } = req.query;

      const result = await this.esService.searchEmails({
        accountId: accountId as string,
        folder: folder as string,
        from: parseInt(from as string),
        size: parseInt(size as string),
      });

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error fetching emails:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch emails',
      });
    }
  }

  async searchEmails(req: Request, res: Response) {
    try {
      const { q, accountId, folder, category, from = 0, size = 20 } = req.query;

      const result = await this.esService.searchEmails({
        query: q as string,
        accountId: accountId as string,
        folder: folder as string,
        category: category as string,
        from: parseInt(from as string),
        size: parseInt(size as string),
      });

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error searching emails:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to search emails',
      });
    }
  }

  async getEmailById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const email = await this.esService.getEmailById(id);

      if (!email) {
        return res.status(404).json({
          status: 'error',
          message: 'Email not found',
        });
      }

      res.json({
        status: 'success',
        data: email,
      });
    } catch (error) {
      logger.error('Error fetching email:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch email',
      });
    }
  }
}