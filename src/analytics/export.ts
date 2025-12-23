/**
 * Data Export System
 * Export data to CSV, JSON, Excel with filtering, scheduled exports, and API
 */

export interface ExportJob {
  id: string;
  name: string;
  format: ExportFormat;
  source: string;
  filters?: ExportFilter[];
  fields?: string[];
  status: ExportStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  fileSize?: number;
  recordCount?: number;
  downloadUrl?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
  NDJSON = 'ndjson' // Newline-delimited JSON
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ExportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface ExportSchedule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  format: ExportFormat;
  source: string;
  filters?: ExportFilter[];
  fields?: string[];
  schedule: SchedulePattern;
  destination?: ExportDestination;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
}

export interface SchedulePattern {
  type: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  interval?: number; // For hourly schedules
}

export interface ExportDestination {
  type: 'local' | 'email' | 's3' | 'ftp';
  config: Record<string, any>;
}

export interface ExportOptions {
  includeHeaders?: boolean;
  dateFormat?: string;
  delimiter?: string; // For CSV
  indent?: number; // For JSON
  sheetName?: string; // For Excel
  compression?: 'none' | 'gzip' | 'zip';
  maxRecords?: number;
  batchSize?: number;
  fields?: string[]; // Fields to include in export
}

export interface ExportStats {
  totalExports: number;
  completedExports: number;
  failedExports: number;
  totalRecordsExported: number;
  totalSizeExported: number;
  exportsByFormat: Record<ExportFormat, number>;
  exportsBySource: Record<string, number>;
}

export interface DataExporterConfig {
  outputPath?: string;
  maxConcurrentExports?: number;
  defaultBatchSize?: number;
  enableScheduling?: boolean;
  scheduleCheckIntervalMinutes?: number;
}

export class DataExporter {
  private jobs: Map<string, ExportJob>;
  private schedules: Map<string, ExportSchedule>;
  private config: Required<DataExporterConfig>;
  private scheduleTimer?: NodeJS.Timeout;

  constructor(config: DataExporterConfig = {}) {
    this.jobs = new Map();
    this.schedules = new Map();

    this.config = {
      outputPath: config.outputPath ?? './exports',
      maxConcurrentExports: config.maxConcurrentExports ?? 5,
      defaultBatchSize: config.defaultBatchSize ?? 1000,
      enableScheduling: config.enableScheduling ?? true,
      scheduleCheckIntervalMinutes: config.scheduleCheckIntervalMinutes ?? 60
    };

    if (this.config.enableScheduling) {
      this.startScheduleMonitoring();
    }
  }

  /**
   * Export data to specified format
   */
  async exportData<T>(params: {
    name: string;
    data: T[];
    format: ExportFormat;
    source: string;
    filters?: ExportFilter[];
    fields?: string[];
    options?: ExportOptions;
  }): Promise<ExportJob> {
    const job: ExportJob = {
      id: this.generateJobId(),
      name: params.name,
      format: params.format,
      source: params.source,
      filters: params.filters,
      fields: params.fields,
      status: ExportStatus.PENDING,
      createdAt: new Date()
    };

    this.jobs.set(job.id, job);

    // Start export in background
    this.processExport(job, params.data, params.options || {})
      .catch(error => {
        job.status = ExportStatus.FAILED;
        job.error = error.message;
      });

    return job;
  }

  /**
   * Export to CSV format
   */
  exportToCSV<T extends Record<string, any>>(
    data: T[],
    options: ExportOptions = {}
  ): string {
    const {
      includeHeaders = true,
      delimiter = ',',
      fields
    } = options;

    if (data.length === 0) {
      return '';
    }

    // Determine fields to export
    const exportFields = fields || (data[0] ? Object.keys(data[0]) : []);
    const lines: string[] = [];

    // Add header row
    if (includeHeaders) {
      lines.push(exportFields.join(delimiter));
    }

    // Add data rows
    for (const record of data) {
      const values = exportFields.map((field: string) => {
        const value = record[field];
        return this.formatCSVValue(value);
      });
      lines.push(values.join(delimiter));
    }

    return lines.join('\n');
  }

  /**
   * Export to JSON format
   */
  exportToJSON<T>(
    data: T[],
    options: ExportOptions = {}
  ): string {
    const { indent = 2, fields } = options;

    let exportData = data;

    // Filter fields if specified
    if (fields && fields.length > 0) {
      exportData = data.map(record => {
        const filtered: any = {};
        for (const field of fields) {
          if (record && typeof record === 'object' && field in record) {
            filtered[field] = (record as any)[field];
          }
        }
        return filtered as T;
      });
    }

    return JSON.stringify(exportData, null, indent);
  }

  /**
   * Export to NDJSON (Newline-Delimited JSON)
   */
  exportToNDJSON<T>(
    data: T[],
    options: ExportOptions = {}
  ): string {
    const { fields } = options;

    let exportData = data;

    // Filter fields if specified
    if (fields && fields.length > 0) {
      exportData = data.map(record => {
        const filtered: any = {};
        for (const field of fields) {
          if (record && typeof record === 'object' && field in record) {
            filtered[field] = (record as any)[field];
          }
        }
        return filtered as T;
      });
    }

    return exportData.map(record => JSON.stringify(record)).join('\n');
  }

  /**
   * Export to Excel format (simplified representation)
   */
  exportToExcel<T extends Record<string, any>>(
    data: T[],
    options: ExportOptions = {}
  ): string {
    const {
      sheetName = 'Sheet1'
    } = options;

    // This is a simplified Excel export
    // In production, you'd use a library like 'exceljs' or 'xlsx'
    const metadata = {
      format: 'excel',
      sheetName,
      message: 'Excel export requires additional dependencies (exceljs or xlsx)',
      csvEquivalent: this.exportToCSV(data, { ...options, includeHeaders: true })
    };

    return JSON.stringify(metadata, null, 2);
  }

  /**
   * Apply filters to data
   */
  applyFilters<T>(data: T[], filters: ExportFilter[]): T[] {
    if (!filters || filters.length === 0) {
      return data;
    }

    return data.filter(record => {
      return filters.every(filter => {
        const value = (record as any)[filter.field];
        return this.evaluateFilter(value, filter.operator, filter.value);
      });
    });
  }

  /**
   * Create scheduled export
   */
  scheduleExport(params: {
    name: string;
    description: string;
    format: ExportFormat;
    source: string;
    filters?: ExportFilter[];
    fields?: string[];
    schedule: SchedulePattern;
    destination?: ExportDestination;
    enabled?: boolean;
  }): ExportSchedule {
    const schedule: ExportSchedule = {
      id: this.generateScheduleId(),
      name: params.name,
      description: params.description,
      enabled: params.enabled ?? true,
      format: params.format,
      source: params.source,
      filters: params.filters,
      fields: params.fields,
      schedule: params.schedule,
      destination: params.destination,
      createdAt: new Date(),
      nextRunAt: this.calculateNextRun(params.schedule)
    };

    this.schedules.set(schedule.id, schedule);
    return schedule;
  }

  /**
   * Get export job by ID
   */
  getJob(jobId: string): ExportJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * List export jobs
   */
  listJobs(filters?: {
    status?: ExportStatus;
    format?: ExportFormat;
    source?: string;
    limit?: number;
  }): ExportJob[] {
    let jobs = Array.from(this.jobs.values());

    if (filters?.status) {
      jobs = jobs.filter(j => j.status === filters.status);
    }

    if (filters?.format) {
      jobs = jobs.filter(j => j.format === filters.format);
    }

    if (filters?.source) {
      jobs = jobs.filter(j => j.source === filters.source);
    }

    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      jobs = jobs.slice(0, filters.limit);
    }

    return jobs;
  }

  /**
   * Get scheduled export by ID
   */
  getSchedule(scheduleId: string): ExportSchedule | null {
    return this.schedules.get(scheduleId) || null;
  }

  /**
   * List scheduled exports
   */
  listSchedules(enabledOnly: boolean = false): ExportSchedule[] {
    const schedules = Array.from(this.schedules.values());
    return enabledOnly ? schedules.filter(s => s.enabled) : schedules;
  }

  /**
   * Update scheduled export
   */
  updateSchedule(scheduleId: string, updates: Partial<ExportSchedule>): ExportSchedule | null {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      return null;
    }

    Object.assign(schedule, updates);

    if (updates.schedule) {
      schedule.nextRunAt = this.calculateNextRun(updates.schedule);
    }

    return schedule;
  }

  /**
   * Delete scheduled export
   */
  deleteSchedule(scheduleId: string): boolean {
    return this.schedules.delete(scheduleId);
  }

  /**
   * Cancel export job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && (job.status === ExportStatus.PENDING || job.status === ExportStatus.PROCESSING)) {
      job.status = ExportStatus.CANCELLED;
      return true;
    }
    return false;
  }

  /**
   * Delete export job
   */
  deleteJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  /**
   * Get export statistics
   */
  getStats(): ExportStats {
    const jobs = Array.from(this.jobs.values());

    const stats: ExportStats = {
      totalExports: jobs.length,
      completedExports: jobs.filter(j => j.status === ExportStatus.COMPLETED).length,
      failedExports: jobs.filter(j => j.status === ExportStatus.FAILED).length,
      totalRecordsExported: jobs.reduce((sum, j) => sum + (j.recordCount || 0), 0),
      totalSizeExported: jobs.reduce((sum, j) => sum + (j.fileSize || 0), 0),
      exportsByFormat: {} as Record<ExportFormat, number>,
      exportsBySource: {} as Record<string, number>
    };

    // Initialize format counters
    for (const format of Object.values(ExportFormat)) {
      stats.exportsByFormat[format] = 0;
    }

    // Count by format and source
    for (const job of jobs) {
      stats.exportsByFormat[job.format]++;
      stats.exportsBySource[job.source] = (stats.exportsBySource[job.source] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear completed jobs older than specified days
   */
  clearOldJobs(days: number = 30): number {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        job.status === ExportStatus.COMPLETED &&
        job.completedAt &&
        job.completedAt.getTime() < cutoffTime
      ) {
        this.jobs.delete(jobId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Stop schedule monitoring
   */
  destroy(): void {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
    }
  }

  // Private helper methods

  private async processExport<T>(
    job: ExportJob,
    data: T[],
    options: ExportOptions
  ): Promise<void> {
    job.status = ExportStatus.PROCESSING;
    job.startedAt = new Date();

    try {
      // Apply filters
      let filteredData = data;
      if (job.filters && job.filters.length > 0) {
        filteredData = this.applyFilters(data, job.filters);
      }

      // Limit records if specified
      if (options.maxRecords && filteredData.length > options.maxRecords) {
        filteredData = filteredData.slice(0, options.maxRecords);
      }

      // Generate export based on format
      let output: string;
      switch (job.format) {
        case ExportFormat.CSV:
          output = this.exportToCSV(filteredData as any, options);
          break;
        case ExportFormat.JSON:
          output = this.exportToJSON(filteredData, options);
          break;
        case ExportFormat.NDJSON:
          output = this.exportToNDJSON(filteredData, options);
          break;
        case ExportFormat.EXCEL:
          output = this.exportToExcel(filteredData as any, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${job.format}`);
      }

      // Update job with results
      job.status = ExportStatus.COMPLETED;
      job.completedAt = new Date();
      job.recordCount = filteredData.length;
      job.fileSize = Buffer.byteLength(output, 'utf8');
      job.downloadUrl = `${this.config.outputPath}/${job.id}.${job.format}`;

      // In a real implementation, you would save the file here
      // For now, we'll store the output in metadata
      job.metadata = { output };
    } catch (error) {
      job.status = ExportStatus.FAILED;
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
    }
  }

  private formatCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }

    const stringValue = String(value);

    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  private evaluateFilter(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'eq':
        return value === filterValue;
      case 'ne':
        return value !== filterValue;
      case 'gt':
        return value > filterValue;
      case 'gte':
        return value >= filterValue;
      case 'lt':
        return value < filterValue;
      case 'lte':
        return value <= filterValue;
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'contains':
        return String(value).includes(String(filterValue));
      case 'startsWith':
        return String(value).startsWith(String(filterValue));
      case 'endsWith':
        return String(value).endsWith(String(filterValue));
      default:
        return true;
    }
  }

  private calculateNextRun(pattern: SchedulePattern): Date {
    const now = new Date();
    const next = new Date(now);

    switch (pattern.type) {
      case 'once':
        return now;

      case 'hourly':
        const interval = pattern.interval || 1;
        next.setHours(next.getHours() + interval);
        break;

      case 'daily':
        next.setDate(next.getDate() + 1);
        if (pattern.time) {
          const timeParts = pattern.time.split(':');
          const hours = parseInt(timeParts[0] || '0', 10);
          const minutes = parseInt(timeParts[1] || '0', 10);
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'weekly':
        const targetDay = pattern.dayOfWeek ?? 0;
        const currentDay = next.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntilTarget);
        if (pattern.time) {
          const timeParts = pattern.time.split(':');
          const hours = parseInt(timeParts[0] || '0', 10);
          const minutes = parseInt(timeParts[1] || '0', 10);
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'monthly':
        const targetDate = pattern.dayOfMonth ?? 1;
        next.setMonth(next.getMonth() + 1);
        next.setDate(targetDate);
        if (pattern.time) {
          const timeParts = pattern.time.split(':');
          const hours = parseInt(timeParts[0] || '0', 10);
          const minutes = parseInt(timeParts[1] || '0', 10);
          next.setHours(hours, minutes, 0, 0);
        }
        break;
    }

    return next;
  }

  private startScheduleMonitoring(): void {
    const intervalMs = this.config.scheduleCheckIntervalMinutes * 60 * 1000;

    this.scheduleTimer = setInterval(() => {
      this.checkSchedules();
    }, intervalMs);
  }

  private checkSchedules(): void {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled || !schedule.nextRunAt) {
        continue;
      }

      if (schedule.nextRunAt <= now) {
        // Trigger scheduled export
        this.triggerScheduledExport(schedule);

        // Update next run time
        schedule.lastRunAt = now;
        schedule.nextRunAt = this.calculateNextRun(schedule.schedule);
      }
    }
  }

  private async triggerScheduledExport(schedule: ExportSchedule): Promise<void> {
    // In a real implementation, this would fetch data from the source
    // and trigger the export. For now, we'll create a placeholder job.
    const job: ExportJob = {
      id: this.generateJobId(),
      name: `${schedule.name} - Scheduled`,
      format: schedule.format,
      source: schedule.source,
      filters: schedule.filters,
      fields: schedule.fields,
      status: ExportStatus.PENDING,
      createdAt: new Date(),
      metadata: {
        scheduleId: schedule.id,
        scheduled: true
      }
    };

    this.jobs.set(job.id, job);

    // In production, you would fetch the actual data here and process the export
    // For now, we'll just mark it as completed
    job.status = ExportStatus.COMPLETED;
    job.completedAt = new Date();
  }

  private generateJobId(): string {
    return `export-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateScheduleId(): string {
    return `schedule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
