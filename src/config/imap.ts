import { EmailAccount } from '../models/Account';

export const getEmailAccounts = (): EmailAccount[] => {
  const accounts: EmailAccount[] = [];

  // Account 1
  if (process.env.IMAP_USER_1 && process.env.IMAP_PASS_1) {
    accounts.push({
      id: 'account-1',
      email: process.env.IMAP_USER_1,
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT || '993'),
      user: process.env.IMAP_USER_1,
      password: process.env.IMAP_PASS_1,
      tls: true,
    });
  }

  // Account 2
  if (process.env.IMAP_USER_2 && process.env.IMAP_PASS_2) {
    accounts.push({
      id: 'account-2',
      email: process.env.IMAP_USER_2,
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT || '993'),
      user: process.env.IMAP_USER_2,
      password: process.env.IMAP_PASS_2,
      tls: true,
    });
  }

  return accounts;
};