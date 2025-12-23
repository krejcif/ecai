/**
 * Example: Using the Data Pipeline System
 *
 * This example demonstrates how to use the ingestion pipeline
 * to fetch, transform, and store product data.
 */

import {
  IngestionManager,
  IngestionConfig,
  ScheduleConfig,
  ScheduleIntervals,
  CronExpressions,
} from '../src/pipeline';
import { OpenFoodFactsConnector } from '../src/connectors/open-food-facts';
import { VectorStore } from '../src/database/vector-store';
import { CollectionName } from '../src/database/collections';

async function basicIngestionExample() {
  console.log('=== Basic Ingestion Example ===\n');

  // Initialize vector store
  const vectorStore = new VectorStore('./data/vector-store');
  await vectorStore.initialize();

  // Create ingestion manager
  const manager = new IngestionManager(vectorStore);

  // Set up event listeners
  manager.on('job-started', ({ jobId, source }) => {
    console.log(`✓ Job ${jobId} started from ${source}`);
  });

  manager.on('job-progress', ({ jobId, phase, count, progress }) => {
    if (progress) {
      console.log(
        `  ${phase}: ${progress.processed}/${progress.total} ` +
        `(${progress.percentage.toFixed(1)}%)`
      );
    } else if (count !== undefined) {
      console.log(`  ${phase}: ${count} items`);
    }
  });

  manager.on('job-completed', (result) => {
    console.log(`✓ Job completed successfully!`);
    console.log(`  Fetched: ${result.stats.fetched}`);
    console.log(`  Transformed: ${result.stats.transformed}`);
    console.log(`  Stored: ${result.stats.stored}`);
    console.log(`  Failed: ${result.stats.failed}`);
    console.log(`  Duration: ${(result.stats.duration / 1000).toFixed(2)}s\n`);
  });

  manager.on('job-failed', ({ jobId, error }) => {
    console.error(`✗ Job ${jobId} failed:`, error.message);
  });

  // Configure ingestion
  const config: IngestionConfig = {
    source: 'open-food-facts',
    connector: new OpenFoodFactsConnector(),
    dataType: 'product',
    collection: CollectionName.PRODUCTS,
    batchSize: 50,
    concurrency: 3,
    retryAttempts: 3,
  };

  // Ingest products from the "beverages" category
  const result = await manager.ingest(config, {
    categories: 'beverages',
    page: 1,
    page_size: 100,
  });

  // Display statistics
  const stats = manager.getStats();
  console.log('=== Pipeline Statistics ===');
  console.log(`Total Jobs: ${stats.totalJobs}`);
  console.log(`Completed: ${stats.completedJobs}`);
  console.log(`Total Items Stored: ${stats.totalStored}`);
  console.log(`Transformer Stats:`, stats.transformerStats);
}

async function scheduledIngestionExample() {
  console.log('\n=== Scheduled Ingestion Example ===\n');

  const vectorStore = new VectorStore('./data/vector-store');
  await vectorStore.initialize();

  const manager = new IngestionManager(vectorStore);

  // Set up scheduler event listeners
  const scheduler = manager.getScheduler();

  scheduler.on('task-start', (config) => {
    console.log(`⏰ Scheduled task started: ${config.name}`);
  });

  scheduler.on('task-complete', ({ config, duration }) => {
    console.log(
      `✓ Task "${config.name}" completed in ${(duration / 1000).toFixed(2)}s`
    );
  });

  scheduler.on('task-failed', ({ config, error, retryCount }) => {
    console.error(
      `✗ Task "${config.name}" failed (retry ${retryCount}):`,
      error.message
    );
  });

  scheduler.on('task-retry', ({ config, attempt, nextAttempt }) => {
    console.log(
      `↻ Task "${config.name}" will retry (attempt ${attempt}) at ${nextAttempt}`
    );
  });

  // Configure scheduled ingestion
  const ingestionConfig: IngestionConfig = {
    source: 'open-food-facts',
    connector: new OpenFoodFactsConnector(),
    dataType: 'product',
    collection: CollectionName.PRODUCTS,
    batchSize: 50,
    concurrency: 3,
  };

  // Schedule 1: Every 15 minutes for beverages
  const schedule1: ScheduleConfig = {
    id: 'beverages-15min',
    name: 'Beverages Update (15 min)',
    interval: ScheduleIntervals.EVERY_15_MINUTES,
    source: 'open-food-facts',
    priority: 10,
    enabled: true,
    maxRetries: 3,
    metadata: {
      ingestionConfig,
      params: { categories: 'beverages', page_size: 50 },
    },
  };

  // Schedule 2: Daily at midnight for all products
  const schedule2: ScheduleConfig = {
    id: 'daily-full-sync',
    name: 'Daily Full Sync',
    cron: CronExpressions.DAILY_MIDNIGHT,
    source: 'open-food-facts',
    priority: 5,
    enabled: true,
    maxRetries: 5,
    metadata: {
      ingestionConfig,
      params: { page_size: 100 },
    },
  };

  // Add schedules
  manager.scheduleIngestion(schedule1);
  manager.scheduleIngestion(schedule2);

  // Start scheduler
  manager.startScheduler();

  console.log('Scheduler started with the following schedules:');
  const schedules = scheduler.getSchedules();
  schedules.forEach((task) => {
    console.log(`  - ${task.config.name}`);
    console.log(`    Next run: ${task.nextRun.toLocaleString()}`);
    console.log(`    Priority: ${task.config.priority}`);
    console.log(`    Status: ${task.config.enabled ? 'Enabled' : 'Disabled'}`);
  });

  // Get scheduler statistics
  const stats = scheduler.getStats();
  console.log('\n=== Scheduler Statistics ===');
  console.log(`Total Tasks: ${stats.totalTasks}`);
  console.log(`Queued Tasks: ${stats.queuedTasks}`);
  console.log(`Active Tasks: ${stats.activeTasks}`);
  if (stats.nextScheduledTask) {
    console.log(`Next Task: ${stats.nextScheduledTask.name}`);
    console.log(`Scheduled Time: ${stats.nextScheduledTask.scheduledTime}`);
  }

  // Keep running for demo purposes (in production, this would run indefinitely)
  console.log('\nScheduler is now running. Press Ctrl+C to stop.\n');

  // Simulate running for a while
  await new Promise((resolve) => setTimeout(resolve, 60000)); // Run for 1 minute

  // Stop scheduler
  manager.stopScheduler();
  console.log('\nScheduler stopped.');
}

async function customEnrichmentExample() {
  console.log('\n=== Custom Enrichment Example ===\n');

  const vectorStore = new VectorStore('./data/vector-store');
  await vectorStore.initialize();

  const manager = new IngestionManager(vectorStore);

  // Register custom enrichment hooks
  manager.registerEnrichmentHook('product', async (product, context) => {
    console.log(`  Enriching product: ${product.name}`);

    // Add custom metadata
    product.metadata = {
      ...product.metadata,
      enrichedAt: context.timestamp.toISOString(),
      enrichmentVersion: '1.0',
      sourceQuality: calculateQualityScore(product),
    };

    // Add computed fields
    if (product.price > 100) {
      product.metadata.priceCategory = 'premium';
    } else if (product.price > 50) {
      product.metadata.priceCategory = 'mid-range';
    } else {
      product.metadata.priceCategory = 'budget';
    }

    return product;
  });

  // Configure and run ingestion
  const config: IngestionConfig = {
    source: 'open-food-facts',
    connector: new OpenFoodFactsConnector(),
    dataType: 'product',
    collection: CollectionName.PRODUCTS,
    batchSize: 20,
    concurrency: 2,
  };

  const result = await manager.ingest(config, {
    categories: 'snacks',
    page_size: 50,
  });

  console.log(`\nEnriched and stored ${result.stats.stored} products`);
}

function calculateQualityScore(product: any): number {
  let score = 0;

  if (product.name) score += 20;
  if (product.description) score += 20;
  if (product.category) score += 20;
  if (product.price > 0) score += 20;
  if (product.metadata?.brand) score += 10;
  if (product.metadata?.imageUrl) score += 10;

  return score;
}

async function batchProcessingExample() {
  console.log('\n=== Batch Processing Example ===\n');

  const vectorStore = new VectorStore('./data/vector-store');
  await vectorStore.initialize();

  const manager = new IngestionManager(vectorStore);

  // Listen to detailed progress
  manager.on('job-progress', ({ jobId, phase, progress }) => {
    if (progress && progress.percentage > 0) {
      const eta = progress.estimatedTimeRemaining
        ? `ETA: ${(progress.estimatedTimeRemaining / 1000).toFixed(0)}s`
        : '';
      console.log(
        `  Batch ${progress.currentBatch}/${progress.totalBatches} - ` +
        `${progress.percentage.toFixed(1)}% ${eta}`
      );
    }
  });

  // Fetch data first
  const connector = new OpenFoodFactsConnector();
  const data = await connector.fetch({
    categories: 'dairy',
    page: 1,
    page_size: 200,
  });

  console.log(`Fetched ${data.products.length} products`);
  console.log('Starting batch processing...\n');

  // Process in batches
  const config: IngestionConfig = {
    source: 'open-food-facts',
    connector,
    dataType: 'product',
    collection: CollectionName.PRODUCTS,
    batchSize: 25,
    concurrency: 5,
    retryAttempts: 3,
  };

  const result = await manager.ingestBatch(config, data.products);

  console.log('\n=== Batch Processing Results ===');
  console.log(`Total Items: ${result.stats.fetched}`);
  console.log(`Successfully Processed: ${result.stats.transformed}`);
  console.log(`Stored: ${result.stats.stored}`);
  console.log(`Failed: ${result.stats.failed}`);
  console.log(`Duration: ${(result.stats.duration / 1000).toFixed(2)}s`);

  if (result.errors && result.errors.length > 0) {
    console.log('\nSample Errors:');
    result.errors.slice(0, 5).forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.error.message}`);
    });
  }
}

// Run examples
async function main() {
  try {
    // Run one example at a time (uncomment the one you want to try)

    await basicIngestionExample();
    // await scheduledIngestionExample();
    // await customEnrichmentExample();
    // await batchProcessingExample();

    console.log('\n✓ Example completed successfully!');
  } catch (error) {
    console.error('\n✗ Example failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export {
  basicIngestionExample,
  scheduledIngestionExample,
  customEnrichmentExample,
  batchProcessingExample,
};
