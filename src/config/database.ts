import { Client } from '@elastic/elasticsearch';
import { QdrantClient } from '@qdrant/js-client-rest';

export const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
});

export const ELASTICSEARCH_INDEX = 'emails';
export const QDRANT_COLLECTION = 'product_knowledge';