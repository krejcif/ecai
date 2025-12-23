/**
 * Vector Database Integration Layer
 *
 * Provides vector database operations using ruvector for EcommerceIQ
 */

// Export VectorStore
import { VectorStore, VectorStoreConfig, InsertOptions, SearchOptions, SearchResult } from './vector-store.js';
export { VectorStore };
export type { VectorStoreConfig, InsertOptions, SearchOptions, SearchResult };

// Export EmbeddingService
import { EmbeddingService, EmbeddingOptions, EmbeddingResult } from './embeddings.js';
export { EmbeddingService };
export type { EmbeddingOptions, EmbeddingResult };

// Export Collections
import { CollectionName, COLLECTION_CONFIGS, BaseDocument, ProductDocument, ReviewDocument, SupplierDocument, TrendDocument, CollectionDocument, CollectionConfig } from './collections.js';
export { CollectionName, COLLECTION_CONFIGS };
export type { BaseDocument, ProductDocument, ReviewDocument, SupplierDocument, TrendDocument, CollectionDocument, CollectionConfig };

/**
 * Create a configured instance of VectorStore and EmbeddingService
 */
export function createVectorDatabase(config?: {
  dataPath?: string;
  maxRetries?: number;
  retryDelay?: number;
  embeddingModel?: string;
}) {
  const vectorStore = new VectorStore({
    dataPath: config?.dataPath,
    maxRetries: config?.maxRetries,
    retryDelay: config?.retryDelay
  });

  const embeddingService = new EmbeddingService({
    model: config?.embeddingModel,
    maxRetries: config?.maxRetries,
    retryDelay: config?.retryDelay
  });

  return {
    vectorStore,
    embeddingService
  };
}
