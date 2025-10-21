import { logger } from '../../utils/logger';
import { EmailDocument } from '../../models/Email';

export class WebhookTrigger {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.GENERIC_WEBHOOK_URL || '';
  }

  async triggerInterestedEvent(email: EmailDocument) {
    if (!this.webhookUrl) {
      logger.warn('Generic webhook URL not configured');
      return;
    }

    try {
      const payload = {
        event: 'InterestedLead',
        timestamp: new Date().toISOString(),
        data: {
          emailId: email.id,
          from: email.from,
          to: email.to,
          subject: email.subject,
          body: email.body,
          date: email.date,
          accountId: email.accountId,
          category: email.aiCategory,
        },
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        logger.info('Generic webhook triggered successfully');
      } else {
        logger.error(`Webhook trigger failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Error triggering webhook:', error);
    }
  }
}