/**
 * Simple test for product categorization system
 */

import { ProductCategorizer, Product, Category } from './src/ruvector/index';

async function testCategorization() {
  console.log('Testing Product Categorization System...\n');

  try {
    // Create categorizer with default categories
    console.log('1. Creating categorizer with default categories...');
    const categorizer = await ProductCategorizer.createWithDefaultCategories();
    console.log('   ✓ Categorizer created\n');

    // Test product
    const product: Product = {
      id: 'test1',
      name: 'iPhone 14 Pro',
      description: 'Latest Apple smartphone with advanced camera'
    };

    console.log('2. Categorizing product:', product.name);
    const result = await categorizer.categorizeProduct(product);
    console.log('   Suggested Category:', result.suggestedCategory);
    console.log('   Confidence:', result.confidence);
    console.log('   Score:', (result.score * 100).toFixed(1) + '%');
    console.log('   ✓ Categorization successful\n');

    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testCategorization();
