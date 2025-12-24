/**
 * Semantic Router Demo
 *
 * Demonstrates the semantic routing capabilities for intelligent query handling
 */

import { SemanticRouter, QueryHandler } from '../src/ruvector';
import { VectorStore } from '../src/database/vector-store';
import { EmbeddingService } from '../src/database/embeddings';
import chalk from 'chalk';

async function main() {
  console.log(chalk.bold.cyan('\n🎯 Semantic Router Demo\n'));
  console.log(chalk.gray('Intelligent query routing using vector similarity\n'));

  // Initialize services
  console.log(chalk.yellow('Initializing services...'));
  const embeddingService = new EmbeddingService();
  const vectorStore = new VectorStore();
  await vectorStore.initCollection('products');

  // Create query handler
  console.log(chalk.yellow('Creating query handler...\n'));
  const handler = await QueryHandler.create({
    vectorStore,
    embeddingService,
    enableAnalytics: true,
  });

  // Test queries
  const testQueries = [
    'find wireless headphones under $100',
    'what is the price of Samsung Galaxy S21?',
    'recommend products similar to iPhone 13',
    'show me trending electronics',
    'browse smartphone categories',
    'search for gaming laptops',
    'how much does iPad cost',
    'what products are popular right now',
    'suggest alternatives to AirPods',
    'explore available categories',
  ];

  console.log(chalk.bold.green('Testing semantic routing:\n'));

  for (const query of testQueries) {
    console.log(chalk.cyan(`Query: "${query}"`));

    try {
      // Analyze query (show all route matches)
      const analysis = await handler.analyzeQuery(query);

      console.log(chalk.gray('  Route matches:'));
      for (const match of analysis.matches.slice(0, 3)) {
        const color = match.confidence === 'high' ? 'green' :
                     match.confidence === 'medium' ? 'yellow' : 'red';
        console.log(
          chalk.gray(`    ${match.intent.padEnd(20)} `) +
          chalk[color](`${match.score.toFixed(3)} (${match.confidence})`) +
          chalk.gray(` - "${match.matchedUtterance}"`)
        );
      }

      // Handle query
      const result = await handler.handleQuery(query);

      console.log(
        chalk.bold.white(`  ✓ Routed to: `) +
        chalk.bold.green(result.intent) +
        chalk.gray(` (${result.confidence}, ${result.executionTime}ms)`)
      );

      // Show sample of results
      if (result.data.products && result.data.products.length > 0) {
        console.log(chalk.gray(`    Found ${result.data.total} products`));
      } else if (result.data.recommendations && result.data.recommendations.length > 0) {
        console.log(chalk.gray(`    ${result.data.recommendations.length} recommendations`));
      } else if (result.data.categories) {
        console.log(chalk.gray(`    ${result.data.total} categories`));
      }

      console.log();
    } catch (error: any) {
      console.log(chalk.red(`  ✗ Error: ${error.message}\n`));
    }
  }

  // Show analytics
  console.log(chalk.bold.yellow('\n📊 Analytics:\n'));
  const analytics = handler.getAnalytics();

  console.log(chalk.white(`Total Queries: ${chalk.bold(analytics.queryCount)}`));
  console.log(chalk.white(`Average Confidence: ${chalk.bold((analytics.avgConfidence * 100).toFixed(1))}%`));
  console.log(chalk.white(`Average Execution Time: ${chalk.bold(analytics.avgExecutionTime.toFixed(1))}ms`));

  console.log(chalk.white('\nIntent Distribution:'));
  for (const [intent, count] of Object.entries(analytics.intentDistribution)) {
    const percentage = ((count / analytics.queryCount) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(Number(percentage) / 5));
    console.log(
      chalk.cyan(`  ${intent.padEnd(20)}`) +
      chalk.gray(`${count.toString().padStart(3)} (${percentage}%) `) +
      chalk.green(bar)
    );
  }

  // Show router stats
  console.log(chalk.bold.yellow('\n🔧 Router Statistics:\n'));
  const stats = handler.getRouterStats();

  console.log(chalk.white(`Total Routes: ${chalk.bold(stats.totalRoutes)}`));
  console.log(chalk.white(`Total Utterances: ${chalk.bold(stats.totalUtterances)}`));
  console.log(chalk.white(`Avg Utterances per Route: ${chalk.bold(stats.avgUtterancesPerRoute.toFixed(1))}`));
  console.log(chalk.white(`Cache Size: ${chalk.bold(stats.cacheSize)}`));

  console.log(chalk.white('\nRoute Details:'));
  for (const route of stats.routes) {
    console.log(
      chalk.cyan(`  ${route.name.padEnd(20)}`) +
      chalk.gray(`${route.utterances} utterances`)
    );
  }

  // Test edge cases
  console.log(chalk.bold.yellow('\n🧪 Testing Edge Cases:\n'));

  const edgeCases = [
    'show me some stuff', // Ambiguous
    'product iPhone expensive', // Broken grammar
    'recommend price trending search', // Multiple intents
  ];

  for (const query of edgeCases) {
    console.log(chalk.cyan(`Query: "${query}"`));
    try {
      const result = await handler.handleQuery(query);
      console.log(
        chalk.white(`  Routed to: ${result.intent} `) +
        chalk.gray(`(${result.confidence}, score: ${result.score.toFixed(3)})`)
      );
    } catch (error: any) {
      console.log(chalk.red(`  No confident match found`));
    }
    console.log();
  }

  console.log(chalk.bold.green('\n✓ Demo completed!\n'));
}

// Run demo
main().catch(error => {
  console.error(chalk.red('\n✗ Error:'), error);
  process.exit(1);
});
