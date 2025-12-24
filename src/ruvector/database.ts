/**
 * Ruvector Database Wrapper
 * Provides TypeScript interface for ruvector vector database operations
 */

import { VectorDb } from '@ruvector/core';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { DatabaseConfig, ruvectorConfig } from './config';

export interface Vector {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface DatabaseStats {
  name: string;
  path: string;
  dimensions: number;
  vectorCount?: number;
  exists: boolean;
}

export class RuvectorDatabase {
  private config: DatabaseConfig;
  private db: VectorDb | null = null;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Create a new ruvector database
   */
  async createDatabase(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.config.path);
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      // Check if database already exists
      if (existsSync(this.config.path)) {
        console.log(`Database ${this.config.name} already exists at ${this.config.path}`);
        return;
      }

      // Create database using Node.js API
      console.log(`Creating ${this.config.name} database (${this.config.dimensions}D) at ${this.config.path}`);

      this.db = new VectorDb({
        dimensions: this.config.dimensions,
        maxElements: 100000,
        storagePath: this.config.path
      });

      // Insert a dummy vector to initialize the database file
      const dummyVector = new Float32Array(this.config.dimensions).fill(0);
      await this.db.insert({ id: '_init', vector: dummyVector });

      // Delete the dummy vector
      await this.db.delete('_init');

      console.log(`✓ Created ${this.config.name} database (${this.config.dimensions}D) at ${this.config.path}`);

      // Close the connection
      this.db = null;
    } catch (error) {
      throw new Error(`Failed to create database ${this.config.name}: ${error}`);
    }
  }

  /**
   * Get or create database connection
   */
  private getDb(): VectorDb {
    if (!this.db) {
      if (!existsSync(this.config.path)) {
        throw new Error(`Database does not exist: ${this.config.path}. Run createDatabase() first.`);
      }

      this.db = new VectorDb({
        dimensions: this.config.dimensions,
        maxElements: 100000,
        storagePath: this.config.path
      });
    }
    return this.db;
  }

  /**
   * Insert vectors into the database
   */
  async insertVectors(vectors: Vector[]): Promise<void> {
    try {
      const db = this.getDb();

      // Validate vector dimensions
      for (const vector of vectors) {
        if (vector.values.length !== this.config.dimensions) {
          throw new Error(
            `Vector ${vector.id} has ${vector.values.length} dimensions, expected ${this.config.dimensions}`
          );
        }
      }

      // Insert vectors
      for (const vector of vectors) {
        await db.insert({
          id: vector.id,
          vector: new Float32Array(vector.values),
          metadata: vector.metadata ? JSON.stringify(vector.metadata) : undefined
        });
      }

      console.log(`✓ Inserted ${vectors.length} vectors into ${this.config.name}`);
    } catch (error) {
      throw new Error(`Failed to insert vectors into ${this.config.name}: ${error}`);
    }
  }

  /**
   * Search for similar vectors
   */
  async search(queryVector: number[], k: number = 10): Promise<SearchResult[]> {
    try {
      const db = this.getDb();

      // Validate query vector dimensions
      if (queryVector.length !== this.config.dimensions) {
        throw new Error(
          `Query vector dimensions (${queryVector.length}) don't match database dimensions (${this.config.dimensions})`
        );
      }

      // Search using ruvector API
      const results = await db.search({
        vector: new Float32Array(queryVector),
        k
      });

      // Convert to our SearchResult format
      return results.map((r: any) => ({
        id: r.id,
        score: r.score,
        metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : {}
      }));
    } catch (error) {
      throw new Error(`Failed to search ${this.config.name}: ${error}`);
    }
  }

  /**
   * Get a vector by ID
   */
  async getVector(id: string): Promise<Vector | null> {
    try {
      const db = this.getDb();
      const result = await db.get(id);

      if (!result) {
        return null;
      }

      return {
        id,
        values: Array.from(result.vector),
        metadata: result.metadata ? (typeof result.metadata === 'string' ? JSON.parse(result.metadata) : result.metadata) : {}
      };
    } catch (error) {
      throw new Error(`Failed to get vector from ${this.config.name}: ${error}`);
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseStats> {
    try {
      const exists = existsSync(this.config.path);

      const stats: DatabaseStats = {
        name: this.config.name,
        path: this.config.path,
        dimensions: this.config.dimensions,
        exists
      };

      if (exists) {
        try {
          const db = this.getDb();
          stats.vectorCount = await db.len();
        } catch (err) {
          // If we can't get count, just return basic stats
          stats.vectorCount = 0;
        }
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get stats for ${this.config.name}: ${error}`);
    }
  }

  /**
   * Delete a vector by ID
   */
  async deleteVector(id: string): Promise<void> {
    try {
      const db = this.getDb();
      await db.delete(id);
      console.log(`✓ Deleted vector ${id} from ${this.config.name}`);
    } catch (error) {
      throw new Error(`Failed to delete vector from ${this.config.name}: ${error}`);
    }
  }

  /**
   * Check if database is empty
   */
  async isEmpty(): Promise<boolean> {
    try {
      if (!existsSync(this.config.path)) {
        return true;
      }
      const db = this.getDb();
      return await db.isEmpty();
    } catch (error) {
      return true;
    }
  }

  /**
   * Get database configuration
   */
  getConfig(): DatabaseConfig {
    return this.config;
  }

  /**
   * Check if database exists
   */
  exists(): boolean {
    return existsSync(this.config.path);
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db = null;
  }
}

/**
 * Database Manager - Manages all ruvector databases
 */
export class DatabaseManager {
  private databases: Map<string, RuvectorDatabase>;

  constructor() {
    this.databases = new Map();

    // Initialize all configured databases
    for (const [name, config] of Object.entries(ruvectorConfig.databases)) {
      this.databases.set(name, new RuvectorDatabase(config));
    }
  }

  /**
   * Get a specific database instance
   */
  getDatabase(name: keyof typeof ruvectorConfig.databases): RuvectorDatabase {
    const db = this.databases.get(name);
    if (!db) {
      throw new Error(`Database ${name} not found`);
    }
    return db;
  }

  /**
   * Create all databases
   */
  async createAllDatabases(): Promise<void> {
    console.log('Creating all ruvector databases...\n');

    for (const [name, db] of this.databases) {
      await db.createDatabase();
    }

    console.log('\n✓ All databases created successfully');
  }

  /**
   * Get stats for all databases
   */
  async getAllStats(): Promise<DatabaseStats[]> {
    const stats: DatabaseStats[] = [];

    for (const db of this.databases.values()) {
      stats.push(await db.getStats());
    }

    return stats;
  }

  /**
   * Check if all databases exist
   */
  allDatabasesExist(): boolean {
    for (const db of this.databases.values()) {
      if (!db.exists()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Close all database connections
   */
  closeAll(): void {
    for (const db of this.databases.values()) {
      db.close();
    }
  }
}

// Export singleton instance
export const dbManager = new DatabaseManager();

// Export helper functions
export async function createDatabase(
  name: keyof typeof ruvectorConfig.databases
): Promise<void> {
  const db = dbManager.getDatabase(name);
  await db.createDatabase();
}

export async function insertVectors(
  name: keyof typeof ruvectorConfig.databases,
  vectors: Vector[]
): Promise<void> {
  const db = dbManager.getDatabase(name);
  await db.insertVectors(vectors);
}

export async function search(
  name: keyof typeof ruvectorConfig.databases,
  queryVector: number[],
  k: number = 10
): Promise<SearchResult[]> {
  const db = dbManager.getDatabase(name);
  return db.search(queryVector, k);
}

export async function getStats(
  name: keyof typeof ruvectorConfig.databases
): Promise<DatabaseStats> {
  const db = dbManager.getDatabase(name);
  return db.getStats();
}
