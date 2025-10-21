import { genAI, CATEGORIZATION_MODEL } from '../../config/gemini';
import { logger } from '../../utils/logger';
import { retryWithExponentialBackoff } from '../../utils/retry';

export type EmailCategory = 'Interested' | 'Meeting Booked' | 'Not Interested' | 'Spam' | 'Out of Office';

export class CategorizationService {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({
      model: CATEGORIZATION_MODEL,
      systemInstruction: `You are an expert email classifier. Analyze emails and categorize them into EXACTLY ONE of these categories:
- Interested: The sender shows genuine interest in the product/service
- Meeting Booked: The email confirms or schedules a meeting
- Not Interested: The sender declines or shows no interest
- Spam: Promotional, irrelevant, or unsolicited content
- Out of Office: Automatic out-of-office replies

Respond ONLY with valid JSON.`,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['Interested', 'Meeting Booked', 'Not Interested', 'Spam', 'Out of Office'],
            },
          },
          required: ['category'],
        },
      },
    });
  }

  async categorizeEmail(subject: string, body: string): Promise<EmailCategory> {
    try {
      const result = await retryWithExponentialBackoff(async () => {
        const prompt = `Subject: ${subject}\n\nBody: ${body.substring(0, 1000)}`;
        const response = await this.model.generateContent(prompt);
        const text = response.response.text();
        const parsed = JSON.parse(text);
        return parsed.category as EmailCategory;
      });

      logger.info(`Email categorized as: ${result}`);
      return result;
    } catch (error) {
      logger.error('Error categorizing email:', error);
      return 'Not Interested';
    }
  }
}