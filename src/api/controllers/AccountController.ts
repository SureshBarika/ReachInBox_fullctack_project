import { Request, Response } from 'express';
import { getEmailAccounts } from '../../config/imap';
import { logger } from '../../utils/logger';

export class AccountController {
  async getAccounts(req: Request, res: Response) {
    try {
      const accounts = getEmailAccounts();
      
      // Return sanitized account info (no passwords)
      const sanitizedAccounts = accounts.map(account => ({
        id: account.id,
        email: account.email,
        host: account.host,
      }));

      res.json({
        status: 'success',
        data: sanitizedAccounts,
      });
    } catch (error) {
      logger.error('Error fetching accounts:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch accounts',
      });
    }
  }
}