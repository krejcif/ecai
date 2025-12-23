# Data Pipeline & Ingestion System

A comprehensive data pipeline system for efficient data ingestion, transformation, and storage from multiple sources.

## Features

- **Multi-source Ingestion**: Orchestrate data ingestion from various connectors
- **Data Transformation**: Normalize and validate data into standard schemas
- **Batch Processing**: Process large datasets efficiently with parallel execution
- **Scheduling**: Cron-like scheduling for periodic data updates
- **Progress Tracking**: Real-time progress updates and event-driven architecture
- **Error Handling**: Automatic retries with exponential backoff
- **Memory Efficient**: Streaming support for large datasets

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     IngestionManager                        │
│  (Orchestrates the entire pipeline)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ Connectors   │ │Transform │ │BatchProcessor│
│ (Fetch Data) │ │(Validate)│ │(Parallel Ops)│
└──────────────┘ └──────────┘ └──────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ VectorStore  │
              │ (Persistence)│
              └──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │  Scheduler   │
              │ (Automation) │
              └──────────────┘
```

## Quick Start

### Basic Usage

```typescript
import {
  IngestionManager,
  IngestionConfig,
  CollectionName,
} from './pipeline';
import { OpenFoodFactsConnector } from '../connectors/open-food-facts';
import { VectorStore } from '../database/vector-store';

// Initialize components
const vectorStore = new VectorStore('./data');
await vectorStore.initialize();

const manager = new IngestionManager(vectorStore);

// Configure ingestion
const config: IngestionConfig = {
  source: 'open-food-facts',
  connector: new OpenFoodFactsConnector(),
  dataType: 'product',
  collection: CollectionName.PRODUCTS,
  batchSize: 100,
  concurrency: 5,
  retryAttempts: 3,
};

// Start ingestion
const result = await manager.ingest(config, {
  categories: 'beverages',
  page_size: 100,
});

console.log(`Ingested ${result.stats.stored} products`);
```

### Batch Processing

```typescript
import { BatchProcessor, BatchConfig } from './pipeline';

// Configure batch processor
const config: BatchConfig = {
  batchSize: 100,
  concurrency: 5,
  retryAttempts: 3,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage.toFixed(2)}%`);
  },
};

const processor = new BatchProcessor(config);

// Process items
const result = await processor.process(items, async (item) => {
  // Transform and validate each item
  return await processItem(item);
});

console.log(`Processed ${result.successful.length} items`);
console.log(`Failed ${result.failed.length} items`);
```

### Scheduled Ingestion

```typescript
import {
  IngestionManager,
  ScheduleConfig,
  ScheduleIntervals,
  CronExpressions,
} from './pipeline';

const manager = new IngestionManager(vectorStore);

// Schedule hourly ingestion
const schedule: ScheduleConfig = {
  id: 'hourly-products',
  name: 'Hourly Product Updates',
  interval: ScheduleIntervals.HOURLY,
  source: 'open-food-facts',
  priority: 10,
  enabled: true,
  metadata: {
    ingestionConfig: config,
    params: { categories: 'beverages' },
  },
};

manager.scheduleIngestion(config);
manager.startScheduler();

// Or use cron expressions
const cronSchedule: ScheduleConfig = {
  id: 'daily-midnight',
  name: 'Daily Midnight Update',
  cron: CronExpressions.DAILY_MIDNIGHT,
  source: 'open-food-facts',
  priority: 5,
  metadata: {
    ingestionConfig: config,
  },
};
```

### Data Transformation

```typescript
import { DataTransformer } from './pipeline';

const transformer = new DataTransformer();

// Register enrichment hook
transformer.registerEnrichmentHook('product', async (product, context) => {
  // Add custom enrichment logic
  product.metadata = {
    ...product.metadata,
    enrichedAt: context.timestamp,
    enrichedBy: 'custom-enricher',
  };
  return product;
});

// Transform raw data
const result = await transformer.transformProduct(rawData, 'open-food-facts');

if (result.success) {
  console.log('Transformed:', result.data);
} else {
  console.error('Errors:', result.errors);
}
```

### Event Handling

```typescript
// Listen to ingestion events
manager.on('job-started', ({ jobId, source }) => {
  console.log(`Job ${jobId} started from ${source}`);
});

manager.on('job-progress', ({ jobId, phase, progress }) => {
  console.log(`Job ${jobId} - ${phase}: ${progress?.percentage}%`);
});

manager.on('job-completed', (result) => {
  console.log(`Job completed: ${result.stats.stored} items stored`);
});

manager.on('job-failed', ({ jobId, error }) => {
  console.error(`Job ${jobId} failed:`, error);
});

// Scheduler events
manager.getScheduler().on('task-start', (config) => {
  console.log(`Task ${config.name} started`);
});

manager.getScheduler().on('task-complete', ({ config, duration }) => {
  console.log(`Task ${config.name} completed in ${duration}ms`);
});
```

### Streaming for Large Datasets

```typescript
import { BatchProcessor } from './pipeline';

const processor = new BatchProcessor({
  batchSize: 100,
  concurrency: 5,
});

// Process as a stream
for await (const result of processor.processStream(largeDataset, async (item) => {
  return await processItem(item);
})) {
  // Handle each result as it's processed
  await vectorStore.addDocument('products', result);
}
```

## API Reference

### IngestionManager

Main orchestrator for data ingestion.

**Methods:**
- `ingest(config, params)` - Start manual ingestion
- `ingestBatch(config, items)` - Batch ingestion with progress tracking
- `scheduleIngestion(config)` - Schedule periodic ingestion
- `startScheduler()` - Start the scheduler
- `stopScheduler()` - Stop the scheduler
- `getStats()` - Get ingestion statistics
- `registerEnrichmentHook(type, hook)` - Register data enrichment hook

### DataTransformer

Normalizes and validates data from different sources.

**Methods:**
- `transformProduct(data, source)` - Transform product data
- `transformReview(data, source)` - Transform review data
- `transformSupplier(data, source)` - Transform supplier data
- `transformTrend(data, source)` - Transform trend data
- `transformBatch(records, type, source)` - Batch transformation
- `registerEnrichmentHook(type, hook)` - Register enrichment hook
- `getStats()` - Get transformation statistics

### BatchProcessor

Processes data in batches with parallel execution.

**Methods:**
- `process(items, processor)` - Process items in batches
- `processStream(items, processor)` - Process as stream
- `pause()` - Pause processing
- `resume()` - Resume processing
- `abort()` - Abort processing
- `getProgress()` - Get current progress

### IngestionScheduler

Cron-like scheduling for data ingestion.

**Methods:**
- `addSchedule(config)` - Add a scheduled task
- `removeSchedule(id)` - Remove a scheduled task
- `updateSchedule(id, updates)` - Update a schedule
- `start()` - Start the scheduler
- `stop()` - Stop the scheduler
- `runNow(id)` - Run a task immediately
- `getStats()` - Get scheduler statistics

## Configuration

### IngestionConfig

```typescript
interface IngestionConfig {
  source: string;              // Source identifier
  connector: BaseConnector;    // Data connector instance
  dataType: 'product' | 'review' | 'supplier' | 'trend';
  collection: CollectionName;  // Target collection
  batchSize?: number;          // Default: 100
  concurrency?: number;        // Default: 5
  retryAttempts?: number;      // Default: 3
  schedule?: ScheduleConfig;   // Optional scheduling
}
```

### BatchConfig

```typescript
interface BatchConfig {
  batchSize: number;           // Items per batch
  concurrency: number;         // Parallel operations
  retryAttempts?: number;      // Default: 3
  retryDelay?: number;         // Default: 1000ms
  onProgress?: (progress) => void;
  onError?: (error) => void;
}
```

### ScheduleConfig

```typescript
interface ScheduleConfig {
  id: string;                  // Unique identifier
  name: string;                // Human-readable name
  cron?: string;               // Cron expression
  interval?: number;           // Interval in milliseconds
  source: string;              // Source identifier
  priority?: number;           // Higher = higher priority
  enabled?: boolean;           // Default: true
  maxRetries?: number;         // Default: 3
  timeout?: number;            // Default: 300000ms (5 min)
}
```

## Best Practices

1. **Batch Size**: Adjust based on data size and memory constraints
2. **Concurrency**: Balance between speed and resource usage
3. **Error Handling**: Always listen to error events
4. **Progress Tracking**: Use progress callbacks for long-running operations
5. **Enrichment Hooks**: Keep enrichment logic lightweight
6. **Scheduling**: Use appropriate intervals to avoid rate limiting
7. **Memory Management**: Use streaming for very large datasets

## Examples

See the `examples/` directory for complete examples:
- `basic-ingestion.ts` - Basic ingestion setup
- `scheduled-ingestion.ts` - Scheduled data updates
- `batch-processing.ts` - Large dataset processing
- `custom-enrichment.ts` - Custom data enrichment
- `error-handling.ts` - Comprehensive error handling

## License

MIT
