# Ruvector Database Infrastructure

AI-powered vector database infrastructure for the product intelligence system.

## Overview

This module provides a TypeScript wrapper around the high-performance ruvector vector database, designed for AI/ML applications, semantic search, and similarity matching.

## Database Configuration

Four specialized databases have been created, each optimized for specific intelligence tasks:

| Database | Dimensions | Purpose |
|----------|------------|---------|
| **products** | 1536 | Product embeddings for semantic search and matching (OpenAI ada-002) |
| **prices** | 768 | Price embeddings for competitive analysis and trend detection |
| **trends** | 512 | Market trend embeddings for predictive analytics |
| **categories** | 384 | Category embeddings for product classification |

All databases are stored in `/home/user/ecai/data/ruvector/`

## Files Created

### Core Infrastructure

- **config.ts** - Database configuration and paths
- **database.ts** - RuvectorDatabase class and DatabaseManager
- **index.ts** - Public exports for the module
- **setup.ts** - Database initialization script
- **verify.ts** - Database verification and testing script

### Database Files

- `/home/user/ecai/data/ruvector/products.db` (1.6M)
- `/home/user/ecai/data/ruvector/prices.db` (1.6M)
- `/home/user/ecai/data/ruvector/trends.db` (1.6M)
- `/home/user/ecai/data/ruvector/categories.db` (1.6M)

## Usage

### Basic Operations

```typescript
import { dbManager, Vector } from './ruvector';

// Get a database instance
const productsDb = dbManager.getDatabase('products');

// Insert vectors
const vectors: Vector[] = [
  {
    id: 'product_001',
    values: new Array(1536).fill(0).map(() => Math.random()),
    metadata: { name: 'Sample Product', price: 299.99 }
  }
];

await productsDb.insertVectors(vectors);

// Search for similar vectors
const queryVector = new Array(1536).fill(0).map(() => Math.random());
const results = await productsDb.search(queryVector, 10);

// Get database statistics
const stats = await productsDb.getStats();
console.log(stats);
```

### Helper Functions

```typescript
import { insertVectors, search, getStats } from './ruvector';

// Insert into products database
await insertVectors('products', vectors);

// Search in products database
const results = await search('products', queryVector, 10);

// Get statistics
const stats = await getStats('products');
```

### Database Manager

```typescript
import { dbManager } from './ruvector';

// Create all databases
await dbManager.createAllDatabases();

// Get stats for all databases
const allStats = await dbManager.getAllStats();

// Check if all databases exist
const ready = dbManager.allDatabasesExist();
```

## API Reference

### RuvectorDatabase Class

#### Methods

- `createDatabase()` - Create a new database file
- `insertVectors(vectors: Vector[])` - Insert multiple vectors
- `search(queryVector: number[], k: number)` - Search for similar vectors
- `getVector(id: string)` - Retrieve a specific vector by ID
- `deleteVector(id: string)` - Delete a vector by ID
- `getStats()` - Get database statistics
- `isEmpty()` - Check if database is empty
- `exists()` - Check if database file exists
- `close()` - Close database connection

### Types

```typescript
interface Vector {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

interface DatabaseStats {
  name: string;
  path: string;
  dimensions: number;
  vectorCount?: number;
  exists: boolean;
}

interface DatabaseConfig {
  name: string;
  path: string;
  dimensions: number;
  description: string;
}
```

## Scripts

### Initialize Databases

```bash
npx tsx src/ruvector/setup.ts
```

### Verify Databases

```bash
npx tsx src/ruvector/verify.ts
```

## Performance

Based on ruvector benchmarks (128-dimensional vectors):

- **Insert**: 52,341 ops/sec
- **Search (k=10)**: 11,234 ops/sec
- **Memory**: ~50 bytes per vector

## Dependencies

- `@ruvector/core` (v0.1.28) - High-performance vector database with HNSW indexing

## Configuration

Database paths and dimensions can be customized in `config.ts`:

```typescript
export const ruvectorConfig: RuvectorConfig = {
  dataDir: path.resolve(process.cwd(), 'data', 'ruvector'),
  databases: {
    products: {
      name: 'products',
      path: path.join(DATA_DIR, 'products.db'),
      dimensions: 1536,
      description: 'Product embeddings for semantic search'
    },
    // ...
  }
};
```

## Implementation Notes

- Vector dimensions must match the database configuration
- Metadata is automatically JSON stringified/parsed
- Vectors are converted to Float32Array for optimal performance
- Database connections are lazily initialized
- All operations are asynchronous
- Uses HNSW (Hierarchical Navigable Small World) indexing
- Supports cosine similarity metric

## Verification Status

All databases have been successfully created and verified:

- ✅ Products database (1536D) - operational
- ✅ Prices database (768D) - operational
- ✅ Trends database (512D) - operational
- ✅ Categories database (384D) - operational
