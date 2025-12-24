/**
 * Product Embedding Generation System using RuVector
 */

import { execSync } from 'child_process';
import * as crypto from 'crypto';
import { Product } from '../types/index.js';
import {
  ProductVector,
  EmbeddingConfig,
  SearchResult,
  BatchEmbeddingResult,
  EmbeddingStats,
  ProductEmbeddingInput
} from './types.js';

/**
 * Default configuration for embedding generation
 */
const DEFAULT_CONFIG: Required<EmbeddingConfig> = {
  model: 'default',
  dimensions: 384,
  batchSize: 10,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  cacheEnabled: true
};

/**
 * Product Embedding Generator using RuVector CLI
 */
export class ProductEmbeddingGenerator {
  private config: Required<EmbeddingConfig>;
  private cache: Map<string, number[]>;
  private stats: EmbeddingStats;

  constructor(config: EmbeddingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.stats = {
      totalGenerated: 0,
      totalCached: 0,
      totalFailed: 0,
      averageTime: 0,
      cacheHitRate: 0,
      vectorDimensions: this.config.dimensions
    };
  }

  /**
   * Generate embedding for a single product
   */
  async generateProductEmbedding(product: Product): Promise<ProductVector> {
    const startTime = Date.now();

    try {
      // Create text representation of product
      const text = this.productToText(product);

      // Generate embedding
      const vector = await this.generateEmbedding(text);

      // Create product vector with metadata
      const productVector: ProductVector = {
        id: this.generateVectorId(product.id),
        vector,
        metadata: {
          productId: product.id,
          title: product.title,
          description: product.description,
          category: product.category,
          brand: product.brand,
          price: product.price,
          currency: product.currency,
          timestamp: new Date(),
          source: 'ruvector'
        }
      };

      // Update stats
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime, false, true);

      return productVector;
    } catch (error) {
      this.stats.totalFailed++;
      throw new Error(`Failed to generate embedding for product ${product.id}: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple products in batches
   */
  async batchGenerateEmbeddings(products: Product[]): Promise<BatchEmbeddingResult[]> {
    const results: BatchEmbeddingResult[] = [];
    const totalProducts = products.length;

    console.log(`Starting batch embedding generation for ${totalProducts} products...`);

    // Process in batches
    for (let i = 0; i < totalProducts; i += this.config.batchSize) {
      const batch = products.slice(i, i + this.config.batchSize);
      const batchNum = Math.floor(i / this.config.batchSize) + 1;
      const totalBatches = Math.ceil(totalProducts / this.config.batchSize);

      console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} products)...`);

      // Process batch concurrently
      const batchPromises = batch.map(async (product) => {
        const startTime = Date.now();

        try {
          const text = this.productToText(product);
          const cacheKey = this.getCacheKey(text);

          // Check cache
          let vector: number[];
          let cached = false;

          if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
            vector = this.cache.get(cacheKey)!;
            cached = true;
            this.stats.totalCached++;
          } else {
            vector = await this.generateEmbedding(text);
            if (this.config.cacheEnabled) {
              this.cache.set(cacheKey, vector);
            }
            this.stats.totalGenerated++;
          }

          const processingTime = Date.now() - startTime;

          return {
            productId: product.id,
            success: true,
            vector,
            cached,
            processingTime
          } as BatchEmbeddingResult;
        } catch (error) {
          this.stats.totalFailed++;
          return {
            productId: product.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            processingTime: Date.now() - startTime
          } as BatchEmbeddingResult;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid overwhelming the system
      if (i + this.config.batchSize < totalProducts) {
        await this.sleep(100);
      }
    }

    // Update final stats
    this.updateCacheHitRate();

    console.log(`Batch processing complete: ${results.filter(r => r.success).length}/${totalProducts} successful`);

    return results;
  }

  /**
   * Generate embedding from text using ruvector CLI
   */
  async generateEmbedding(text: string, attempt = 1): Promise<number[]> {
    try {
      // Escape text for shell command
      const escapedText = text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .trim();

      // Call ruvector embed command
      const command = `npx ruvector embed "${escapedText}"`;

      const output = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: this.config.timeout,
        stdio: ['pipe', 'pipe', 'pipe'] // Suppress stderr
      });

      // Parse the output
      const vector = this.parseEmbeddingOutput(output);

      if (!vector || vector.length === 0) {
        throw new Error('Invalid embedding output: empty vector');
      }

      return vector;
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        // Wait before retrying with exponential backoff
        await this.sleep(this.config.retryDelay * attempt);
        return this.generateEmbedding(text, attempt + 1);
      }

      throw new Error(`Failed to generate embedding after ${this.config.maxRetries} attempts: ${error}`);
    }
  }

  /**
   * Convert product to text representation for embedding
   */
  private productToText(product: Product | ProductEmbeddingInput): string {
    const parts: string[] = [];

    // Add title
    if (product.title) {
      parts.push(product.title);
    }

    // Add description
    if (product.description) {
      parts.push(product.description);
    }

    // Add category
    if (product.category) {
      parts.push(`Category: ${product.category}`);
    }

    // Add brand
    if (product.brand) {
      parts.push(`Brand: ${product.brand}`);
    }

    // Add tags if available
    if ('tags' in product && product.tags && product.tags.length > 0) {
      parts.push(`Tags: ${product.tags.join(', ')}`);
    }

    // Add specifications if available
    if ('specifications' in product && product.specifications) {
      const specs = Object.entries(product.specifications)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (specs) {
        parts.push(`Specifications: ${specs}`);
      }
    }

    return parts.join('. ');
  }

  /**
   * Parse embedding output from ruvector CLI
   */
  private parseEmbeddingOutput(output: string): number[] {
    try {
      const trimmed = output.trim();

      // Try to parse as JSON array
      if (trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      }

      // Try to parse as JSON object with vector/embedding field
      if (trimmed.startsWith('{')) {
        const obj = JSON.parse(trimmed);
        if (obj.vector) {
          return obj.vector;
        }
        if (obj.embedding) {
          return obj.embedding;
        }
      }

      // Try to parse as space or comma separated numbers
      const numbers = trimmed
        .split(/[\s,]+/)
        .map(s => parseFloat(s))
        .filter(n => !isNaN(n));

      if (numbers.length > 0) {
        return numbers;
      }

      throw new Error('Could not parse embedding output format');
    } catch (error) {
      throw new Error(`Failed to parse embedding output: ${error}`);
    }
  }

  /**
   * Generate cache key from text
   */
  private getCacheKey(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generate unique vector ID
   */
  private generateVectorId(productId: string): string {
    return `vec_${productId}_${Date.now()}`;
  }

  /**
   * Update statistics
   */
  private updateStats(processingTime: number, cached: boolean, success: boolean): void {
    if (success) {
      if (cached) {
        this.stats.totalCached++;
      } else {
        this.stats.totalGenerated++;
      }

      // Update average time
      const total = this.stats.totalGenerated + this.stats.totalCached;
      this.stats.averageTime = (this.stats.averageTime * (total - 1) + processingTime) / total;
    }

    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const total = this.stats.totalGenerated + this.stats.totalCached;
    this.stats.cacheHitRate = total > 0 ? this.stats.totalCached / total : 0;
  }

  /**
   * Get embedding statistics
   */
  getStats(): EmbeddingStats {
    return { ...this.stats };
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Embedding cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Export a default instance for convenience
 */
export const defaultEmbeddingGenerator = new ProductEmbeddingGenerator();

/**
 * Helper function to generate embedding for a product
 */
export async function embedProduct(product: Product): Promise<ProductVector> {
  return defaultEmbeddingGenerator.generateProductEmbedding(product);
}

/**
 * Helper function to batch generate embeddings
 */
export async function embedProducts(products: Product[]): Promise<BatchEmbeddingResult[]> {
  return defaultEmbeddingGenerator.batchGenerateEmbeddings(products);
}
