/**
 * Product Indexer for ruvector
 * Handles indexing products into the vector database
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EmbeddingService } from '../database/embeddings';
import { ProductDocument } from '../database/collections';

export interface IndexOptions {
  batchSize?: number;
  skipExisting?: boolean;
  updateMetadata?: boolean;
}

export interface IndexResult {
  id: string;
  success: boolean;
  error?: string;
}

export interface BulkIndexResult {
  total: number;
  successful: number;
  failed: number;
  results: IndexResult[];
  duration: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  source: string;
  metadata?: Record<string, any>;
}

export class ProductIndexer {
  private embeddingService: EmbeddingService;
  private dataPath: string;
  private collectionName: string;
  private maxRetries: number;

  constructor(options: {
    dataPath?: string;
    collectionName?: string;
    maxRetries?: number;
  } = {}) {
    this.dataPath = options.dataPath || '/home/user/ecai/data';
    this.collectionName = options.collectionName || 'products';
    this.maxRetries = options.maxRetries || 3;
    this.embeddingService = new EmbeddingService();

    // Ensure collection directory exists
    this.ensureCollection();
  }

  /**
   * Index a single product
   * Generates embedding and inserts into ruvector
   */
  async indexProduct(product: Product): Promise<IndexResult> {
    try {
      console.log(`Indexing product: ${product.id} - ${product.name}`);

      // Generate embedding for the product
      const embedding = await this.embeddingService.embedProduct({
        name: product.name,
        description: product.description,
        category: product.category
      });

      // Create product document
      const document: ProductDocument = {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        source: product.source,
        vector: embedding,
        metadata: product.metadata || {}
      };

      // Insert into ruvector
      await this.insertDocument(document);

      return {
        id: product.id,
        success: true
      };
    } catch (error: any) {
      console.error(`Failed to index product ${product.id}:`, error.message);
      return {
        id: product.id,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch index multiple products
   * Processes products in batches for efficiency
   */
  async bulkIndex(
    products: Product[],
    options: IndexOptions = {}
  ): Promise<BulkIndexResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 50;
    const results: IndexResult[] = [];

    console.log(`Starting bulk index of ${products.length} products...`);

    // Process in batches
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(products.length / batchSize);

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)`);

      try {
        // Generate embeddings for the batch
        const texts = batch.map(p => `${p.name}. ${p.description}. Category: ${p.category}`);
        const embeddings = await this.embeddingService.embedBatch(texts);

        // Create documents with embeddings
        const documents: ProductDocument[] = batch.map((product, idx) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          source: product.source,
          vector: embeddings[idx].vector,
          metadata: product.metadata || {}
        }));

        // Insert batch into ruvector
        await this.insertBatch(documents);

        // Mark all as successful
        batch.forEach(product => {
          results.push({
            id: product.id,
            success: true
          });
        });

        console.log(`Batch ${batchNumber} completed successfully`);
      } catch (error: any) {
        console.error(`Batch ${batchNumber} failed:`, error.message);

        // Fall back to indexing individually
        console.log('Falling back to individual indexing for this batch...');
        for (const product of batch) {
          const result = await this.indexProduct(product);
          results.push(result);
        }
      }
    }

    const duration = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\nBulk index completed:`);
    console.log(`  Total: ${products.length}`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);

    return {
      total: products.length,
      successful,
      failed,
      results,
      duration
    };
  }

  /**
   * Update an existing product in the index
   */
  async updateIndex(productId: string, updates: Partial<Product>): Promise<IndexResult> {
    try {
      console.log(`Updating product: ${productId}`);

      // First, get the existing product
      const existingProduct = await this.getProduct(productId);

      if (!existingProduct) {
        throw new Error(`Product ${productId} not found in index`);
      }

      // Merge updates with existing product
      const updatedProduct: Product = {
        id: productId,
        name: updates.name || existingProduct.name,
        description: updates.description || existingProduct.description,
        category: updates.category || existingProduct.category,
        price: updates.price !== undefined ? updates.price : existingProduct.price,
        source: updates.source || existingProduct.source,
        metadata: { ...existingProduct.metadata, ...updates.metadata }
      };

      // Check if we need to regenerate embedding
      const needsReembedding =
        updates.name !== undefined ||
        updates.description !== undefined ||
        updates.category !== undefined;

      let embedding = existingProduct.vector;

      if (needsReembedding && embedding) {
        // Regenerate embedding
        embedding = await this.embeddingService.embedProduct({
          name: updatedProduct.name,
          description: updatedProduct.description,
          category: updatedProduct.category
        });
      }

      // Create updated document
      const document: ProductDocument = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        description: updatedProduct.description,
        category: updatedProduct.category,
        price: updatedProduct.price,
        source: updatedProduct.source,
        vector: embedding,
        metadata: updatedProduct.metadata || {}
      };

      // Delete old entry
      await this.deleteDocument(productId);

      // Insert updated document
      await this.insertDocument(document);

      console.log(`Product ${productId} updated successfully`);

      return {
        id: productId,
        success: true
      };
    } catch (error: any) {
      console.error(`Failed to update product ${productId}:`, error.message);
      return {
        id: productId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a product from the index
   */
  async deleteProduct(productId: string): Promise<IndexResult> {
    try {
      await this.deleteDocument(productId);
      return {
        id: productId,
        success: true
      };
    } catch (error: any) {
      return {
        id: productId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a product from the index
   */
  private async getProduct(productId: string): Promise<ProductDocument | null> {
    try {
      const collectionPath = this.getCollectionPath();

      // Get product using ruvector CLI
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
          name: result.metadata?.name || '',
          description: result.metadata?.description || '',
          category: result.metadata?.category || '',
          price: result.metadata?.price || 0,
          source: result.metadata?.source || '',
          metadata: result.metadata || {}
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Insert a single document into ruvector
   */
  private async insertDocument(document: ProductDocument): Promise<void> {
    const collectionPath = this.getCollectionPath();
    const tempDir = path.join(this.dataPath, 'temp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create temporary file with document data
    const tempFile = path.join(tempDir, `insert_${document.id}_${Date.now()}.json`);

    const data = {
      id: document.id,
      vector: document.vector,
      metadata: {
        name: document.name,
        description: document.description,
        category: document.category,
        price: document.price,
        source: document.source,
        ...document.metadata
      }
    };

    fs.writeFileSync(tempFile, JSON.stringify(data));

    try {
      // Insert using ruvector CLI
      // Format: npx ruvector insert <database> <file>
      const command = `npx ruvector insert "${collectionPath}" "${tempFile}"`;

      execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  /**
   * Insert multiple documents in batch
   */
  private async insertBatch(documents: ProductDocument[]): Promise<void> {
    const collectionPath = this.getCollectionPath();
    const tempDir = path.join(this.dataPath, 'temp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create temporary batch file (JSONL format)
    const tempFile = path.join(tempDir, `batch_${Date.now()}.jsonl`);

    const lines = documents.map(doc => {
      if (!doc.vector || doc.vector.length === 0) {
        throw new Error(`Document ${doc.id} is missing vector`);
      }

      return JSON.stringify({
        id: doc.id,
        vector: doc.vector,
        metadata: {
          name: doc.name,
          description: doc.description,
          category: doc.category,
          price: doc.price,
          source: doc.source,
          ...doc.metadata
        }
      });
    });

    fs.writeFileSync(tempFile, lines.join('\n'));

    try {
      // Insert batch using ruvector CLI
      // Format: npx ruvector insert <database> <file> --batch-size <size>
      const command = `npx ruvector insert "${collectionPath}" "${tempFile}" --batch-size ${documents.length}`;

      execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: 120000 // 2 minute timeout for large batches
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  /**
   * Delete a document from ruvector
   */
  private async deleteDocument(id: string): Promise<void> {
    const collectionPath = this.getCollectionPath();

    // Delete using ruvector CLI
    const command = `npx ruvector delete "${collectionPath}" --id "${id}"`;

    try {
      execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000
      });
    } catch (error: any) {
      // Ignore errors if document doesn't exist
      if (!error.message.includes('not found')) {
        throw error;
      }
    }
  }

  /**
   * Ensure collection exists
   */
  private ensureCollection(): void {
    const collectionPath = this.getCollectionPath();

    if (!fs.existsSync(collectionPath)) {
      // Create collection directory
      fs.mkdirSync(collectionPath, { recursive: true });

      try {
        // Initialize collection using ruvector CLI
        const command = `npx ruvector create "${collectionPath}" --dimension 384 --metric cosine`;

        execSync(command, {
          encoding: 'utf-8',
          timeout: 30000
        });

        console.log(`Created collection: ${this.collectionName}`);
      } catch (error) {
        console.warn(`Collection may already exist: ${error}`);
      }
    }
  }

  /**
   * Get collection path
   */
  private getCollectionPath(): string {
    return path.join(this.dataPath, this.collectionName);
  }

  /**
   * Get indexer statistics
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
      return {
        collectionName: this.collectionName,
        totalDocuments: 0,
        dimension: 384
      };
    }
  }
}
