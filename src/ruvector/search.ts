/**
 * Semantic Search Engine using ruvector CLI
 * Provides advanced search capabilities for products using vector embeddings
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EmbeddingService } from '../database/embeddings';
import { ProductDocument } from '../database/collections';

export interface SearchOptions {
  limit?: number;
  scoreThreshold?: number;
  metric?: 'cosine' | 'euclidean' | 'dot';
}

export interface HybridSearchOptions extends SearchOptions {
  filters?: {
    category?: string;
    priceMin?: number;
    priceMax?: number;
    source?: string;
    [key: string]: any;
  };
  weights?: {
    semantic: number;
    filter: number;
  };
}

export interface SearchResult<T = ProductDocument> {
  id: string;
  score: number;
  document: T;
  matchType?: 'semantic' | 'hybrid' | 'similar';
}

export class SemanticSearchEngine {
  private embeddingService: EmbeddingService;
  private dataPath: string;
  private collectionName: string;

  constructor(options: {
    dataPath?: string;
    collectionName?: string;
  } = {}) {
    this.dataPath = options.dataPath || '/home/user/ecai/data';
    this.collectionName = options.collectionName || 'products';
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Search products using natural language query
   * Uses npx ruvector search command
   */
  async searchProducts(
    query: string,
    limit: number = 10
  ): Promise<SearchResult<ProductDocument>[]> {
    try {
      // Step 1: Convert query text to vector using ruvector embed
      const escapedQuery = query.replace(/"/g, '\\"');
      const embedCommand = `npx ruvector embed --text "${escapedQuery}"`;

      console.log(`Generating embedding for query: "${query}"`);

      const embedOutput = execSync(embedCommand, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000
      });

      // Parse the embedding vector
      const queryVector = this.parseEmbeddingOutput(embedOutput);

      // Step 2: Search using the vector
      return await this.searchByVector(queryVector, limit);
    } catch (error: any) {
      const stderr = error.stderr?.toString() || '';
      const stdout = error.stdout?.toString() || '';
      throw new Error(
        `Failed to search products: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`
      );
    }
  }

  /**
   * Search using a pre-computed vector
   */
  async searchByVector(
    vector: number[],
    limit: number = 10
  ): Promise<SearchResult<ProductDocument>[]> {
    try {
      const collectionPath = this.getCollectionPath();

      // Convert vector to JSON string for CLI
      const vectorJson = JSON.stringify(vector);

      // Search using ruvector CLI
      // Format: npx ruvector search <collection> --vector '[...]' --top-k <limit>
      const command = `npx ruvector search "${collectionPath}" --vector '${vectorJson}' --top-k ${limit}`;

      console.log(`Executing vector search with ${vector.length}-dimensional vector`);

      const output = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: 60000
      });

      // Parse search results
      const results = this.parseSearchResults(output);

      return results.map(result => ({
        ...result,
        matchType: 'semantic' as const
      }));
    } catch (error: any) {
      const stderr = error.stderr?.toString() || '';
      const stdout = error.stdout?.toString() || '';
      throw new Error(
        `Failed to search by vector: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`
      );
    }
  }

  /**
   * Find similar products to a given product ID
   */
  async findSimilar(
    productId: string,
    limit: number = 10
  ): Promise<SearchResult<ProductDocument>[]> {
    try {
      const collectionPath = this.getCollectionPath();

      // First, get the product's vector from the collection
      const product = await this.getProductById(productId);

      if (!product || !product.vector) {
        throw new Error(`Product ${productId} not found or has no vector`);
      }

      // Search using the product's vector
      const results = await this.searchByVector(product.vector, limit + 1);

      // Filter out the original product from results
      const similarProducts = results.filter(result => result.id !== productId);

      return similarProducts.slice(0, limit).map(result => ({
        ...result,
        matchType: 'similar' as const
      }));
    } catch (error: any) {
      throw new Error(`Failed to find similar products: ${error.message}`);
    }
  }

  /**
   * Hybrid search combining semantic search with filters
   */
  async hybridSearch(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<SearchResult<ProductDocument>[]> {
    try {
      const limit = options.limit || 10;
      const filters = options.filters || {};
      const weights = options.weights || { semantic: 0.7, filter: 0.3 };

      // First, perform semantic search with a larger limit to have more candidates
      const searchLimit = Math.max(limit * 3, 50);
      const semanticResults = await this.searchProducts(query, searchLimit);

      // Apply filters and re-score
      let filteredResults = semanticResults;

      // Apply category filter
      if (filters.category) {
        filteredResults = filteredResults.filter(
          result => result.document.category === filters.category
        );
      }

      // Apply price range filters
      if (filters.priceMin !== undefined) {
        filteredResults = filteredResults.filter(
          result => result.document.price >= filters.priceMin!
        );
      }

      if (filters.priceMax !== undefined) {
        filteredResults = filteredResults.filter(
          result => result.document.price <= filters.priceMax!
        );
      }

      // Apply source filter
      if (filters.source) {
        filteredResults = filteredResults.filter(
          result => result.document.source === filters.source
        );
      }

      // Apply custom filters
      for (const [key, value] of Object.entries(filters)) {
        if (!['category', 'priceMin', 'priceMax', 'source'].includes(key)) {
          filteredResults = filteredResults.filter(result => {
            const doc = result.document as any;
            if (Array.isArray(value)) {
              return value.includes(doc[key]);
            }
            return doc[key] === value;
          });
        }
      }

      // Re-score based on hybrid weights
      const hybridResults = filteredResults.map(result => {
        // Calculate filter match score (0-1)
        let filterScore = 0;
        let filterCount = 0;

        if (filters.category && result.document.category === filters.category) {
          filterScore += 1;
          filterCount += 1;
        }

        if (filters.source && result.document.source === filters.source) {
          filterScore += 1;
          filterCount += 1;
        }

        const avgFilterScore = filterCount > 0 ? filterScore / filterCount : 0.5;

        // Combine scores using weights
        const hybridScore =
          result.score * weights.semantic + avgFilterScore * weights.filter;

        return {
          ...result,
          score: hybridScore,
          matchType: 'hybrid' as const
        };
      });

      // Sort by hybrid score and return top results
      hybridResults.sort((a, b) => b.score - a.score);

      // Apply score threshold if provided
      if (options.scoreThreshold) {
        return hybridResults
          .filter(result => result.score >= options.scoreThreshold!)
          .slice(0, limit);
      }

      return hybridResults.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to perform hybrid search: ${error.message}`);
    }
  }

  /**
   * Get a product by ID from the collection
   */
  private async getProductById(productId: string): Promise<ProductDocument | null> {
    try {
      const collectionPath = this.getCollectionPath();

      // Try to get product using ruvector CLI
      const command = `npx ruvector get "${collectionPath}" --id "${productId}"`;

      const output = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000
      });

      const result = JSON.parse(output.trim());

      if (result && result.id) {
        return {
          id: result.id,
          vector: result.vector,
          ...result.metadata
        } as ProductDocument;
      }

      return null;
    } catch (error) {
      console.warn(`Failed to get product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Get collection path
   */
  private getCollectionPath(): string {
    return path.join(this.dataPath, this.collectionName);
  }

  /**
   * Parse search results from CLI output
   */
  private parseSearchResults(output: string): SearchResult<ProductDocument>[] {
    try {
      const trimmed = output.trim();

      // Try to parse as JSON array
      let results: any[];

      if (trimmed.startsWith('[')) {
        results = JSON.parse(trimmed);
      } else if (trimmed.startsWith('{')) {
        const obj = JSON.parse(trimmed);
        results = obj.results || obj.matches || [obj];
      } else {
        // Try JSONL format
        results = trimmed
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      }

      // Transform to SearchResult format
      return results.map(result => ({
        id: result.id,
        score: result.score || result.distance || result.similarity || 0,
        document: {
          id: result.id,
          vector: result.vector,
          name: result.metadata?.name || result.name || '',
          description: result.metadata?.description || result.description || '',
          category: result.metadata?.category || result.category || '',
          price: result.metadata?.price || result.price || 0,
          source: result.metadata?.source || result.source || '',
          metadata: result.metadata || {}
        } as ProductDocument
      }));
    } catch (error) {
      console.warn(`Failed to parse search results: ${error}`);
      return [];
    }
  }

  /**
   * Parse embedding output from ruvector embed command
   */
  private parseEmbeddingOutput(output: string): number[] {
    try {
      const trimmed = output.trim();

      // Try to parse as JSON array
      if (trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      }

      // Try to parse as JSON object with embedding field
      if (trimmed.startsWith('{')) {
        const obj = JSON.parse(trimmed);
        if (obj.embedding) {
          return obj.embedding;
        }
        if (obj.vector) {
          return obj.vector;
        }
      }

      throw new Error('Could not parse embedding output');
    } catch (error) {
      throw new Error(`Failed to parse embedding: ${error}`);
    }
  }

  /**
   * Get search statistics
   */
  async getStats(): Promise<{
    collectionName: string;
    totalDocuments: number;
    dimension: number;
  }> {
    try {
      const collectionPath = this.getCollectionPath();

      // Get stats using ruvector CLI
      const command = `npx ruvector stats "${collectionPath}"`;
      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: 30000
      });

      const stats = JSON.parse(output);

      return {
        collectionName: this.collectionName,
        totalDocuments: stats.count || stats.total || 0,
        dimension: stats.dimension || 384
      };
    } catch (error) {
      console.warn(`Failed to get stats: ${error}`);
      return {
        collectionName: this.collectionName,
        totalDocuments: 0,
        dimension: 384
      };
    }
  }
}
