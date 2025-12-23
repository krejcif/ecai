/**
 * Embedding service using ruvector CLI
 */

import { execSync, spawn } from 'child_process';
import * as crypto from 'crypto';

export interface EmbeddingOptions {
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
}

export interface EmbeddingResult {
  text: string;
  vector: number[];
  cached: boolean;
}

export class EmbeddingService {
  private cache: Map<string, number[]>;
  private options: Required<EmbeddingOptions>;

  constructor(options: EmbeddingOptions = {}) {
    this.cache = new Map();
    this.options = {
      model: options.model || 'default',
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      batchSize: options.batchSize ?? 100
    };
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    const cacheKey = this.getCacheKey(text);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate embedding via ruvector CLI
    const vector = await this.generateEmbedding(text);

    // Cache the result
    this.cache.set(cacheKey, vector);

    return vector;
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.options.batchSize) {
      const batch = texts.slice(i, i + this.options.batchSize);
      const batchResults = await Promise.all(
        batch.map(async (text) => {
          const cacheKey = this.getCacheKey(text);
          const cached = this.cache.get(cacheKey);

          if (cached) {
            return { text, vector: cached, cached: true };
          }

          const vector = await this.generateEmbedding(text);
          this.cache.set(cacheKey, vector);

          return { text, vector, cached: false };
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Generate embedding for product
   */
  async embedProduct(product: { name: string; description: string; category: string }): Promise<number[]> {
    const text = `${product.name}. ${product.description}. Category: ${product.category}`;
    return this.embed(text);
  }

  /**
   * Generate embedding for review
   */
  async embedReview(review: { text: string; rating?: number }): Promise<number[]> {
    const text = review.rating
      ? `${review.text} (Rating: ${review.rating}/5)`
      : review.text;
    return this.embed(text);
  }

  /**
   * Generate embedding for supplier
   */
  async embedSupplier(supplier: { name: string; location: string; description?: string }): Promise<number[]> {
    const text = `${supplier.name}. Location: ${supplier.location}. ${supplier.description || ''}`;
    return this.embed(text);
  }

  /**
   * Generate embedding for trend
   */
  async embedTrend(trend: { keyword: string; category?: string }): Promise<number[]> {
    const text = trend.category
      ? `${trend.keyword} in ${trend.category}`
      : trend.keyword;
    return this.embed(text);
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would need to track hits/misses for accurate hit rate
    };
  }

  /**
   * Generate cache key from text
   */
  private getCacheKey(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generate embedding using ruvector CLI with retry logic
   */
  private async generateEmbedding(text: string, attempt = 1): Promise<number[]> {
    try {
      // Escape text for shell command
      const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');

      // Call ruvector embed command
      // Format: npx ruvector embed "text"
      const command = `npx ruvector embed "${escapedText}"`;

      const output = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 30000 // 30 second timeout
      });

      // Parse the output to get the vector
      const vector = this.parseEmbeddingOutput(output);

      if (!vector || vector.length === 0) {
        throw new Error('Invalid embedding output');
      }

      return vector;
    } catch (error) {
      if (attempt < this.options.maxRetries) {
        // Wait before retrying
        await this.sleep(this.options.retryDelay * attempt);
        return this.generateEmbedding(text, attempt + 1);
      }

      throw new Error(`Failed to generate embedding after ${this.options.maxRetries} attempts: ${error}`);
    }
  }

  /**
   * Parse embedding output from ruvector CLI
   */
  private parseEmbeddingOutput(output: string): number[] {
    try {
      // Try to parse as JSON array
      const trimmed = output.trim();

      // Check if output is JSON array
      if (trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      }

      // Check if output is JSON object with vector field
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

      throw new Error('Could not parse embedding output');
    } catch (error) {
      throw new Error(`Failed to parse embedding output: ${error}`);
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
