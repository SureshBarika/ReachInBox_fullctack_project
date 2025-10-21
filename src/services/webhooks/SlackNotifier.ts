import { logger } from '../../utils/logger';
import { EmailDocument } from '../../models/Email';

export class SlackNotifier {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
  }

  async notifyInterestedLead(email: EmailDocument) {
    if (!this.webhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return;
    }

    try {
      const payload = {
        text: '🎯 New Interested Lead Detected!',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🎯 New Interested Lead',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*From:*\n${email.from}`,
              },
              {
                type: 'mrkdwn',
                text: `*Subject:*\n${email.subject}`,
              },
              {
                type: 'mrkdwn',
                text: `*Date:*\n${new Date(email.date).toLocaleString()}`,
              },
              {
                type: 'mrkdwn',
                text: `*Account:*\n${email.accountId}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Preview:*\n${email.body.substring(0, 200)}...`,
            },
          },
        ],
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        logger.info('Slack notification sent successfully');
      } else {
        logger.error(`Slack notification failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Error sending Slack notification:', error);
    }
  }
}