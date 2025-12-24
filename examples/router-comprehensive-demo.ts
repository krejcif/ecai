/**
 * Comprehensive Semantic Router Demo
 *
 * Shows all features of the semantic router including:
 * - Query routing with different intents
 * - Confidence scoring
 * - Analytics tracking
 * - Custom route definitions
 * - Edge case handling
 */

import { SemanticRouter, QueryHandler } from '../src/ruvector';
import { VectorStore } from '../src/database/vector-store';
import { EmbeddingService } from '../src/database/embeddings';
import chalk from 'chalk';

async function demonstrateBasicRouting() {
  console.log(chalk.bold.cyan('\n📍 Part 1: Basic Routing\n'));

  const embeddingService = new EmbeddingService();
  const router = new SemanticRouter({ embeddingService });

  // Define simple routes
  await router.defineRoute(
    'greeting',
    ['hello', 'hi', 'hey', 'good morning'],
    async (query: string) => ({ message: 'Hello! How can I help you?' })
  );

  await router.defineRoute(
    'goodbye',
    ['bye', 'goodbye', 'see you', 'farewell'],
    async (query: string) => ({ message: 'Goodbye! Have a great day!' })
  );

  const testQueries = ['hello there', 'goodbye friend', 'hey how are you'];

  for (const query of testQueries) {
    const result = await router.route(query);
    console.log(chalk.cyan(`Query: "${query}"`));
    console.log(chalk.green(`Response: ${result.message}\n`));
  }
}

async function demonstrateConfidenceScoring() {
  console.log(chalk.bold.cyan('\n📊 Part 2: Confidence Scoring\n'));

  const embeddingService = new EmbeddingService();
  const router = new SemanticRouter({
    embeddingService,
    confidenceThreshold: 0.6,
  });

  await router.defineRoute(
    'tech_support',
    ['my device is broken', 'need help with technical issue', 'something is not working'],
    async (query: string) => ({ department: 'tech_support', query })
  );

  const queries = [
    'my phone is not working',  // High confidence
    'device problem',           // Medium confidence
    'hello technical person',   // Low confidence
  ];

  for (const query of queries) {
    const match = await router.findBestMatch(query);
    if (match) {
      console.log(chalk.cyan(`Query: "${query}"`));
      console.log(chalk.white(`  Score: ${match.score.toFixed(3)}`));
      console.log(chalk.white(`  Confidence: ${match.confidence}`));
      console.log(chalk.gray(`  Matched: "${match.matchedUtterance}"\n`));
    } else {
      console.log(chalk.red(`Query: "${query}" - No match\n`));
    }
  }
}

async function demonstrateEcommerceRouting() {
  console.log(chalk.bold.cyan('\n🛒 Part 3: E-commerce Query Routing\n'));

  const vectorStore = new VectorStore();
  await vectorStore.initCollection('products');

  const handler = await QueryHandler.create({
    vectorStore,
    enableAnalytics: true,
  });

  const queries = [
    { query: 'find affordable laptops', expectedIntent: 'product_search' },
    { query: 'what does the MacBook cost?', expectedIntent: 'price_check' },
    { query: 'suggest alternatives to this phone', expectedIntent: 'recommendation' },
    { query: 'what is trending in electronics?', expectedIntent: 'trend_analysis' },
    { query: 'show me product categories', expectedIntent: 'category_browse' },
  ];

  console.log(chalk.white('Testing query routing:\n'));

  for (const { query, expectedIntent } of queries) {
    try {
      const result = await handler.handleQuery(query);

      const match = result.intent === expectedIntent ? '✓' : '✗';
      const color = result.intent === expectedIntent ? 'green' : 'yellow';

      console.log(chalk.cyan(`Query: "${query}"`));
      console.log(
        chalk[color](
          `  ${match} Routed to: ${result.intent} ` +
          `(expected: ${expectedIntent}, ${result.confidence}, ${result.score.toFixed(3)})`
        )
      );
      console.log();
    } catch (error: any) {
      console.log(chalk.red(`  Error: ${error.message}\n`));
    }
  }

  // Show analytics
  console.log(chalk.bold.yellow('Analytics:\n'));
  const analytics = handler.getAnalytics();
  console.log(chalk.white(`  Total queries: ${analytics.queryCount}`));
  console.log(chalk.white(`  Avg confidence: ${(analytics.avgConfidence * 100).toFixed(1)}%`));
  console.log(chalk.white(`  Avg execution time: ${analytics.avgExecutionTime.toFixed(1)}ms`));
}

async function demonstrateAnalysisMode() {
  console.log(chalk.bold.cyan('\n🔍 Part 4: Query Analysis Mode\n'));

  const vectorStore = new VectorStore();
  await vectorStore.initCollection('products');

  const handler = await QueryHandler.create({ vectorStore });

  const ambiguousQueries = [
    'expensive products',
    'show me something good',
    'trending prices',
  ];

  console.log(chalk.white('Analyzing ambiguous queries:\n'));

  for (const query of ambiguousQueries) {
    const analysis = await handler.analyzeQuery(query);

    console.log(chalk.cyan(`Query: "${query}"`));
    console.log(chalk.white('  Top 3 matches:'));

    for (const match of analysis.matches.slice(0, 3)) {
      const color = match.confidence === 'high' ? 'green' :
                   match.confidence === 'medium' ? 'yellow' : 'red';

      console.log(
        chalk.gray(`    ${match.intent.padEnd(20)} `) +
        chalk[color](`${match.score.toFixed(3)} (${match.confidence})`)
      );
    }
    console.log();
  }
}

async function demonstrateCustomRoutes() {
  console.log(chalk.bold.cyan('\n⚙️  Part 5: Custom Route Definitions\n'));

  const embeddingService = new EmbeddingService();
  const router = new SemanticRouter({ embeddingService });

  // Define custom business logic routes
  await router.defineRoute(
    'inventory_check',
    ['do you have', 'is this in stock', 'check availability', 'inventory status'],
    async (query: string) => {
      return {
        action: 'inventory_check',
        message: 'Checking inventory...',
        query,
      };
    },
    { priority: 'high', category: 'operations' }
  );

  await router.defineRoute(
    'shipping_inquiry',
    ['when will it arrive', 'shipping time', 'delivery estimate', 'how long to ship'],
    async (query: string) => {
      return {
        action: 'shipping_inquiry',
        message: 'Calculating shipping time...',
        query,
      };
    },
    { priority: 'medium', category: 'logistics' }
  );

  const queries = [
    'do you have this in stock?',
    'when will my order arrive?',
  ];

  for (const query of queries) {
    console.log(chalk.cyan(`Query: "${query}"`));
    const result = await router.route(query);
    console.log(chalk.green(`  Action: ${result.action}`));
    console.log(chalk.white(`  ${result.message}\n`));
  }

  // Export routes
  const exportPath = '/tmp/routes.json';
  await router.exportRoutes(exportPath);
  console.log(chalk.gray(`Routes exported to ${exportPath}\n`));
}

async function demonstratePerformance() {
  console.log(chalk.bold.cyan('\n⚡ Part 6: Performance & Caching\n'));

  const embeddingService = new EmbeddingService();
  const router = new SemanticRouter({
    embeddingService,
    enableCache: true,
  });

  await router.defineRoute(
    'test_route',
    ['test query', 'sample query'],
    async (query: string) => ({ result: 'success' })
  );

  const query = 'this is a test query';

  // First call (uncached)
  console.log(chalk.white('First call (uncached):'));
  const start1 = Date.now();
  await router.route(query);
  const time1 = Date.now() - start1;
  console.log(chalk.yellow(`  Time: ${time1}ms\n`));

  // Second call (cached)
  console.log(chalk.white('Second call (cached):'));
  const start2 = Date.now();
  await router.route(query);
  const time2 = Date.now() - start2;
  console.log(chalk.yellow(`  Time: ${time2}ms\n`));

  const speedup = ((time1 - time2) / time1 * 100).toFixed(1);
  console.log(chalk.green(`Cache speedup: ${speedup}%\n`));

  // Show stats
  const stats = router.getStats();
  console.log(chalk.white('Router Statistics:'));
  console.log(chalk.gray(`  Total routes: ${stats.totalRoutes}`));
  console.log(chalk.gray(`  Cache size: ${stats.cacheSize}`));
}

async function main() {
  console.log(chalk.bold.magenta('\n' + '='.repeat(60)));
  console.log(chalk.bold.magenta('    Semantic Router - Comprehensive Demo'));
  console.log(chalk.bold.magenta('='.repeat(60)));

  try {
    await demonstrateBasicRouting();
    await demonstrateConfidenceScoring();
    await demonstrateEcommerceRouting();
    await demonstrateAnalysisMode();
    await demonstrateCustomRoutes();
    await demonstratePerformance();

    console.log(chalk.bold.green('\n✓ All demonstrations completed successfully!\n'));
  } catch (error: any) {
    console.error(chalk.red('\n✗ Error:'), error.message);
    process.exit(1);
  }
}

// Run all demonstrations
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
