/**
 * IngestionScheduler - Cron-like scheduling for data ingestion
 * Manages source-specific schedules with priority queue and conflict resolution
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ScheduleConfig {
  id: string;
  name: string;
  cron?: string; // Cron expression (if needed for complex schedules)
  interval?: number; // Simple interval in milliseconds
  source: string;
  priority?: number; // Higher number = higher priority
  enabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface ScheduledTask {
  config: ScheduleConfig;
  nextRun: Date;
  lastRun?: Date;
  lastStatus?: 'success' | 'failed' | 'timeout';
  lastError?: Error;
  retryCount: number;
  isRunning: boolean;
}

export type TaskExecutor = (config: ScheduleConfig) => Promise<void>;

export interface SchedulerStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  queuedTasks: number;
  nextScheduledTask?: {
    id: string;
    name: string;
    scheduledTime: Date;
  };
}

export interface CronPattern {
  minute?: string; // 0-59
  hour?: string; // 0-23
  dayOfMonth?: string; // 1-31
  month?: string; // 1-12
  dayOfWeek?: string; // 0-6 (0 = Sunday)
}

// ============================================================================
// IngestionScheduler Class
// ============================================================================

export class IngestionScheduler extends EventEmitter {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private executor?: TaskExecutor;
  private isRunning: boolean = false;
  private stats = {
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
  };

  constructor(executor?: TaskExecutor) {
    super();
    this.executor = executor;
  }

  /**
   * Set the task executor function
   */
  setExecutor(executor: TaskExecutor): void {
    this.executor = executor;
  }

  /**
   * Add a scheduled task
   */
  addSchedule(config: ScheduleConfig): void {
    if (!config.interval && !config.cron) {
      throw new Error('Schedule must have either interval or cron expression');
    }

    const task: ScheduledTask = {
      config: {
        enabled: true,
        priority: 0,
        maxRetries: 3,
        retryDelay: 60000, // 1 minute
        timeout: 300000, // 5 minutes
        ...config,
      },
      nextRun: this.calculateNextRun(config),
      retryCount: 0,
      isRunning: false,
    };

    this.tasks.set(config.id, task);
    this.stats.totalTasks++;

    if (this.isRunning && task.config.enabled) {
      this.scheduleTask(task);
    }

    this.emit('schedule-added', config);
  }

  /**
   * Remove a scheduled task
   */
  removeSchedule(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    this.cancelTask(id);
    this.tasks.delete(id);
    this.stats.totalTasks--;

    this.emit('schedule-removed', id);
    return true;
  }

  /**
   * Update a scheduled task
   */
  updateSchedule(id: string, updates: Partial<ScheduleConfig>): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    // Cancel existing timer
    this.cancelTask(id);

    // Update config
    task.config = { ...task.config, ...updates };
    task.nextRun = this.calculateNextRun(task.config);

    // Reschedule if running and enabled
    if (this.isRunning && task.config.enabled) {
      this.scheduleTask(task);
    }

    this.emit('schedule-updated', task.config);
    return true;
  }

  /**
   * Enable a scheduled task
   */
  enableSchedule(id: string): boolean {
    return this.updateSchedule(id, { enabled: true });
  }

  /**
   * Disable a scheduled task
   */
  disableSchedule(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    this.cancelTask(id);
    task.config.enabled = false;

    this.emit('schedule-disabled', id);
    return true;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Scheduler is already running');
      return;
    }

    if (!this.executor) {
      throw new Error('Task executor not set. Use setExecutor() first.');
    }

    this.isRunning = true;

    // Schedule all enabled tasks
    for (const task of this.tasks.values()) {
      if (task.config.enabled) {
        this.scheduleTask(task);
      }
    }

    this.emit('started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Cancel all timers
    for (const id of this.timers.keys()) {
      this.cancelTask(id);
    }

    this.emit('stopped');
  }

  /**
   * Run a task immediately (bypassing schedule)
   */
  async runNow(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }

    if (task.isRunning) {
      throw new Error(`Task ${id} is already running`);
    }

    await this.executeTask(task);
  }

  /**
   * Schedule a task for execution
   */
  private scheduleTask(task: ScheduledTask): void {
    const delay = task.nextRun.getTime() - Date.now();

    if (delay <= 0) {
      // Run immediately
      this.executeTask(task);
      return;
    }

    const timer = setTimeout(() => {
      this.executeTask(task);
    }, delay);

    this.timers.set(task.config.id, timer);
  }

  /**
   * Execute a scheduled task
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    if (!this.executor) return;

    // Check for conflicts (same source already running)
    if (this.hasConflict(task)) {
      this.emit('conflict', {
        taskId: task.config.id,
        source: task.config.source,
      });
      // Reschedule for later
      task.nextRun = new Date(Date.now() + 60000); // Try again in 1 minute
      this.scheduleTask(task);
      return;
    }

    task.isRunning = true;
    task.lastRun = new Date();
    this.stats.activeTasks++;

    this.emit('task-start', task.config);

    try {
      // Execute with timeout
      await this.executeWithTimeout(task);

      task.lastStatus = 'success';
      task.retryCount = 0;
      this.stats.completedTasks++;

      this.emit('task-complete', {
        config: task.config,
        duration: Date.now() - task.lastRun!.getTime(),
      });
    } catch (error) {
      task.lastStatus = 'failed';
      task.lastError = error as Error;
      this.stats.failedTasks++;

      this.emit('task-failed', {
        config: task.config,
        error: error as Error,
        retryCount: task.retryCount,
      });

      // Handle retries
      if (task.retryCount < task.config.maxRetries!) {
        task.retryCount++;
        task.nextRun = new Date(Date.now() + task.config.retryDelay!);
        this.emit('task-retry', {
          config: task.config,
          attempt: task.retryCount,
          nextAttempt: task.nextRun,
        });
      } else {
        this.emit('task-exhausted', {
          config: task.config,
          error: error as Error,
        });
      }
    } finally {
      task.isRunning = false;
      this.stats.activeTasks--;

      // Schedule next run if enabled
      if (this.isRunning && task.config.enabled && task.retryCount === 0) {
        task.nextRun = this.calculateNextRun(task.config);
        this.scheduleTask(task);
      } else if (task.retryCount > 0 && task.retryCount < task.config.maxRetries!) {
        // Reschedule retry
        this.scheduleTask(task);
      }
    }
  }

  /**
   * Execute task with timeout
   */
  private async executeWithTimeout(task: ScheduledTask): Promise<void> {
    return Promise.race([
      this.executor!(task.config),
      new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error('Task execution timeout')),
          task.config.timeout
        )
      ),
    ]);
  }

  /**
   * Check if there's a conflict with running tasks
   */
  private hasConflict(task: ScheduledTask): boolean {
    for (const existing of this.tasks.values()) {
      if (
        existing.config.id !== task.config.id &&
        existing.config.source === task.config.source &&
        existing.isRunning
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate next run time based on schedule
   */
  private calculateNextRun(config: ScheduleConfig): Date {
    const now = Date.now();

    if (config.interval) {
      return new Date(now + config.interval);
    }

    if (config.cron) {
      return this.calculateCronNextRun(config.cron);
    }

    throw new Error('Invalid schedule configuration');
  }

  /**
   * Calculate next run time from cron expression (simplified)
   * Format: "minute hour dayOfMonth month dayOfWeek"
   * Example: "0 12 * * *" = daily at noon
   * Example: "* /15 * * * *" = every 15 minutes (without space)
   * Example: "0 0 1 * *" = first day of month at midnight
   */
  private calculateCronNextRun(cronExpression: string): Date {
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression. Expected format: "minute hour dayOfMonth month dayOfWeek"');
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const now = new Date();
    const next = new Date(now);

    // Simple implementation - find next matching time
    // This is a simplified version; a full cron parser would be more complex

    // Parse minute
    if (minute !== '*') {
      if (minute.startsWith('*/')) {
        const interval = parseInt(minute.substring(2));
        const currentMinute = now.getMinutes();
        const nextMinute = Math.ceil(currentMinute / interval) * interval;
        next.setMinutes(nextMinute);
      } else {
        next.setMinutes(parseInt(minute));
      }
    }

    // Parse hour
    if (hour !== '*') {
      next.setHours(parseInt(hour));
    }

    // If next time is in the past, add one day
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    next.setSeconds(0);
    next.setMilliseconds(0);

    return next;
  }

  /**
   * Cancel a task's timer
   */
  private cancelTask(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /**
   * Get all schedules
   */
  getSchedules(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get a specific schedule
   */
  getSchedule(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get schedules by source
   */
  getSchedulesBySource(source: string): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter(
      task => task.config.source === source
    );
  }

  /**
   * Get priority queue (sorted by priority and next run time)
   */
  getPriorityQueue(): ScheduledTask[] {
    return Array.from(this.tasks.values())
      .filter(task => task.config.enabled && !task.isRunning)
      .sort((a, b) => {
        // First by priority (higher first)
        const priorityDiff = (b.config.priority || 0) - (a.config.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;

        // Then by next run time (earlier first)
        return a.nextRun.getTime() - b.nextRun.getTime();
      });
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    const queue = this.getPriorityQueue();
    const nextTask = queue[0];

    return {
      totalTasks: this.stats.totalTasks,
      activeTasks: this.stats.activeTasks,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      queuedTasks: queue.length,
      nextScheduledTask: nextTask
        ? {
            id: nextTask.config.id,
            name: nextTask.config.name,
            scheduledTime: nextTask.nextRun,
          }
        : undefined,
    };
  }

  /**
   * Clear all schedules
   */
  clear(): void {
    this.stop();
    this.tasks.clear();
    this.timers.clear();
    this.stats = {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
    };
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create common schedule intervals
 */
export const ScheduleIntervals = {
  EVERY_MINUTE: 60 * 1000,
  EVERY_5_MINUTES: 5 * 60 * 1000,
  EVERY_15_MINUTES: 15 * 60 * 1000,
  EVERY_30_MINUTES: 30 * 60 * 1000,
  HOURLY: 60 * 60 * 1000,
  EVERY_6_HOURS: 6 * 60 * 60 * 1000,
  EVERY_12_HOURS: 12 * 60 * 60 * 1000,
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Common cron expressions
 */
export const CronExpressions = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  HOURLY: '0 * * * *',
  DAILY_MIDNIGHT: '0 0 * * *',
  DAILY_NOON: '0 12 * * *',
  WEEKLY_SUNDAY: '0 0 * * 0',
  MONTHLY: '0 0 1 * *',
};
