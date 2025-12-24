#!/usr/bin/env tsx

/**
 * Test script for Product Embedding Generation System
 */

import { ProductEmbeddingGenerator } from '../src/ruvector/embeddings.js';
import { Product } from '../src/types/index.js';

// Sample products for testing
const sampleProducts: Product[] = [
  {
    id: 'prod_1',
    title: 'Organic Extra Virgin Olive Oil',
    description: 'Premium cold-pressed organic olive oil from Italy. Rich in antioxidants and perfect for cooking or salad dressings.',
    price: 24.99,
    currency: 'USD',
    url: 'https://example.com/olive-oil',
    brand: 'Mediterranean Gold',
    category: 'Food & Beverages',
    inStock: true,
    rating: 4.8,
    reviewCount: 234,
    tags: ['organic', 'healthy', 'cooking'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod_2',
    title: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with active noise cancellation, 30-hour battery life, and premium sound quality.',
    price: 149.99,
    currency: 'USD',
    url: 'https://example.com/headphones',
    brand: 'SoundMax Pro',
    category: 'Electronics',
    inStock: true,
    rating: 4.5,
    reviewCount: 892,
    tags: ['wireless', 'bluetooth', 'noise-cancellation'],
    specifications: {
      'Battery Life': '30 hours',
      'Connectivity': 'Bluetooth 5.0',
      'Weight': '250g'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod_3',
    title: 'Yoga Mat - Eco Friendly',
    description: 'Non-slip eco-friendly yoga mat made from natural rubber. Perfect for yoga, pilates, and general fitness.',
    price: 39.99,
    currency: 'USD',
    url: 'https://example.com/yoga-mat',
    brand: 'ZenFit',
    category: 'Sports & Fitness',
    inStock: true,
    rating: 4.7,
    reviewCount: 456,
    tags: ['yoga', 'eco-friendly', 'fitness'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function testEmbeddingGeneration() {
  console.log('='.repeat(60));
  console.log('Product Embedding Generation Test');
  console.log('='.repeat(60));
  console.log();

  // Create embedding generator
  const generator = new ProductEmbeddingGenerator({
    batchSize: 3,
    maxRetries: 3,
    cacheEnabled: true
  });

  // Test 1: Generate single product embedding
  console.log('Test 1: Generate Single Product Embedding');
  console.log('-'.repeat(60));
  try {
    const product = sampleProducts[0];
    console.log(`Product: ${product.title}`);
    console.log(`Category: ${product.category}`);
    console.log();

    const productVector = await generator.generateProductEmbedding(product);

    console.log('✓ Embedding generated successfully!');
    console.log(`  - Vector ID: ${productVector.id}`);
    console.log(`  - Vector dimensions: ${productVector.vector.length}`);
    console.log(`  - First 10 values: [${productVector.vector.slice(0, 10).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log(`  - Metadata: ${JSON.stringify(productVector.metadata, null, 2)}`);
    console.log();
  } catch (error) {
    console.error('✗ Failed to generate embedding:', error);
    console.log();
  }

  // Test 2: Batch generate embeddings
  console.log('Test 2: Batch Generate Embeddings');
  console.log('-'.repeat(60));
  try {
    console.log(`Processing ${sampleProducts.length} products in batch...`);
    console.log();

    const results = await generator.batchGenerateEmbeddings(sampleProducts);

    console.log('✓ Batch processing complete!');
    console.log();

    // Display results
    results.forEach((result, index) => {
      const product = sampleProducts.find(p => p.id === result.productId);
      console.log(`[${index + 1}] ${product?.title || result.productId}`);
      console.log(`    Status: ${result.success ? '✓ Success' : '✗ Failed'}`);
      if (result.success) {
        console.log(`    Vector dimensions: ${result.vector?.length || 0}`);
        console.log(`    Cached: ${result.cached ? 'Yes' : 'No'}`);
        console.log(`    Processing time: ${result.processingTime}ms`);
      } else {
        console.log(`    Error: ${result.error}`);
      }
      console.log();
    });

    // Display statistics
    const stats = generator.getStats();
    console.log('Statistics:');
    console.log('-'.repeat(60));
    console.log(`  Total generated: ${stats.totalGenerated}`);
    console.log(`  Total cached: ${stats.totalCached}`);
    console.log(`  Total failed: ${stats.totalFailed}`);
    console.log(`  Average time: ${stats.averageTime.toFixed(2)}ms`);
    console.log(`  Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`);
    console.log(`  Vector dimensions: ${stats.vectorDimensions}`);
    console.log(`  Cache size: ${generator.getCacheSize()} entries`);
    console.log();
  } catch (error) {
    console.error('✗ Batch processing failed:', error);
    console.log();
  }

  // Test 3: Test caching
  console.log('Test 3: Test Caching Behavior');
  console.log('-'.repeat(60));
  try {
    const product = sampleProducts[0];
    console.log('Generating embedding for same product again (should use cache)...');
    console.log();

    const startTime = Date.now();
    const productVector = await generator.generateProductEmbedding(product);
    const endTime = Date.now();

    console.log('✓ Embedding retrieved successfully!');
    console.log(`  Processing time: ${endTime - startTime}ms (cached should be faster)`);
    console.log();

    const stats = generator.getStats();
    console.log(`  Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`);
    console.log();
  } catch (error) {
    console.error('✗ Cache test failed:', error);
    console.log();
  }

  console.log('='.repeat(60));
  console.log('All tests completed!');
  console.log('='.repeat(60));
}

// Run tests
testEmbeddingGeneration().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
