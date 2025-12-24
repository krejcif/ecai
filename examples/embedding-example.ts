#!/usr/bin/env tsx

/**
 * Example: Product Embedding Generation
 *
 * This example demonstrates how to use the ProductEmbeddingGenerator
 * to create vector embeddings for products using ruvector.
 */

import { ProductEmbeddingGenerator, embedProduct } from '../src/ruvector/embeddings.js';
import { Product } from '../src/types/index.js';

// Example product
const product: Product = {
  id: 'example_001',
  title: 'Premium Wireless Mouse',
  description: 'Ergonomic wireless mouse with precision tracking and long battery life. Perfect for work and gaming.',
  price: 49.99,
  currency: 'USD',
  url: 'https://example.com/wireless-mouse',
  brand: 'TechGear',
  category: 'Electronics',
  inStock: true,
  rating: 4.6,
  reviewCount: 328,
  tags: ['wireless', 'ergonomic', 'gaming'],
  createdAt: new Date(),
  updatedAt: new Date()
};

async function main() {
  console.log('Product Embedding Example\n');

  // Method 1: Using the helper function
  console.log('Method 1: Using helper function');
  const vector1 = await embedProduct(product);
  console.log('  Vector ID:', vector1.id);
  console.log('  Dimensions:', vector1.vector.length);
  console.log('  First 5 values:', vector1.vector.slice(0, 5));
  console.log();

  // Method 2: Using ProductEmbeddingGenerator class
  console.log('Method 2: Using ProductEmbeddingGenerator class');
  const generator = new ProductEmbeddingGenerator({
    batchSize: 5,
    cacheEnabled: true,
    maxRetries: 3
  });

  const vector2 = await generator.generateProductEmbedding(product);
  console.log('  Vector ID:', vector2.id);
  console.log('  Dimensions:', vector2.vector.length);
  console.log('  Metadata:', JSON.stringify(vector2.metadata, null, 2));
  console.log();

  // Method 3: Batch processing
  console.log('Method 3: Batch processing multiple products');
  const products: Product[] = [
    { ...product, id: 'batch_1', title: 'Gaming Keyboard' },
    { ...product, id: 'batch_2', title: 'USB-C Cable' },
    { ...product, id: 'batch_3', title: 'Laptop Stand' }
  ];

  const results = await generator.batchGenerateEmbeddings(products);
  console.log('  Batch results:');
  results.forEach((result, i) => {
    console.log(`    ${i + 1}. ${result.productId}: ${result.success ? '✓' : '✗'} (${result.processingTime}ms)`);
  });
  console.log();

  // Display statistics
  const stats = generator.getStats();
  console.log('Statistics:');
  console.log('  Total generated:', stats.totalGenerated);
  console.log('  Total cached:', stats.totalCached);
  console.log('  Cache hit rate:', (stats.cacheHitRate * 100).toFixed(2) + '%');
  console.log('  Average time:', stats.averageTime.toFixed(2) + 'ms');
}

main().catch(console.error);
