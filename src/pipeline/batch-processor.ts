/**
 * BatchProcessor - Processes data in batches with parallel processing
 * Provides memory-efficient streaming and progress tracking
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface BatchConfig {
  batchSize: number;
  concurrency: number;
  retryAttempts?: number;
  retryDelay?: number;
  onProgress?: (progress: BatchProgress) => void;
  onError?: (error: BatchError) => void;
}

export interface BatchProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

export interface BatchError {
  batch: number;
  index: number;
  item: any;
  error: Error;
  attempt: number;
}

export interface BatchResult<T> {
  successful: T[];
  failed: Array<{ item: any; error: Error }>;
  stats: BatchProgress;
}

export type BatchProcessorFn<T, R> = (item: T) => Promise<R>;

// ============================================================================
// BatchProcessor Class
// ============================================================================

export class BatchProcessor<T = any, R = any> extends EventEmitter {
  private config: Required<BatchConfig>;
  private progress: BatchProgress;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private aborted: boolean = false;

  constructor(config: BatchConfig) {
    super();
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      onProgress: () => {},
      onError: () => {},
      ...config,
    };

    this.progress = this.initializeProgress();
  }

  /**
   * Process items in batches
   */
  async process(
    items: T[],
    processor: BatchProcessorFn<T, R>
  ): Promise<BatchResult<R>> {
    if (this.isRunning) {
      throw new Error('Batch processor is already running');
    }

    this.isRunning = true;
    this.aborted = false;
    this.isPaused = false;

    const totalBatches = Math.ceil(items.length / this.config.batchSize);
    this.progress = {
      ...this.initializeProgress(),
      total: items.length,
      totalBatches,
      startTime: new Date(),
    };

    const successful: R[] = [];
    const failed: Array<{ item: T; error: Error }> = [];

    try {
      for (let i = 0; i < items.length; i += this.config.batchSize) {
        // Check if aborted
        if (this.aborted) {
          this.emit('aborted', this.progress);
          break;
        }

        // Handle pause
        await this.handlePause();

        const batch = items.slice(i, i + this.config.batchSize);
        const batchNumber = Math.floor(i / this.config.batchSize) + 1;

        this.progress.currentBatch = batchNumber;
        this.emit('batch-start', { batch: batchNumber, size: batch.length });

        const batchResults = await this.processBatch(
          batch,
          processor,
          i,
          batchNumber
        );

        successful.push(...batchResults.successful);
        failed.push(...batchResults.failed);

        this.progress.processed += batch.length;
        this.progress.successful += batchResults.successful.length;
        this.progress.failed += batchResults.failed.length;
        this.progress.percentage = (this.progress.processed / this.progress.total) * 100;
        this.progress.estimatedTimeRemaining = this.calculateETA();

        this.config.onProgress(this.progress);
        this.emit('progress', this.progress);
        this.emit('batch-complete', {
          batch: batchNumber,
          successful: batchResults.successful.length,
          failed: batchResults.failed.length,
        });
      }

      this.emit('complete', this.progress);
    } catch (error) {
      this.emit('error', error);
      throw error;
    } finally {
      this.isRunning = false;
    }

    return {
      successful,
      failed,
      stats: this.progress,
    };
  }

  /**
   * Process a single batch with concurrency control
   */
  private async processBatch(
    batch: T[],
    processor: BatchProcessorFn<T, R>,
    offset: number,
    batchNumber: number
  ): Promise<{ successful: R[]; failed: Array<{ item: T; error: Error }> }> {
    const successful: R[] = [];
    const failed: Array<{ item: T; error: Error }> = [];

    // Process items in chunks based on concurrency limit
    for (let i = 0; i < batch.length; i += this.config.concurrency) {
      const chunk = batch.slice(i, i + this.config.concurrency);
      const promises = chunk.map((item, idx) =>
        this.processItemWithRetry(item, processor, offset + i + idx, batchNumber)
      );

      const results = await Promise.allSettled(promises);

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push({
            item: chunk[idx],
            error: result.reason,
          });
        }
      });
    }

    return { successful, failed };
  }

  /**
   * Process a single item with retry logic
   */
  private async processItemWithRetry(
    item: T,
    processor: BatchProcessorFn<T, R>,
    index: number,
    batch: number
  ): Promise<R> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await processor(item);
        return result;
      } catch (error) {
        lastError = error as Error;

        const batchError: BatchError = {
          batch,
          index,
          item,
          error: lastError,
          attempt,
        };

        this.config.onError(batchError);
        this.emit('item-error', batchError);

        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Processing failed');
  }

  /**
   * Process items as a stream (memory-efficient)
   */
  async *processStream(
    items: AsyncIterable<T> | Iterable<T>,
    processor: BatchProcessorFn<T, R>
  ): AsyncGenerator<R, void, unknown> {
    this.isRunning = true;
    this.progress = this.initializeProgress();

    let batch: T[] = [];
    let batchNumber = 0;

    try {
      for await (const item of items) {
        if (this.aborted) break;
        await this.handlePause();

        batch.push(item);
        this.progress.total++;

        if (batch.length >= this.config.batchSize) {
          batchNumber++;
          const results = await this.processBatch(batch, processor, 0, batchNumber);

          for (const result of results.successful) {
            yield result;
          }

          this.progress.processed += batch.length;
          this.progress.successful += results.successful.length;
          this.progress.failed += results.failed.length;
          this.progress.percentage = (this.progress.processed / this.progress.total) * 100;

          this.config.onProgress(this.progress);
          this.emit('progress', this.progress);

          batch = [];
        }
      }

      // Process remaining items
      if (batch.length > 0 && !this.aborted) {
        batchNumber++;
        const results = await this.processBatch(batch, processor, 0, batchNumber);

        for (const result of results.successful) {
          yield result;
        }

        this.progress.processed += batch.length;
        this.progress.successful += results.successful.length;
        this.progress.failed += results.failed.length;
        this.progress.percentage = 100;

        this.config.onProgress(this.progress);
        this.emit('progress', this.progress);
      }

      this.emit('complete', this.progress);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Pause processing
   */
  pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.emit('paused');
    }
  }

  /**
   * Resume processing
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.emit('resumed');
    }
  }

  /**
   * Abort processing
   */
  abort(): void {
    this.aborted = true;
    this.isRunning = false;
    this.emit('aborted', this.progress);
  }

  /**
   * Handle pause state
   */
  private async handlePause(): Promise<void> {
    while (this.isPaused && !this.aborted) {
      await this.sleep(100);
    }
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateETA(): number | undefined {
    if (this.progress.processed === 0) {
      return undefined;
    }

    const elapsed = Date.now() - this.progress.startTime.getTime();
    const rate = this.progress.processed / elapsed;
    const remaining = this.progress.total - this.progress.processed;

    return remaining / rate;
  }

  /**
   * Initialize progress object
   */
  private initializeProgress(): BatchProgress {
    return {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      percentage: 0,
      currentBatch: 0,
      totalBatches: 0,
      startTime: new Date(),
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current progress
   */
  getProgress(): BatchProgress {
    return { ...this.progress };
  }

  /**
   * Check if processor is running
   */
  isProcessing(): boolean {
    return this.isRunning;
  }

  /**
   * Check if processor is paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a batch processor with default configuration
 */
export function createBatchProcessor<T, R>(
  config: Partial<BatchConfig> = {}
): BatchProcessor<T, R> {
  const defaultConfig: BatchConfig = {
    batchSize: 100,
    concurrency: 5,
    retryAttempts: 3,
    retryDelay: 1000,
    ...config,
  };

  return new BatchProcessor<T, R>(defaultConfig);
}

/**
 * Process items in parallel batches (convenience function)
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  config: Partial<BatchConfig> = {}
): Promise<BatchResult<R>> {
  const batchProcessor = createBatchProcessor<T, R>(config);
  return batchProcessor.process(items, processor);
}
