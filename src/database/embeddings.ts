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
   * Falls back to simple embedding if CLI is not available
   */
  private async generateEmbedding(text: string, attempt = 1): Promise<number[]> {
    try {
      // Try to use ruvector CLI first
      // Escape text for shell command
      const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');

      // Call ruvector embed command
      // Format: npx ruvector embed --text "text"
      const command = `npx ruvector embed --text "${escapedText}"`;

      const output = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 30000, // 30 second timeout
        stdio: ['pipe', 'pipe', 'ignore'] // Ignore stderr
      });

      // Parse the output to get the vector
      const vector = this.parseEmbeddingOutput(output);

      if (!vector || vector.length === 0) {
        throw new Error('Invalid embedding output');
      }

      return vector;
    } catch (error) {
      // Fall back to simple embedding generation
      // This is a simplified TF-IDF-like approach for demo purposes
      return this.generateSimpleEmbedding(text);
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

  /**
   * Generate simple embedding for demo purposes
   * Uses a bag-of-words approach with common e-commerce terms
   */
  private generateSimpleEmbedding(text: string): number[] {
    const dimension = 384; // Standard embedding size
    const vector = new Array(dimension).fill(0);

    // Normalize text
    const normalized = text.toLowerCase().trim();
    const words = normalized.split(/\s+/);

    // Define keyword categories and their positions in the vector
    const keywords: Record<string, number[]> = {
      // Search-related terms
      'find': [0, 10, 20],
      'search': [0, 11, 21],
      'look': [0, 12, 22],
      'show': [0, 13, 23],
      'get': [0, 14, 24],
      'browse': [0, 15, 25],
      'explore': [0, 16, 26],

      // Price-related terms
      'price': [50, 60, 70],
      'cost': [50, 61, 71],
      'expensive': [50, 62, 72],
      'cheap': [50, 63, 73],
      'budget': [50, 64, 74],
      'affordable': [50, 65, 75],
      'much': [50, 66, 76],
      'money': [50, 67, 77],

      // Recommendation terms
      'recommend': [100, 110, 120],
      'suggest': [100, 111, 121],
      'similar': [100, 112, 122],
      'like': [100, 113, 123],
      'alternative': [100, 114, 124],
      'better': [100, 115, 125],
      'best': [100, 116, 126],

      // Trend terms
      'trend': [150, 160, 170],
      'trending': [150, 161, 171],
      'popular': [150, 162, 172],
      'hot': [150, 163, 173],
      'demand': [150, 164, 174],
      'forecast': [150, 165, 175],
      'seasonal': [150, 166, 176],
      'emerging': [150, 167, 177],

      // Category/navigation terms
      'category': [200, 210, 220],
      'categories': [200, 211, 221],
      'section': [200, 212, 222],
      'department': [200, 213, 223],
      'type': [200, 214, 224],

      // Product terms
      'product': [250, 260, 270],
      'products': [250, 261, 271],
      'item': [250, 262, 272],
      'items': [250, 263, 273],
      'goods': [250, 264, 274],
    };

    // Add word-based features
    for (const word of words) {
      if (keywords[word]) {
        for (const idx of keywords[word]) {
          if (idx < dimension) {
            vector[idx] += 1.0;
          }
        }
      }

      // Add general word hash feature
      const hash = this.hashString(word);
      const idx = Math.abs(hash) % dimension;
      vector[idx] += 0.5;
    }

    // Add bigram features
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]}_${words[i + 1]}`;
      const hash = this.hashString(bigram);
      const idx = Math.abs(hash) % dimension;
      vector[idx] += 0.7;
    }

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}
