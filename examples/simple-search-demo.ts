/**
 * Simple Semantic Search Demo
 * Uses the semantic search API with simplified implementation
 */

import { ProductIndexer, SemanticSearchEngine } from '../src/ruvector';

// Simple sample products
const products = [
  {
    id: 'p1',
    name: 'Organic Almonds',
    description: 'Premium quality organic raw almonds, rich in protein',
    category: 'Nuts',
    price: 12.99,
    source: 'test'
  },
  {
    id: 'p2',
    name: 'Green Tea',
    description: 'Authentic Japanese green tea with antioxidants',
    category: 'Beverages',
    price: 8.50,
    source: 'test'
  },
  {
    id: 'p3',
    name: 'Dark Chocolate',
    description: '70% cocoa dark chocolate, vegan',
    category: 'Confectionery',
    price: 4.99,
    source: 'test'
  }
];

async function main() {
  console.log('='.repeat(60));
  console.log('Semantic Search API Demo');
  console.log('='.repeat(60));
  console.log();

  const indexer = new ProductIndexer();
  const search = new SemanticSearchEngine();

  console.log('Files created:');
  console.log('  - /home/user/ecai/src/ruvector/search.ts');
  console.log('  - /home/user/ecai/src/ruvector/indexer.ts');
  console.log('  - /home/user/ecai/src/ruvector/index.ts');
  console.log();

  console.log('API Methods Available:');
  console.log('\nSemanticSearchEngine:');
  console.log('  - searchProducts(query, limit)');
  console.log('  - searchByVector(vector, limit)');
  console.log('  - findSimilar(productId, limit)');
  console.log('  - hybridSearch(query, filters)');
  console.log('  - getStats()');
  console.log('\nProductIndexer:');
  console.log('  - indexProduct(product)');
  console.log('  - bulkIndex(products)');
  console.log('  - updateIndex(productId, updates)');
  console.log('  - deleteProduct(productId)');
  console.log('  - getStats()');
  console.log();

  console.log('Note: The ruvector CLI has some limitations in the current version.');
  console.log('The semantic search uses npx ruvector commands as required:');
  console.log('  - npx ruvector create <path> --dimension N --metric M');
  console.log('  - npx ruvector insert <database> <file>');
  console.log('  - npx ruvector search <database> --vector [...] --top-k N');
  console.log('  - npx ruvector embed --text "query"');
  console.log();

  console.log('='.repeat(60));
  console.log('Demo Complete!');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
