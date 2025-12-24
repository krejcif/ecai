/**
 * Ruvector Semantic Search Demo
 * Demonstrates indexing and searching products using the semantic search API
 */

import { ProductIndexer, SemanticSearchEngine } from '../src/ruvector';

// Sample products to index
const sampleProducts = [
  {
    id: 'prod-001',
    name: 'Organic Almonds',
    description: 'Premium quality organic raw almonds, rich in protein and healthy fats',
    category: 'Nuts & Seeds',
    price: 12.99,
    source: 'open-food-facts'
  },
  {
    id: 'prod-002',
    name: 'Green Tea',
    description: 'Authentic Japanese green tea with antioxidants, perfect for daily wellness',
    category: 'Beverages',
    price: 8.50,
    source: 'open-food-facts'
  },
  {
    id: 'prod-003',
    name: 'Dark Chocolate Bar',
    description: '70% cocoa dark chocolate, vegan and gluten-free',
    category: 'Confectionery',
    price: 4.99,
    source: 'open-food-facts'
  },
  {
    id: 'prod-004',
    name: 'Cashew Nuts',
    description: 'Roasted cashews with sea salt, perfect snack with protein',
    category: 'Nuts & Seeds',
    price: 10.99,
    source: 'open-food-facts'
  },
  {
    id: 'prod-005',
    name: 'Herbal Tea Collection',
    description: 'Variety pack of organic herbal teas including chamomile and peppermint',
    category: 'Beverages',
    price: 14.99,
    source: 'open-food-facts'
  },
  {
    id: 'prod-006',
    name: 'Milk Chocolate',
    description: 'Creamy milk chocolate with 35% cocoa, smooth and sweet',
    category: 'Confectionery',
    price: 3.99,
    source: 'open-food-facts'
  },
  {
    id: 'prod-007',
    name: 'Protein Energy Bar',
    description: 'High protein bar with nuts, chocolate and natural sweeteners',
    category: 'Snacks',
    price: 2.50,
    source: 'open-food-facts'
  },
  {
    id: 'prod-008',
    name: 'Oolong Tea',
    description: 'Traditional Chinese oolong tea with floral notes and antioxidants',
    category: 'Beverages',
    price: 11.99,
    source: 'open-food-facts'
  }
];

async function main() {
  console.log('='.repeat(80));
  console.log('Ruvector Semantic Search Demo');
  console.log('='.repeat(80));
  console.log();

  // Initialize indexer and search engine
  const indexer = new ProductIndexer();
  const searchEngine = new SemanticSearchEngine();

  // Step 1: Index products
  console.log('Step 1: Indexing Products');
  console.log('-'.repeat(80));
  
  const indexResult = await indexer.bulkIndex(sampleProducts);
  
  console.log('\nIndexing Summary:');
  console.log('  Total: ' + indexResult.total);
  console.log('  Successful: ' + indexResult.successful);
  console.log('  Failed: ' + indexResult.failed);
  console.log('  Duration: ' + (indexResult.duration / 1000).toFixed(2) + 's');
  console.log();

  // Wait a moment for indexing to complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Semantic Search
  console.log('Step 2: Semantic Search');
  console.log('-'.repeat(80));
  
  const searchQueries = [
    'healthy snack with protein',
    'antioxidant beverages',
    'chocolate dessert'
  ];

  for (const query of searchQueries) {
    console.log('\nQuery: "' + query + '"');
    console.log('-'.repeat(40));
    
    const results = await searchEngine.searchProducts(query, 3);
    
    if (results.length === 0) {
      console.log('  No results found');
    } else {
      results.forEach((result, idx) => {
        console.log('  ' + (idx + 1) + '. ' + result.document.name + ' (Score: ' + result.score.toFixed(4) + ')');
        console.log('     Category: ' + result.document.category);
        console.log('     Price: $' + result.document.price);
        console.log('     Description: ' + result.document.description);
      });
    }
  }
  console.log();

  // Step 3: Find Similar Products
  console.log('Step 3: Find Similar Products');
  console.log('-'.repeat(80));
  
  const referenceProduct = 'prod-001'; // Organic Almonds
  const refProd = sampleProducts.find(p => p.id === referenceProduct);
  console.log('\nFinding products similar to: ' + (refProd ? refProd.name : ''));
  console.log('-'.repeat(40));
  
  const similarResults = await searchEngine.findSimilar(referenceProduct, 3);
  
  if (similarResults.length === 0) {
    console.log('  No similar products found');
  } else {
    similarResults.forEach((result, idx) => {
      console.log('  ' + (idx + 1) + '. ' + result.document.name + ' (Score: ' + result.score.toFixed(4) + ')');
      console.log('     Category: ' + result.document.category);
      console.log('     Price: $' + result.document.price);
    });
  }
  console.log();

  // Step 4: Hybrid Search with Filters
  console.log('Step 4: Hybrid Search with Filters');
  console.log('-'.repeat(80));
  
  console.log('\nQuery: "healthy drink" with category filter: "Beverages"');
  console.log('-'.repeat(40));
  
  const hybridResults = await searchEngine.hybridSearch('healthy drink', {
    limit: 5,
    filters: {
      category: 'Beverages'
    }
  });
  
  if (hybridResults.length === 0) {
    console.log('  No results found');
  } else {
    hybridResults.forEach((result, idx) => {
      console.log('  ' + (idx + 1) + '. ' + result.document.name + ' (Score: ' + result.score.toFixed(4) + ')');
      console.log('     Category: ' + result.document.category);
      console.log('     Price: $' + result.document.price);
      console.log('     Match Type: ' + result.matchType);
    });
  }
  console.log();

  // Step 5: Price Range Filter
  console.log('\nQuery: "nuts" with price range: $5-$12');
  console.log('-'.repeat(40));
  
  const priceFilterResults = await searchEngine.hybridSearch('nuts', {
    limit: 5,
    filters: {
      priceMin: 5,
      priceMax: 12
    }
  });
  
  if (priceFilterResults.length === 0) {
    console.log('  No results found');
  } else {
    priceFilterResults.forEach((result, idx) => {
      console.log('  ' + (idx + 1) + '. ' + result.document.name + ' (Score: ' + result.score.toFixed(4) + ')');
      console.log('     Category: ' + result.document.category);
      console.log('     Price: $' + result.document.price);
    });
  }
  console.log();

  // Step 6: Update Index
  console.log('Step 5: Update Index');
  console.log('-'.repeat(80));
  
  console.log('\nUpdating product: ' + sampleProducts[0].name);
  
  const updateResult = await indexer.updateIndex('prod-001', {
    price: 13.99,
    description: 'Premium quality organic raw almonds, rich in protein, fiber and healthy fats. Now with better packaging!'
  });
  
  console.log('Update result: ' + (updateResult.success ? 'Success' : 'Failed'));
  if (updateResult.error) {
    console.log('Error: ' + updateResult.error);
  }
  console.log();

  // Step 7: Statistics
  console.log('Step 6: Collection Statistics');
  console.log('-'.repeat(80));
  
  const stats = await searchEngine.getStats();
  console.log('\nCollection: ' + stats.collectionName);
  console.log('Total Documents: ' + stats.totalDocuments);
  console.log('Vector Dimension: ' + stats.dimension);
  console.log();

  console.log('='.repeat(80));
  console.log('Demo Complete!');
  console.log('='.repeat(80));
}

// Run the demo
main().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
