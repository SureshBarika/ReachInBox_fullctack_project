import { simpleParser, ParsedMail } from 'mailparser';
import { EmailDocument } from '../../models/Email';
import { v4 as uuidv4 } from 'uuid';

export class EmailParser {
  async parseEmail(
    rawEmail: Buffer,
    accountId: string,
    folder: string
  ): Promise<EmailDocument> {
    const parsed: ParsedMail = await simpleParser(rawEmail);

    return {
      id: parsed.messageId || uuidv4(),
      accountId,
      folder,
      subject: parsed.subject || '(No Subject)',
      body: parsed.text || '',
      from: parsed.from?.text || '',
      to: parsed.to?.value.map(addr => addr.address || '') || [],
      cc: parsed.cc?.value.map(addr => addr.address || ''),
      date: parsed.date || new Date(),
      aiCategory: 'Uncategorized',
      indexedAt: new Date(),
      hasAttachments: (parsed.attachments?.length || 0) > 0,
      flags: [],
    };
  }
}