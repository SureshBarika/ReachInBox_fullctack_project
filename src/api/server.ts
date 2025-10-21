import express from 'express';
import cors from 'cors';
import accountRoutes from './routes/accounts';
import emailRoutes from './routes/emails';
import suggestionRoutes from './routes/suggestions';
import { errorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

export class ApiServer {
  private app: express.Application;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Serve static files for frontend
    this.app.use(express.static('frontend'));
  }

  private setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    this.app.use('/api/accounts', accountRoutes);
    this.app.use('/api/emails', emailRoutes);
    this.app.use('/api/emails', suggestionRoutes);
  }

  private setupErrorHandling() {
    this.app.use(errorHandler);
  }

  public start() {
    this.app.listen(this.port, () => {
      logger.info(`API Server running on port ${this.port}`);
    });
  }

  public getApp() {
    return this.app;
  }
}