/**
 * Simple Semantic Router Test
 *
 * A minimal test to verify the semantic router functionality
 */

import { SemanticRouter } from '../src/ruvector/router';
import { EmbeddingService } from '../src/database/embeddings';

async function main() {
  console.log('\n=== Semantic Router Test ===\n');

  // Create router
  const embeddingService = new EmbeddingService();
  const router = new SemanticRouter({
    embeddingService,
    confidenceThreshold: 0.6,
  });

  console.log('Defining routes...');

  // Define routes with handlers
  await router.defineRoute(
    'product_search',
    [
      'find products',
      'search for items',
      'show me products',
      'looking for',
    ],
    async (query: string) => {
      return { action: 'search', query };
    }
  );

  await router.defineRoute(
    'price_check',
    [
      'what is the price',
      'how much does it cost',
      'check price',
      'cost of',
    ],
    async (query: string) => {
      return { action: 'price', query };
    }
  );

  await router.defineRoute(
    'recommendation',
    [
      'recommend me something',
      'suggest products',
      'what should I buy',
      'similar to',
    ],
    async (query: string) => {
      return { action: 'recommend', query };
    }
  );

  console.log('\nTesting queries...\n');

  // Test queries
  const queries = [
    'find wireless headphones',
    'how much does iPhone cost?',
    'recommend similar laptops',
    'search for gaming mice',
    'what is the price of AirPods',
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);

    const match = await router.findBestMatch(query);

    if (match) {
      console.log(`  ✓ Route: ${match.route.name}`);
      console.log(`  Score: ${match.score.toFixed(3)}`);
      console.log(`  Confidence: ${match.confidence}`);
      console.log(`  Matched: "${match.matchedUtterance}"`);

      const result = await router.route(query);
      console.log(`  Result: ${JSON.stringify(result)}`);
    } else {
      console.log(`  ✗ No match found`);
    }
    console.log();
  }

  // Show stats
  console.log('Router Stats:');
  const stats = router.getStats();
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n✓ Test completed!\n');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
