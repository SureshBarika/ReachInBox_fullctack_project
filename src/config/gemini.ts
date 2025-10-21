import { GoogleGenerativeAI } from '@google/generative-ai';

export const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ''
);

export const CATEGORIZATION_MODEL = 'gemini-1.5-flash';
export const EMBEDDING_MODEL = 'text-embedding-004';
export const RAG_MODEL = 'gemini-1.5-pro';