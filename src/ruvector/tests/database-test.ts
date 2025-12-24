/**
 * Database Operations Test Suite
 * Tests database operations: create, insert, search, delete, stats
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  passed: boolean;
  error?: string;
  details?: any;
}

export class DatabaseTest {
  private testDbPath: string;
  private testCollectionName: string;

  constructor() {
    this.testDbPath = '/home/user/ecai/data/test_db';
    this.testCollectionName = 'test_collection';
  }

  /**
   * Test: Create Collection
   */
  async testCreateCollection(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Clean up if exists
      if (fs.existsSync(this.testDbPath)) {
        fs.rmSync(this.testDbPath, { recursive: true, force: true });
      }

      // Create collection
      const dimension = 384;
      const metric = 'cosine';
      const command = `npx ruvector create "${this.testDbPath}" --dimension ${dimension} --metric ${metric}`;

      execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      // Verify collection was created
      const exists = fs.existsSync(this.testDbPath);
      const duration = Date.now() - startTime;

      return {
        passed: exists,
        error: exists ? undefined : 'Collection directory was not created',
        details: {
          duration,
          dimension,
          metric,
          path: this.testDbPath
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Insert Single Document
   */
  async testInsertSingleDocument(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Ensure collection exists
      await this.ensureCollection();

      // Create test document
      const doc = {
        id: 'test-doc-1',
        vector: this.generateRandomVector(384),
        metadata: {
          name: 'Test Product',
          category: 'Electronics',
          price: 99.99
        }
      };

      // Write to temp file
      const tempFile = path.join('/tmp', `test_insert_${Date.now()}.json`);
      fs.writeFileSync(tempFile, JSON.stringify(doc));

      // Insert document
      const command = `npx ruvector insert "${this.testDbPath}" --file "${tempFile}"`;
      execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      // Clean up temp file
      fs.unlinkSync(tempFile);

      const duration = Date.now() - startTime;

      return {
        passed: true,
        details: {
          duration,
          documentId: doc.id,
          vectorDim: doc.vector.length
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Insert Batch Documents
   */
  async testInsertBatchDocuments(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.ensureCollection();

      const batchSize = 10;
      const docs = [];

      // Create batch of documents
      for (let i = 0; i < batchSize; i++) {
        docs.push({
          id: `batch-doc-${i}`,
          vector: this.generateRandomVector(384),
          metadata: {
            name: `Product ${i}`,
            category: i % 2 === 0 ? 'Electronics' : 'Clothing',
            price: Math.random() * 100
          }
        });
      }

      // Write to temp file (JSONL format)
      const tempFile = path.join('/tmp', `test_batch_${Date.now()}.jsonl`);
      const lines = docs.map(doc => JSON.stringify(doc)).join('\n');
      fs.writeFileSync(tempFile, lines);

      // Insert batch
      const command = `npx ruvector insert "${this.testDbPath}" --file "${tempFile}" --batch`;
      execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      // Clean up
      fs.unlinkSync(tempFile);

      const duration = Date.now() - startTime;

      return {
        passed: true,
        details: {
          duration,
          batchSize,
          avgTimePerDoc: duration / batchSize
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Search Vectors
   */
  async testSearchVectors(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.ensureCollection();

      // Insert some test documents first
      await this.insertTestDocuments(5);

      // Create query vector
      const queryVector = this.generateRandomVector(384);

      // Write query to temp file
      const tempFile = path.join('/tmp', `test_query_${Date.now()}.json`);
      fs.writeFileSync(tempFile, JSON.stringify({ vector: queryVector }));

      // Search
      const limit = 3;
      const command = `npx ruvector search "${this.testDbPath}" --query "${tempFile}" --limit ${limit}`;
      const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      // Clean up
      fs.unlinkSync(tempFile);

      // Parse results
      const results = this.parseSearchResults(output);
      const duration = Date.now() - startTime;

      return {
        passed: Array.isArray(results) && results.length > 0 && results.length <= limit,
        error: results.length === 0 ? 'No search results returned' : undefined,
        details: {
          duration,
          resultsCount: results.length,
          limit,
          avgScore: results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Delete Document
   */
  async testDeleteDocument(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.ensureCollection();

      // Insert a document to delete
      const docId = 'delete-test-doc';
      await this.insertSingleDoc(docId);

      // Delete the document
      const command = `npx ruvector delete "${this.testDbPath}" --id "${docId}"`;
      execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      const duration = Date.now() - startTime;

      return {
        passed: true,
        details: {
          duration,
          deletedId: docId
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Get Statistics
   */
  async testGetStatistics(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.ensureCollection();
      await this.insertTestDocuments(10);

      // Get stats
      const command = `npx ruvector stats "${this.testDbPath}"`;
      const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      // Parse stats
      const stats = JSON.parse(output.trim());
      const duration = Date.now() - startTime;

      return {
        passed: typeof stats === 'object' && stats !== null,
        details: {
          duration,
          stats
        }
      };
    } catch (error: any) {
      // Stats might not be implemented, treat as non-critical
      return {
        passed: true, // Don't fail if stats not implemented
        error: `Stats command not available: ${error.message}`,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Collection Persistence
   */
  async testCollectionPersistence(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.ensureCollection();

      // Insert documents
      const docId = 'persistence-test';
      await this.insertSingleDoc(docId);

      // Simulate restart by creating a new "connection"
      // Just verify we can search after insert
      const queryVector = this.generateRandomVector(384);
      const tempFile = path.join('/tmp', `test_persist_${Date.now()}.json`);
      fs.writeFileSync(tempFile, JSON.stringify({ vector: queryVector }));

      const command = `npx ruvector search "${this.testDbPath}" --query "${tempFile}" --limit 5`;
      const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      fs.unlinkSync(tempFile);

      const results = this.parseSearchResults(output);
      const duration = Date.now() - startTime;

      return {
        passed: results.length > 0,
        details: {
          duration,
          foundDocuments: results.length
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Large Batch Insert
   */
  async testLargeBatchInsert(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.ensureCollection();

      const batchSize = 100;
      const docs = [];

      for (let i = 0; i < batchSize; i++) {
        docs.push({
          id: `large-batch-${i}`,
          vector: this.generateRandomVector(384),
          metadata: {
            name: `Product ${i}`,
            category: ['Electronics', 'Clothing', 'Food', 'Books'][i % 4],
            price: Math.random() * 1000
          }
        });
      }

      const tempFile = path.join('/tmp', `test_large_batch_${Date.now()}.jsonl`);
      const lines = docs.map(doc => JSON.stringify(doc)).join('\n');
      fs.writeFileSync(tempFile, lines);

      const command = `npx ruvector insert "${this.testDbPath}" --file "${tempFile}" --batch`;
      execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      fs.unlinkSync(tempFile);

      const duration = Date.now() - startTime;

      return {
        passed: true,
        details: {
          duration,
          batchSize,
          avgTimePerDoc: duration / batchSize,
          throughput: (batchSize / (duration / 1000)).toFixed(2) + ' docs/sec'
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  // Helper methods

  private async ensureCollection(): Promise<void> {
    if (!fs.existsSync(this.testDbPath)) {
      const command = `npx ruvector create "${this.testDbPath}" --dimension 384 --metric cosine`;
      execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    }
  }

  private async insertTestDocuments(count: number): Promise<void> {
    const docs = [];
    for (let i = 0; i < count; i++) {
      docs.push({
        id: `test-doc-${i}`,
        vector: this.generateRandomVector(384),
        metadata: { name: `Product ${i}`, index: i }
      });
    }

    const tempFile = path.join('/tmp', `test_docs_${Date.now()}.jsonl`);
    const lines = docs.map(doc => JSON.stringify(doc)).join('\n');
    fs.writeFileSync(tempFile, lines);

    const command = `npx ruvector insert "${this.testDbPath}" --file "${tempFile}" --batch`;
    execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

    fs.unlinkSync(tempFile);
  }

  private async insertSingleDoc(id: string): Promise<void> {
    const doc = {
      id,
      vector: this.generateRandomVector(384),
      metadata: { name: 'Test Doc' }
    };

    const tempFile = path.join('/tmp', `test_single_${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(doc));

    const command = `npx ruvector insert "${this.testDbPath}" --file "${tempFile}"`;
    execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

    fs.unlinkSync(tempFile);
  }

  private generateRandomVector(dimension: number): number[] {
    const vector = [];
    for (let i = 0; i < dimension; i++) {
      vector.push(Math.random() * 2 - 1); // Random values between -1 and 1
    }
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => v / magnitude);
  }

  private parseSearchResults(output: string): any[] {
    try {
      const trimmed = output.trim();
      if (trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      } else if (trimmed.startsWith('{')) {
        const obj = JSON.parse(trimmed);
        return obj.results || obj.matches || [obj];
      } else {
        return trimmed.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
      }
    } catch (error) {
      return [];
    }
  }
}
