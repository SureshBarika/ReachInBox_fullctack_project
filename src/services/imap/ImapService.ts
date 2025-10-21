import { ImapService } from './ImapService';
import { EmailAccount } from '../../models/Account';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';

export class ConnectionManager extends EventEmitter {
  private connections: Map<string, ImapService> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000; // 5 seconds
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Initialize connections for multiple email accounts
   */
  public async initializeAccounts(accounts: EmailAccount[]): Promise<void> {
    logger.info(`Initializing ${accounts.length} email account(s)...`);

    for (const account of accounts) {
      await this.addAccount(account);
    }

    // Start health check monitor
    this.startHealthCheck();
    
    logger.info('All IMAP connections initialized');
  }

  /**
   * Add a new email account and establish connection
   */
  public async addAccount(account: EmailAccount): Promise<void> {
    if (this.connections.has(account.id)) {
      logger.warn(`Connection already exists for account: ${account.email}`);
      return;
    }

    try {
      const imapService = new ImapService(account);

      // Set up event listeners
      this.setupConnectionEventListeners(imapService, account);

      // Store connection
      this.connections.set(account.id, imapService);
      this.reconnectAttempts.set(account.id, 0);

      // Connect to IMAP server
      imapService.connect();

      logger.info(`Added and connecting to account: ${account.email}`);
    } catch (error) {
      logger.error(`Failed to add account ${account.email}:`, error);
      throw error;
    }
  }

  /**
   * Set up event listeners for an IMAP connection
   */
  private setupConnectionEventListeners(
    imapService: ImapService,
    account: EmailAccount
  ): void {
    // Forward newEmail events to manager
    imapService.on('newEmail', (email) => {
      this.emit('newEmail', email);
    });

    // Handle connection ready
    imapService.on('ready', () => {
      logger.info(`✓ Connection ready: ${account.email}`);
      this.reconnectAttempts.set(account.id, 0); // Reset attempts on success
      this.emit('connectionReady', account.id);
    });

    // Handle connection errors
    imapService.on('error', (error) => {
      logger.error(`Connection error for ${account.email}:`, error);
      this.handleConnectionError(account, error);
    });

    // Handle connection end
    imapService.on('end', () => {
      logger.warn(`Connection ended for ${account.email}`);
      this.handleConnectionEnd(account);
    });

    // Handle connection timeout
    imapService.on('timeout', () => {
      logger.warn(`Connection timeout for ${account.email}`);
      this.handleConnectionTimeout(account);
    });
  }

  /**
   * Handle connection errors with exponential backoff retry
   */
  private handleConnectionError(account: EmailAccount, error: Error): void {
    const attempts = this.reconnectAttempts.get(account.id) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      logger.error(
        `Max reconnection attempts reached for ${account.email}. Giving up.`
      );
      this.emit('connectionFailed', account.id, error);
      return;
    }

    // Exponential backoff: 5s, 10s, 20s, 40s, 80s
    const delay = this.reconnectDelay * Math.pow(2, attempts);
    this.reconnectAttempts.set(account.id, attempts + 1);

    logger.info(
      `Scheduling reconnection attempt ${attempts + 1}/${this.maxReconnectAttempts} ` +
      `for ${account.email} in ${delay}ms`
    );

    setTimeout(() => {
      this.reconnectAccount(account.id);
    }, delay);
  }

  /**
   * Handle normal connection end
   */
  private handleConnectionEnd(account: EmailAccount): void {
    logger.info(`Attempting to reconnect ${account.email}...`);
    
    setTimeout(() => {
      this.reconnectAccount(account.id);
    }, this.reconnectDelay);
  }

  /**
   * Handle connection timeout
   */
  private handleConnectionTimeout(account: EmailAccount): void {
    logger.warn(`Connection timed out for ${account.email}. Reconnecting...`);
    
    const connection = this.connections.get(account.id);
    if (connection) {
      connection.disconnect();
    }

    setTimeout(() => {
      this.reconnectAccount(account.id);
    }, this.reconnectDelay);
  }

  /**
   * Reconnect a specific account
   */
  private reconnectAccount(accountId: string): void {
    const connection = this.connections.get(accountId);
    
    if (!connection) {
      logger.error(`Cannot reconnect: No connection found for ${accountId}`);
      return;
    }

    try {
      logger.info(`Reconnecting account: ${accountId}`);
      connection.connect();
    } catch (error) {
      logger.error(`Failed to reconnect ${accountId}:`, error);
    }
  }

  /**
   * Remove an account connection
   */
  public removeAccount(accountId: string): void {
    const connection = this.connections.get(accountId);
    
    if (connection) {
      connection.disconnect();
      this.connections.delete(accountId);
      this.reconnectAttempts.delete(accountId);
      logger.info(`Removed account connection: ${accountId}`);
    }
  }

  /**
   * Get connection status for an account
   */
  public getConnectionStatus(accountId: string): string {
    const connection = this.connections.get(accountId);
    
    if (!connection) {
      return 'not_found';
    }

    return connection.isConnected() ? 'connected' : 'disconnected';
  }

  /**
   * Get all connection statuses
   */
  public getAllConnectionStatuses(): Map<string, string> {
    const statuses = new Map<string, string>();
    
    for (const [accountId, connection] of this.connections) {
      statuses.set(accountId, connection.isConnected() ? 'connected' : 'disconnected');
    }
    
    return statuses;
  }

  /**
   * Start periodic health check for all connections
   */
  private startHealthCheck(): void {
    // Check every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);

    logger.info('Health check monitor started (5 minute interval)');
  }

  /**
   * Perform health check on all connections
   */
  private performHealthCheck(): void {
    logger.info('Performing connection health check...');

    for (const [accountId, connection] of this.connections) {
      if (!connection.isConnected()) {
        logger.warn(`Health check failed for ${accountId}. Reconnecting...`);
        this.reconnectAccount(accountId);
      } else {
        logger.debug(`Health check passed for ${accountId}`);
      }
    }
  }

  /**
   * Stop health check monitor
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health check monitor stopped');
    }
  }

  /**
   * Disconnect all accounts and cleanup
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down Connection Manager...');

    // Stop health check
    this.stopHealthCheck();

    // Disconnect all connections
    for (const [accountId, connection] of this.connections) {
      try {
        connection.disconnect();
        logger.info(`Disconnected: ${accountId}`);
      } catch (error) {
        logger.error(`Error disconnecting ${accountId}:`, error);
      }
    }

    // Clear all data structures
    this.connections.clear();
    this.reconnectAttempts.clear();

    logger.info('Connection Manager shutdown complete');
  }

  /**
   * Get total number of active connections
   */
  public getActiveConnectionCount(): number {
    let count = 0;
    
    for (const connection of this.connections.values()) {
      if (connection.isConnected()) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Get all account IDs
   */
  public getAccountIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Force reconnect all connections
   */
  public reconnectAll(): void {
    logger.info('Force reconnecting all accounts...');
    
    for (const accountId of this.connections.keys()) {
      this.reconnectAccount(accountId);
    }
  }

  /**
   * Get connection statistics
   */
  public getStatistics(): {
    totalAccounts: number;
    activeConnections: number;
    failedConnections: number;
    reconnectAttempts: Map<string, number>;
  } {
    const totalAccounts = this.connections.size;
    const activeConnections = this.getActiveConnectionCount();
    const failedConnections = totalAccounts - activeConnections;

    return {
      totalAccounts,
      activeConnections,
      failedConnections,
      reconnectAttempts: new Map(this.reconnectAttempts),
    };
  }
}