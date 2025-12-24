/**
 * RuVector Types for Product Embedding System
 */

/**
 * Product vector with metadata
 */
export interface ProductVector {
  id: string;
  vector: number[];
  metadata: {
    productId: string;
    title: string;
    description: string;
    category?: string;
    brand?: string;
    price?: number;
    currency?: string;
    timestamp: Date;
    source?: string;
  };
}

/**
 * Configuration for embedding generation
 */
export interface EmbeddingConfig {
  model?: string;
  dimensions?: number;
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  cacheEnabled?: boolean;
}

/**
 * Search result from vector similarity search
 */
export interface SearchResult {
  id: string;
  score: number;
  vector: number[];
  metadata: {
    productId: string;
    title: string;
    description: string;
    category?: string;
    brand?: string;
    price?: number;
    currency?: string;
    [key: string]: any;
  };
  distance?: number;
  similarity?: number;
}

/**
 * Batch embedding result
 */
export interface BatchEmbeddingResult {
  productId: string;
  success: boolean;
  vector?: number[];
  error?: string;
  cached?: boolean;
  processingTime?: number;
}

/**
 * Embedding statistics
 */
export interface EmbeddingStats {
  totalGenerated: number;
  totalCached: number;
  totalFailed: number;
  averageTime: number;
  cacheHitRate: number;
  vectorDimensions: number;
}

/**
 * Vector search options
 */
export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
  includeVectors?: boolean;
  filters?: Record<string, any>;
}

/**
 * Product embedding input
 */
export interface ProductEmbeddingInput {
  id: string;
  title: string;
  description: string;
  category?: string;
  brand?: string;
  price?: number;
  currency?: string;
  tags?: string[];
  specifications?: Record<string, string>;
}
