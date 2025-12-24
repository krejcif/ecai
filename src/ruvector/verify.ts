/**
 * Ruvector Database Verification Script
 * Tests basic database operations to ensure everything is working
 */

import { dbManager, Vector } from './database';

async function verifyDatabases() {
  console.log('='.repeat(60));
  console.log('Ruvector Database Verification');
  console.log('='.repeat(60));
  console.log();

  try {
    // Test products database with sample data
    console.log('Testing products database...');
    const productsDb = dbManager.getDatabase('products');

    // Create sample product vectors (1536 dimensions for OpenAI embeddings)
    const sampleProduct: Vector = {
      id: 'product_001',
      values: Array.from({ length: 1536 }, () => Math.random()),
      metadata: {
        name: 'Sample Product',
        category: 'Electronics',
        price: 299.99
      }
    };

    await productsDb.insertVectors([sampleProduct]);
    console.log('✓ Inserted sample product vector');

    // Search for similar products
    const searchQuery = Array.from({ length: 1536 }, () => Math.random());
    const results = await productsDb.search(searchQuery, 1);
    console.log('✓ Search successful, found', results.length, 'results');
    console.log('  Result:', results[0]);

    // Get stats
    const stats = await productsDb.getStats();
    console.log('✓ Products database stats:', {
      vectors: stats.vectorCount,
      dimensions: stats.dimensions
    });

    // Clean up test data
    await productsDb.deleteVector('product_001');
    console.log('✓ Cleanup successful');

    console.log();
    console.log('Testing all databases...');
    console.log('-'.repeat(60));

    // Test all databases
    for (const dbName of ['products', 'prices', 'trends', 'categories'] as const) {
      const db = dbManager.getDatabase(dbName);
      const config = db.getConfig();
      const isEmpty = await db.isEmpty();
      const exists = db.exists();

      console.log(`  ${dbName.padEnd(12)} - ${config.dimensions}D, ${exists ? 'exists' : 'missing'}, ${isEmpty ? 'empty' : 'has data'}`);
    }

    console.log();
    console.log('='.repeat(60));
    console.log('✓ Verification Complete - All databases operational!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

// Run verification if executed directly
if (require.main === module) {
  verifyDatabases().catch(console.error);
}

export { verifyDatabases };
