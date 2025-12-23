/**
 * Pipeline Module - Data ingestion and processing pipeline
 *
 * This module provides a comprehensive data pipeline system for ingesting,
 * transforming, and storing data from various sources.
 *
 * @module pipeline
 */

// ============================================================================
// Ingestion Manager
// ============================================================================

export {
  IngestionManager,
  type IngestionConfig,
  type IngestionJob,
  type IngestionResult,
} from './ingestion-manager';

// ============================================================================
// Data Transformer
// ============================================================================

export {
  DataTransformer,
  type TransformationResult,
  type ValidationError,
  type EnrichmentContext,
  type EnrichmentHook,
  type RawProduct,
  type RawReview,
  type RawSupplier,
  type RawTrend,
  type RawData,
  RawProductSchema,
  RawReviewSchema,
  RawSupplierSchema,
  RawTrendSchema,
} from './transformer';

// ============================================================================
// Batch Processor
// ============================================================================

export {
  BatchProcessor,
  createBatchProcessor,
  processBatch,
  type BatchConfig,
  type BatchProgress,
  type BatchError,
  type BatchResult,
} from './batch-processor';

// ============================================================================
// Ingestion Scheduler
// ============================================================================

export {
  IngestionScheduler,
  ScheduleIntervals,
  CronExpressions,
  type ScheduleConfig,
  type ScheduledTask,
  type TaskExecutor,
  type SchedulerStats,
  type CronPattern,
} from './scheduler';

// ============================================================================
// Convenience Functions
// ============================================================================

import { IngestionManager } from './ingestion-manager';
import { VectorStore } from '../database/vector-store';

/**
 * Create a new ingestion manager instance
 */
export function createIngestionManager(vectorStore?: VectorStore): IngestionManager {
  return new IngestionManager(vectorStore);
}

/**
 * Pipeline module version
 */
export const VERSION = '1.0.0';

/**
 * Pipeline module metadata
 */
export const PIPELINE_INFO = {
  name: 'ECAI Data Pipeline',
  version: VERSION,
  description: 'Comprehensive data ingestion and processing pipeline for ECAI platform',
  features: [
    'Multi-source data ingestion',
    'Automatic data transformation and validation',
    'Batch processing with parallel execution',
    'Cron-like scheduling',
    'Progress tracking and error handling',
    'Memory-efficient streaming',
    'Enrichment hooks for custom data processing',
  ],
};
