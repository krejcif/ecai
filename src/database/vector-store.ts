/**
 * Vector store implementation using ruvector CLI
 */

import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { CollectionName, CollectionConfig, COLLECTION_CONFIGS, BaseDocument } from './collections';

export interface VectorStoreConfig {
  dataPath?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface InsertOptions {
  batchSize?: number;
}

export interface SearchOptions {
  limit?: number;
  filter?: Record<string, any>;
  scoreThreshold?: number;
}

export interface SearchResult<T = BaseDocument> {
  id: string;
  score: number;
  document: T;
}

export class VectorStore {
  private dataPath: string;
  private config: Required<VectorStoreConfig>;
  private initialized: Set<CollectionName>;

  constructor(config: VectorStoreConfig = {}) {
    this.dataPath = config.dataPath || '/home/user/ecai/data';
    this.config = {
      dataPath: this.dataPath,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000
    };
    this.initialized = new Set();

    // Ensure data directory exists
    this.ensureDataDirectory();
  }

  /**
   * Initialize a collection
   */
  async initCollection(collectionName: CollectionName): Promise<void> {
    if (this.initialized.has(collectionName)) {
      return;
    }

    const config = COLLECTION_CONFIGS[collectionName];
    const collectionPath = this.getCollectionPath(collectionName);

    try {
      // Create collection using ruvector CLI
      // Format: npx ruvector create <collection> --dimension <dim> --metric <metric>
      const command = `npx ruvector create "${collectionPath}" --dimension ${config.dimension} --metric ${config.metric || 'cosine'}`;

      // Check if collection already exists
      if (fs.existsSync(collectionPath)) {
        console.log(`Collection ${collectionName} already exists`);
        this.initialized.add(collectionName);
        return;
      }

      await this.executeCommand(command);
      this.initialized.add(collectionName);

      console.log(`Initialized collection: ${collectionName}`);
    } catch (error) {
      throw new Error(`Failed to initialize collection ${collectionName}: ${error}`);
    }
  }

  /**
   * Insert a single document
   */
  async insert<T extends BaseDocument>(
    collectionName: CollectionName,
    document: T
  ): Promise<void> {
    await this.ensureInitialized(collectionName);

    if (!document.vector || document.vector.length === 0) {
      throw new Error('Document must have a vector');
    }

    try {
      const collectionPath = this.getCollectionPath(collectionName);

      // Create a temporary file with the document data
      const tempFile = path.join(this.dataPath, `temp_${Date.now()}.json`);
      const data = {
        id: document.id,
        vector: document.vector,
        metadata: this.extractMetadata(document)
      };

      fs.writeFileSync(tempFile, JSON.stringify(data));

      // Insert using ruvector CLI
      // Format: npx ruvector insert <collection> --file <file>
      const command = `npx ruvector insert "${collectionPath}" --file "${tempFile}"`;
      await this.executeCommand(command);

      // Clean up temp file
      fs.unlinkSync(tempFile);
    } catch (error) {
      throw new Error(`Failed to insert document: ${error}`);
    }
  }

  /**
   * Insert multiple documents in batches
   */
  async insertBatch<T extends BaseDocument>(
    collectionName: CollectionName,
    documents: T[],
    options: InsertOptions = {}
  ): Promise<void> {
    await this.ensureInitialized(collectionName);

    const batchSize = options.batchSize || 100;

    // Process in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      try {
        const collectionPath = this.getCollectionPath(collectionName);

        // Create temporary batch file
        const tempFile = path.join(this.dataPath, `batch_${Date.now()}.jsonl`);
        const lines = batch.map(doc => {
          if (!doc.vector || doc.vector.length === 0) {
            throw new Error(`Document ${doc.id} is missing vector`);
          }

          return JSON.stringify({
            id: doc.id,
            vector: doc.vector,
            metadata: this.extractMetadata(doc)
          });
        });

        fs.writeFileSync(tempFile, lines.join('\n'));

        // Insert batch using ruvector CLI
        const command = `npx ruvector insert "${collectionPath}" --file "${tempFile}" --batch`;
        await this.executeCommand(command);

        // Clean up temp file
        fs.unlinkSync(tempFile);

        console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} documents`);
      } catch (error) {
        throw new Error(`Failed to insert batch: ${error}`);
      }
    }
  }

  /**
   * Search for similar vectors
   */
  async search<T extends BaseDocument>(
    collectionName: CollectionName,
    queryVector: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult<T>[]> {
    await this.ensureInitialized(collectionName);

    const limit = options.limit || 10;
    const scoreThreshold = options.scoreThreshold || 0;

    try {
      const collectionPath = this.getCollectionPath(collectionName);

      // Create temp file with query vector
      const tempFile = path.join(this.dataPath, `query_${Date.now()}.json`);
      fs.writeFileSync(tempFile, JSON.stringify({ vector: queryVector }));

      // Search using ruvector CLI
      // Format: npx ruvector search <collection> --query <file> --limit <limit>
      const command = `npx ruvector search "${collectionPath}" --query "${tempFile}" --limit ${limit}`;
      const output = await this.executeCommand(command);

      // Clean up temp file
      fs.unlinkSync(tempFile);

      // Parse search results
      const results = this.parseSearchResults<T>(output, scoreThreshold);

      // Apply filters if provided
      if (options.filter) {
        return this.applyFilters(results, options.filter);
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to search collection: ${error}`);
    }
  }

  /**
   * Delete a document by ID
   */
  async delete(collectionName: CollectionName, id: string): Promise<void> {
    await this.ensureInitialized(collectionName);

    try {
      const collectionPath = this.getCollectionPath(collectionName);

      // Delete using ruvector CLI
      // Format: npx ruvector delete <collection> --id <id>
      const command = `npx ruvector delete "${collectionPath}" --id "${id}"`;
      await this.executeCommand(command);
    } catch (error) {
      throw new Error(`Failed to delete document: ${error}`);
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteBatch(collectionName: CollectionName, ids: string[]): Promise<void> {
    await this.ensureInitialized(collectionName);

    for (const id of ids) {
      await this.delete(collectionName, id);
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(collectionName: CollectionName): Promise<any> {
    await this.ensureInitialized(collectionName);

    try {
      const collectionPath = this.getCollectionPath(collectionName);

      // Get stats using ruvector CLI
      const command = `npx ruvector stats "${collectionPath}"`;
      const output = await this.executeCommand(command);

      return JSON.parse(output);
    } catch (error) {
      console.warn(`Failed to get stats: ${error}`);
      return { count: 0 };
    }
  }

  /**
   * Clear all documents from a collection
   */
  async clear(collectionName: CollectionName): Promise<void> {
    const collectionPath = this.getCollectionPath(collectionName);

    try {
      // Remove the collection directory
      if (fs.existsSync(collectionPath)) {
        fs.rmSync(collectionPath, { recursive: true, force: true });
      }

      // Reinitialize the collection
      this.initialized.delete(collectionName);
      await this.initCollection(collectionName);
    } catch (error) {
      throw new Error(`Failed to clear collection: ${error}`);
    }
  }

  /**
   * Ensure collection is initialized
   */
  private async ensureInitialized(collectionName: CollectionName): Promise<void> {
    if (!this.initialized.has(collectionName)) {
      await this.initCollection(collectionName);
    }
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }

  /**
   * Get collection path
   */
  private getCollectionPath(collectionName: CollectionName): string {
    return path.join(this.dataPath, collectionName);
  }

  /**
   * Extract metadata from document (everything except id and vector)
   */
  private extractMetadata(document: BaseDocument): Record<string, any> {
    const { id, vector, ...metadata } = document;
    return metadata;
  }

  /**
   * Execute ruvector CLI command with retry logic
   */
  private async executeCommand(command: string, attempt = 1): Promise<string> {
    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        timeout: 60000, // 60 second timeout
        stdio: ['pipe', 'pipe', 'pipe']
      });

      return output;
    } catch (error: any) {
      // Check if it's a retryable error
      const isRetryable = this.isRetryableError(error);

      if (isRetryable && attempt < this.config.maxRetries) {
        console.warn(`Command failed (attempt ${attempt}/${this.config.maxRetries}), retrying...`);

        // Wait before retrying
        await this.sleep(this.config.retryDelay * attempt);

        return this.executeCommand(command, attempt + 1);
      }

      // Log the error details
      const stderr = error.stderr?.toString() || '';
      const stdout = error.stdout?.toString() || '';

      throw new Error(`Command failed: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    const stderr = error.stderr?.toString().toLowerCase() || '';

    // Retry on network errors, timeouts, etc.
    const retryablePatterns = [
      'timeout',
      'econnrefused',
      'econnreset',
      'network',
      'temporarily unavailable'
    ];

    return retryablePatterns.some(pattern =>
      message.includes(pattern) || stderr.includes(pattern)
    );
  }

  /**
   * Parse search results from CLI output
   */
  private parseSearchResults<T extends BaseDocument>(
    output: string,
    scoreThreshold: number
  ): SearchResult<T>[] {
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
      return results
        .map(result => ({
          id: result.id,
          score: result.score || result.distance || 0,
          document: { id: result.id, ...result.metadata } as T
        }))
        .filter(result => result.score >= scoreThreshold)
        .sort((a, b) => b.score - a.score);
    } catch (error) {
      console.warn(`Failed to parse search results: ${error}`);
      return [];
    }
  }

  /**
   * Apply filters to search results
   */
  private applyFilters<T extends BaseDocument>(
    results: SearchResult<T>[],
    filter: Record<string, any>
  ): SearchResult<T>[] {
    return results.filter(result => {
      const doc = result.document as any;

      return Object.entries(filter).every(([key, value]) => {
        if (Array.isArray(value)) {
          return value.includes(doc[key]);
        }
        return doc[key] === value;
      });
    });
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
