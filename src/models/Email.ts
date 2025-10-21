export interface EmailDocument {
  id: string;              // Unique message ID
  accountId: string;       // Email account identifier
  folder: string;          // INBOX, Sent, etc.
  subject: string;
  body: string;            // Plain text content
  from: string;
  to: string[];
  cc?: string[];
  date: Date;
  aiCategory: 'Interested' | 'Meeting Booked' | 'Not Interested' | 'Spam' | 'Out of Office' | 'Uncategorized';
  indexedAt: Date;
  hasAttachments?: boolean;
  flags?: string[];
}

export interface EmailSearchQuery {
  query?: string;
  accountId?: string;
  folder?: string;
  category?: string;
  from?: number;
  size?: number;
}