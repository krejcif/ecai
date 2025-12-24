/**
 * Ruvector Database Configuration
 * Defines paths and settings for AI-powered product intelligence databases
 */

import path from 'path';

export interface DatabaseConfig {
  name: string;
  path: string;
  dimensions: number;
  description: string;
}

export interface RuvectorConfig {
  dataDir: string;
  databases: {
    products: DatabaseConfig;
    prices: DatabaseConfig;
    trends: DatabaseConfig;
    categories: DatabaseConfig;
  };
}

// Base directory for ruvector databases
const DATA_DIR = path.resolve(process.cwd(), 'data', 'ruvector');

/**
 * Ruvector database configuration
 * Each database is optimized for specific intelligence tasks
 */
export const ruvectorConfig: RuvectorConfig = {
  dataDir: DATA_DIR,
  databases: {
    // Product embeddings database - stores product descriptions, features, and attributes
    products: {
      name: 'products',
      path: path.join(DATA_DIR, 'products.db'),
      dimensions: 1536, // OpenAI text-embedding-ada-002 or similar
      description: 'Product embeddings for semantic search and matching'
    },

    // Price analysis database - stores price points, trends, and historical data
    prices: {
      name: 'prices',
      path: path.join(DATA_DIR, 'prices.db'),
      dimensions: 768, // Smaller dimension for numerical/temporal embeddings
      description: 'Price embeddings for competitive analysis and trend detection'
    },

    // Market trends database - stores trend patterns, seasonality, and market signals
    trends: {
      name: 'trends',
      path: path.join(DATA_DIR, 'trends.db'),
      dimensions: 512, // Optimized for trend pattern matching
      description: 'Market trend embeddings for predictive analytics'
    },

    // Category taxonomy database - stores category hierarchies and relationships
    categories: {
      name: 'categories',
      path: path.join(DATA_DIR, 'categories.db'),
      dimensions: 384, // Efficient for category classification
      description: 'Category embeddings for product classification'
    }
  }
};

/**
 * Get configuration for a specific database
 */
export function getDatabaseConfig(name: keyof RuvectorConfig['databases']): DatabaseConfig {
  return ruvectorConfig.databases[name];
}

/**
 * Get all database configurations
 */
export function getAllDatabaseConfigs(): DatabaseConfig[] {
  return Object.values(ruvectorConfig.databases);
}

/**
 * Get the data directory path
 */
export function getDataDir(): string {
  return ruvectorConfig.dataDir;
}

export default ruvectorConfig;
