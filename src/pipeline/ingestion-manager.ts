/**
 * IngestionManager - Orchestrates data ingestion from all sources
 * Coordinates connectors, transformers, batch processors, and schedulers
 */

import { EventEmitter } from 'events';
import { BaseConnector } from '../connectors/base-connector';
import { DataTransformer, TransformationResult } from './transformer';
import { BatchProcessor, BatchConfig, BatchProgress } from './batch-processor';
import { IngestionScheduler, ScheduleConfig } from './scheduler';
import { CollectionDocument, CollectionName } from '../database/collections';
import { VectorStore } from '../database/vector-store';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface IngestionConfig {
  source: string;
  connector: BaseConnector;
  dataType: 'product' | 'review' | 'supplier' | 'trend';
  collection: CollectionName;
  batchSize?: number;
  concurrency?: number;
  retryAttempts?: number;
  schedule?: ScheduleConfig;
  transformOptions?: {
    enableEnrichment?: boolean;
    validateOnly?: boolean;
  };
}

export interface IngestionJob {
  id: string;
  config: IngestionConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  progress: BatchProgress;
  error?: Error;
  stats: {
    fetched: number;
    transformed: number;
    stored: number;
    failed: number;
  };
}

export interface IngestionResult {
  jobId: string;
  source: string;
  success: boolean;
  stats: {
    fetched: number;
    transformed: number;
    stored: number;
    failed: number;
    duration: number;
  };
  errors?: Array<{ item: any; error: Error }>;
}

// ============================================================================
// IngestionManager Class
// ============================================================================

export class IngestionManager extends EventEmitter {
  private jobs: Map<string, IngestionJob> = new Map();
  private transformer: DataTransformer;
  private scheduler: IngestionScheduler;
  private vectorStore?: VectorStore;
  private activeJobs: Set<string> = new Set();
  private jobCounter = 0;

  constructor(vectorStore?: VectorStore) {
    super();
    this.transformer = new DataTransformer();
    this.scheduler = new IngestionScheduler(this.executeScheduledJob.bind(this));
    this.vectorStore = vectorStore;
  }

  /**
   * Set the vector store for data persistence
   */
  setVectorStore(vectorStore: VectorStore): void {
    this.vectorStore = vectorStore;
  }

  /**
   * Register an enrichment hook with the transformer
   */
  registerEnrichmentHook(
    type: string,
    hook: (data: any, context: any) => Promise<any> | any
  ): void {
    this.transformer.registerEnrichmentHook(type, hook);
  }

  /**
   * Start a manual ingestion job
   */
  async ingest(config: IngestionConfig, params?: any): Promise<IngestionResult> {
    const jobId = this.generateJobId();
    const job = this.createJob(jobId, config);

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);

    this.emit('job-started', { jobId, source: config.source });

    try {
      job.status = 'running';
      job.startTime = new Date();

      // Fetch data from connector
      this.emit('job-progress', { jobId, phase: 'fetching' });
      const rawData = await config.connector.fetch(params);

      // Extract items array (handle different response formats)
      const items = this.extractItems(rawData);
      job.stats.fetched = items.length;

      this.emit('job-progress', {
        jobId,
        phase: 'transforming',
        count: items.length,
      });

      // Transform data
      const transformResults = await this.transformData(
        items,
        config.dataType,
        config.source
      );

      job.stats.transformed = transformResults.filter(r => r.success).length;
      job.stats.failed += transformResults.filter(r => !r.success).length;

      // Extract successful transformations
      const validDocuments = transformResults
        .filter(r => r.success && r.data)
        .map(r => r.data!);

      this.emit('job-progress', {
        jobId,
        phase: 'storing',
        count: validDocuments.length,
      });

      // Store in vector store if available
      if (this.vectorStore && validDocuments.length > 0) {
        const storeResult = await this.storeData(
          validDocuments,
          config.collection,
          jobId
        );
        job.stats.stored = storeResult.stored;
        job.stats.failed += storeResult.failed;
      } else {
        job.stats.stored = validDocuments.length;
      }

      job.status = 'completed';
      job.endTime = new Date();

      const result: IngestionResult = {
        jobId,
        source: config.source,
        success: true,
        stats: {
          ...job.stats,
          duration: job.endTime.getTime() - job.startTime.getTime(),
        },
      };

      this.emit('job-completed', result);
      return result;
    } catch (error) {
      job.status = 'failed';
      job.error = error as Error;
      job.endTime = new Date();

      const result: IngestionResult = {
        jobId,
        source: config.source,
        success: false,
        stats: {
          ...job.stats,
          duration: job.endTime
            ? job.endTime.getTime() - (job.startTime?.getTime() || 0)
            : 0,
        },
      };

      this.emit('job-failed', { jobId, error: error as Error });
      return result;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Start batch ingestion with progress tracking
   */
  async ingestBatch(
    config: IngestionConfig,
    items: any[]
  ): Promise<IngestionResult> {
    const jobId = this.generateJobId();
    const job = this.createJob(jobId, config);

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);

    job.stats.fetched = items.length;

    try {
      job.status = 'running';
      job.startTime = new Date();

      // Create batch processor
      const batchConfig: BatchConfig = {
        batchSize: config.batchSize || 100,
        concurrency: config.concurrency || 5,
        retryAttempts: config.retryAttempts || 3,
        onProgress: (progress: BatchProgress) => {
          job.progress = progress;
          this.emit('job-progress', {
            jobId,
            phase: 'processing',
            progress,
          });
        },
      };

      const processor = new BatchProcessor(batchConfig);

      // Process items
      const result = await processor.process(items, async (item) => {
        // Transform
        const transformResult = await this.transformer.transformProduct(
          item,
          config.source
        );

        if (!transformResult.success || !transformResult.data) {
          throw new Error(`Transformation failed: ${transformResult.errors?.[0]?.message}`);
        }

        return transformResult.data;
      });

      job.stats.transformed = result.successful.length;
      job.stats.failed = result.failed.length;

      // Store successful results
      if (this.vectorStore && result.successful.length > 0) {
        const storeResult = await this.storeData(
          result.successful,
          config.collection,
          jobId
        );
        job.stats.stored = storeResult.stored;
        job.stats.failed += storeResult.failed;
      } else {
        job.stats.stored = result.successful.length;
      }

      job.status = 'completed';
      job.endTime = new Date();

      const ingestionResult: IngestionResult = {
        jobId,
        source: config.source,
        success: true,
        stats: {
          ...job.stats,
          duration: job.endTime.getTime() - job.startTime.getTime(),
        },
        errors: result.failed,
      };

      this.emit('job-completed', ingestionResult);
      return ingestionResult;
    } catch (error) {
      job.status = 'failed';
      job.error = error as Error;
      job.endTime = new Date();

      this.emit('job-failed', { jobId, error: error as Error });

      return {
        jobId,
        source: config.source,
        success: false,
        stats: {
          ...job.stats,
          duration: job.endTime
            ? job.endTime.getTime() - (job.startTime?.getTime() || 0)
            : 0,
        },
      };
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Schedule periodic ingestion
   */
  scheduleIngestion(config: IngestionConfig): void {
    if (!config.schedule) {
      throw new Error('Schedule configuration is required for scheduled ingestion');
    }

    this.scheduler.addSchedule(config.schedule);
    this.emit('schedule-added', config.schedule);
  }

  /**
   * Remove a scheduled ingestion
   */
  removeSchedule(scheduleId: string): boolean {
    const removed = this.scheduler.removeSchedule(scheduleId);
    if (removed) {
      this.emit('schedule-removed', scheduleId);
    }
    return removed;
  }

  /**
   * Start the scheduler
   */
  startScheduler(): void {
    this.scheduler.start();
    this.emit('scheduler-started');
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    this.scheduler.stop();
    this.emit('scheduler-stopped');
  }

  /**
   * Execute a scheduled job
   */
  private async executeScheduledJob(scheduleConfig: ScheduleConfig): Promise<void> {
    const config = scheduleConfig.metadata?.ingestionConfig as IngestionConfig;
    if (!config) {
      throw new Error('Ingestion config not found in schedule metadata');
    }

    await this.ingest(config, scheduleConfig.metadata?.params);
  }

  /**
   * Transform data using the transformer
   */
  private async transformData(
    items: any[],
    dataType: string,
    source: string
  ): Promise<TransformationResult[]> {
    return this.transformer.transformBatch(items, dataType as any, source);
  }

  /**
   * Store data in vector store
   */
  private async storeData(
    documents: CollectionDocument[],
    collection: CollectionName,
    jobId: string
  ): Promise<{ stored: number; failed: number }> {
    if (!this.vectorStore) {
      throw new Error('Vector store not configured');
    }

    let stored = 0;
    let failed = 0;

    // Store in batches
    const batchSize = 50;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      try {
        await this.vectorStore.addDocuments(collection, batch as any);
        stored += batch.length;
      } catch (error) {
        console.error(`Failed to store batch for job ${jobId}:`, error);
        failed += batch.length;
      }
    }

    return { stored, failed };
  }

  /**
   * Extract items array from various response formats
   */
  private extractItems(rawData: any): any[] {
    if (Array.isArray(rawData)) {
      return rawData;
    }

    if (rawData.products) return rawData.products;
    if (rawData.items) return rawData.items;
    if (rawData.data) return Array.isArray(rawData.data) ? rawData.data : [rawData.data];
    if (rawData.results) return rawData.results;

    // Single item
    return [rawData];
  }

  /**
   * Create a new ingestion job
   */
  private createJob(id: string, config: IngestionConfig): IngestionJob {
    return {
      id,
      config,
      status: 'pending',
      progress: {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        percentage: 0,
        currentBatch: 0,
        totalBatches: 0,
        startTime: new Date(),
      },
      stats: {
        fetched: 0,
        transformed: 0,
        stored: 0,
        failed: 0,
      },
    };
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `job-${Date.now()}-${++this.jobCounter}`;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): IngestionJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): IngestionJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): IngestionJob[] {
    return Array.from(this.activeJobs)
      .map(id => this.jobs.get(id))
      .filter((job): job is IngestionJob => job !== undefined);
  }

  /**
   * Get jobs by source
   */
  getJobsBySource(source: string): IngestionJob[] {
    return Array.from(this.jobs.values()).filter(
      job => job.config.source === source
    );
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'running') {
      return false;
    }

    job.status = 'cancelled';
    job.endTime = new Date();
    this.activeJobs.delete(jobId);

    this.emit('job-cancelled', jobId);
    return true;
  }

  /**
   * Clear completed jobs from history
   */
  clearHistory(olderThan?: Date): number {
    const cutoff = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let cleared = 0;

    for (const [id, job] of this.jobs.entries()) {
      if (
        job.status === 'completed' &&
        job.endTime &&
        job.endTime < cutoff &&
        !this.activeJobs.has(id)
      ) {
        this.jobs.delete(id);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get ingestion statistics
   */
  getStats() {
    const jobs = Array.from(this.jobs.values());
    const activeJobs = this.getActiveJobs();

    return {
      totalJobs: jobs.length,
      activeJobs: activeJobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      cancelledJobs: jobs.filter(j => j.status === 'cancelled').length,
      totalFetched: jobs.reduce((sum, j) => sum + j.stats.fetched, 0),
      totalTransformed: jobs.reduce((sum, j) => sum + j.stats.transformed, 0),
      totalStored: jobs.reduce((sum, j) => sum + j.stats.stored, 0),
      totalFailed: jobs.reduce((sum, j) => sum + j.stats.failed, 0),
      transformerStats: this.transformer.getStats(),
      schedulerStats: this.scheduler.getStats(),
    };
  }

  /**
   * Get scheduler instance
   */
  getScheduler(): IngestionScheduler {
    return this.scheduler;
  }

  /**
   * Get transformer instance
   */
  getTransformer(): DataTransformer {
    return this.transformer;
  }
}
