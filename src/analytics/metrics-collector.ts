/**
 * Metrics Collection System
 * Tracks platform usage metrics, search analytics, API usage stats, and performance metrics
 */

export interface Metric {
  id: string;
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface UsageMetric extends Metric {
  userId?: string;
  sessionId?: string;
  action: string;
  resource?: string;
  duration?: number;
}

export interface SearchMetric extends Metric {
  query: string;
  resultsCount: number;
  clickThroughRate?: number;
  avgPosition?: number;
  filters?: Record<string, any>;
  latency: number;
}

export interface APIMetric extends Metric {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize?: number;
  responseSize?: number;
  userId?: string;
  apiKey?: string;
}

export interface PerformanceMetric extends Metric {
  operation: string;
  duration: number;
  success: boolean;
  errorType?: string;
  resourceUsage?: {
    cpu?: number;
    memory?: number;
    io?: number;
  };
}

export interface MetricsSummary {
  metricType: string;
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
  stdDev: number;
  percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  period: {
    start: Date;
    end: Date;
  };
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  count: number;
}

export interface MetricsCollectorConfig {
  retentionPeriodDays?: number; // How long to keep metrics (default: 90)
  aggregationIntervalMinutes?: number; // Interval for aggregation (default: 5)
  maxMetricsInMemory?: number; // Max metrics to keep in memory (default: 100000)
  enableAutoAggregation?: boolean; // Auto-aggregate old metrics (default: true)
}

export class MetricsCollector {
  private usageMetrics: Map<string, UsageMetric[]>;
  private searchMetrics: Map<string, SearchMetric[]>;
  private apiMetrics: Map<string, APIMetric[]>;
  private performanceMetrics: Map<string, PerformanceMetric[]>;
  private config: Required<MetricsCollectorConfig>;
  private aggregationTimer?: NodeJS.Timeout;

  constructor(config: MetricsCollectorConfig = {}) {
    this.usageMetrics = new Map();
    this.searchMetrics = new Map();
    this.apiMetrics = new Map();
    this.performanceMetrics = new Map();

    this.config = {
      retentionPeriodDays: config.retentionPeriodDays ?? 90,
      aggregationIntervalMinutes: config.aggregationIntervalMinutes ?? 5,
      maxMetricsInMemory: config.maxMetricsInMemory ?? 100000,
      enableAutoAggregation: config.enableAutoAggregation ?? true
    };

    if (this.config.enableAutoAggregation) {
      this.startAutoAggregation();
    }
  }

  /**
   * Track platform usage metric
   */
  trackUsage(params: {
    action: string;
    userId?: string;
    sessionId?: string;
    resource?: string;
    duration?: number;
    tags?: Record<string, string>;
    metadata?: Record<string, any>;
  }): UsageMetric {
    const metric: UsageMetric = {
      id: this.generateId(),
      name: 'platform_usage',
      value: 1,
      timestamp: new Date(),
      action: params.action,
      userId: params.userId,
      sessionId: params.sessionId,
      resource: params.resource,
      duration: params.duration,
      tags: params.tags,
      metadata: params.metadata
    };

    this.addMetric(this.usageMetrics, params.action, metric);
    return metric;
  }

  /**
   * Track search query metric
   */
  trackSearch(params: {
    query: string;
    resultsCount: number;
    clickThroughRate?: number;
    avgPosition?: number;
    filters?: Record<string, any>;
    latency: number;
    userId?: string;
    tags?: Record<string, string>;
  }): SearchMetric {
    const metric: SearchMetric = {
      id: this.generateId(),
      name: 'search_query',
      value: params.resultsCount,
      timestamp: new Date(),
      query: params.query,
      resultsCount: params.resultsCount,
      clickThroughRate: params.clickThroughRate,
      avgPosition: params.avgPosition,
      filters: params.filters,
      latency: params.latency,
      tags: {
        ...params.tags,
        userId: params.userId || 'anonymous'
      }
    };

    this.addMetric(this.searchMetrics, 'search_queries', metric);
    return metric;
  }

  /**
   * Track API request metric
   */
  trackAPIRequest(params: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    requestSize?: number;
    responseSize?: number;
    userId?: string;
    apiKey?: string;
    tags?: Record<string, string>;
  }): APIMetric {
    const metric: APIMetric = {
      id: this.generateId(),
      name: 'api_request',
      value: 1,
      timestamp: new Date(),
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      responseTime: params.responseTime,
      requestSize: params.requestSize,
      responseSize: params.responseSize,
      userId: params.userId,
      apiKey: params.apiKey,
      tags: {
        ...params.tags,
        endpoint: params.endpoint,
        method: params.method,
        status: String(params.statusCode)
      }
    };

    this.addMetric(this.apiMetrics, params.endpoint, metric);
    return metric;
  }

  /**
   * Track performance metric
   */
  trackPerformance(params: {
    operation: string;
    duration: number;
    success: boolean;
    errorType?: string;
    resourceUsage?: {
      cpu?: number;
      memory?: number;
      io?: number;
    };
    tags?: Record<string, string>;
    metadata?: Record<string, any>;
  }): PerformanceMetric {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      name: 'performance',
      value: params.duration,
      timestamp: new Date(),
      operation: params.operation,
      duration: params.duration,
      success: params.success,
      errorType: params.errorType,
      resourceUsage: params.resourceUsage,
      tags: {
        ...params.tags,
        operation: params.operation,
        success: String(params.success)
      },
      metadata: params.metadata
    };

    this.addMetric(this.performanceMetrics, params.operation, metric);
    return metric;
  }

  /**
   * Get usage metrics summary
   */
  getUsageSummary(action?: string, hours: number = 24): MetricsSummary {
    const metrics = action
      ? this.usageMetrics.get(action) || []
      : Array.from(this.usageMetrics.values()).flat();

    return this.calculateSummary('usage', metrics, hours);
  }

  /**
   * Get search metrics summary
   */
  getSearchSummary(hours: number = 24): MetricsSummary & {
    totalSearches: number;
    uniqueQueries: number;
    avgResultsCount: number;
    avgCTR: number;
    avgLatency: number;
  } {
    const metrics = Array.from(this.searchMetrics.values()).flat();
    const recentMetrics = this.filterByTime(metrics, hours);
    const summary = this.calculateSummary('search', recentMetrics, hours);

    const uniqueQueries = new Set(recentMetrics.map(m => m.query.toLowerCase())).size;
    const avgResultsCount = this.calculateAverage(recentMetrics.map(m => m.resultsCount));
    const avgCTR = this.calculateAverage(
      recentMetrics.filter(m => m.clickThroughRate !== undefined).map(m => m.clickThroughRate!)
    );
    const avgLatency = this.calculateAverage(recentMetrics.map(m => m.latency));

    return {
      ...summary,
      totalSearches: recentMetrics.length,
      uniqueQueries,
      avgResultsCount,
      avgCTR,
      avgLatency
    };
  }

  /**
   * Get API metrics summary
   */
  getAPISummary(endpoint?: string, hours: number = 24): MetricsSummary & {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    requestsByMethod: Record<string, number>;
    requestsByStatus: Record<number, number>;
    errorRate: number;
  } {
    const metrics = endpoint
      ? this.apiMetrics.get(endpoint) || []
      : Array.from(this.apiMetrics.values()).flat();

    const recentMetrics = this.filterByTime(metrics, hours);
    const summary = this.calculateSummary('api', recentMetrics, hours);

    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter(m => m.statusCode >= 200 && m.statusCode < 300).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const errorRate = 100 - successRate;
    const avgResponseTime = this.calculateAverage(recentMetrics.map(m => m.responseTime));

    const requestsByMethod: Record<string, number> = {};
    const requestsByStatus: Record<number, number> = {};

    for (const metric of recentMetrics) {
      requestsByMethod[metric.method] = (requestsByMethod[metric.method] || 0) + 1;
      requestsByStatus[metric.statusCode] = (requestsByStatus[metric.statusCode] || 0) + 1;
    }

    return {
      ...summary,
      totalRequests,
      successRate,
      avgResponseTime,
      requestsByMethod,
      requestsByStatus,
      errorRate
    };
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceSummary(operation?: string, hours: number = 24): MetricsSummary & {
    totalOperations: number;
    successRate: number;
    avgDuration: number;
    errorsByType: Record<string, number>;
  } {
    const metrics = operation
      ? this.performanceMetrics.get(operation) || []
      : Array.from(this.performanceMetrics.values()).flat();

    const recentMetrics = this.filterByTime(metrics, hours);
    const summary = this.calculateSummary('performance', recentMetrics, hours);

    const totalOperations = recentMetrics.length;
    const successfulOps = recentMetrics.filter(m => m.success).length;
    const successRate = totalOperations > 0 ? (successfulOps / totalOperations) * 100 : 0;
    const avgDuration = this.calculateAverage(recentMetrics.map(m => m.duration));

    const errorsByType: Record<string, number> = {};
    for (const metric of recentMetrics) {
      if (!metric.success && metric.errorType) {
        errorsByType[metric.errorType] = (errorsByType[metric.errorType] || 0) + 1;
      }
    }

    return {
      ...summary,
      totalOperations,
      successRate,
      avgDuration,
      errorsByType
    };
  }

  /**
   * Get time series data for a metric
   */
  getTimeSeries(
    metricType: 'usage' | 'search' | 'api' | 'performance',
    intervalMinutes: number = 60,
    hours: number = 24
  ): TimeSeriesPoint[] {
    let metrics: Metric[] = [];

    switch (metricType) {
      case 'usage':
        metrics = Array.from(this.usageMetrics.values()).flat();
        break;
      case 'search':
        metrics = Array.from(this.searchMetrics.values()).flat();
        break;
      case 'api':
        metrics = Array.from(this.apiMetrics.values()).flat();
        break;
      case 'performance':
        metrics = Array.from(this.performanceMetrics.values()).flat();
        break;
    }

    const recentMetrics = this.filterByTime(metrics, hours);
    return this.aggregateTimeSeries(recentMetrics, intervalMinutes);
  }

  /**
   * Get top searches
   */
  getTopSearches(limit: number = 10, hours: number = 24): Array<{
    query: string;
    count: number;
    avgResults: number;
    avgLatency: number;
  }> {
    const metrics = Array.from(this.searchMetrics.values()).flat();
    const recentMetrics = this.filterByTime(metrics, hours);

    const queryStats = new Map<string, { count: number; totalResults: number; totalLatency: number }>();

    for (const metric of recentMetrics) {
      const query = metric.query.toLowerCase();
      const stats = queryStats.get(query) || { count: 0, totalResults: 0, totalLatency: 0 };
      stats.count++;
      stats.totalResults += metric.resultsCount;
      stats.totalLatency += metric.latency;
      queryStats.set(query, stats);
    }

    return Array.from(queryStats.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgResults: stats.totalResults / stats.count,
        avgLatency: stats.totalLatency / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get most active users
   */
  getMostActiveUsers(limit: number = 10, hours: number = 24): Array<{
    userId: string;
    actionCount: number;
    uniqueActions: number;
    totalDuration: number;
  }> {
    const metrics = Array.from(this.usageMetrics.values()).flat();
    const recentMetrics = this.filterByTime(metrics, hours);

    const userStats = new Map<string, { actions: string[]; duration: number }>();

    for (const metric of recentMetrics) {
      if (!metric.userId) continue;

      const stats = userStats.get(metric.userId) || { actions: [], duration: 0 };
      stats.actions.push(metric.action);
      stats.duration += metric.duration || 0;
      userStats.set(metric.userId, stats);
    }

    return Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        userId,
        actionCount: stats.actions.length,
        uniqueActions: new Set(stats.actions).size,
        totalDuration: stats.duration
      }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, limit);
  }

  /**
   * Get slowest API endpoints
   */
  getSlowestEndpoints(limit: number = 10, hours: number = 24): Array<{
    endpoint: string;
    avgResponseTime: number;
    requestCount: number;
    p95ResponseTime: number;
  }> {
    const metrics = Array.from(this.apiMetrics.values()).flat();
    const recentMetrics = this.filterByTime(metrics, hours);

    const endpointStats = new Map<string, number[]>();

    for (const metric of recentMetrics) {
      const times = endpointStats.get(metric.endpoint) || [];
      times.push(metric.responseTime);
      endpointStats.set(metric.endpoint, times);
    }

    return Array.from(endpointStats.entries())
      .map(([endpoint, times]) => ({
        endpoint,
        avgResponseTime: this.calculateAverage(times),
        requestCount: times.length,
        p95ResponseTime: this.calculatePercentile(times, 0.95)
      }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clearAll(): void {
    this.usageMetrics.clear();
    this.searchMetrics.clear();
    this.apiMetrics.clear();
    this.performanceMetrics.clear();
  }

  /**
   * Clear old metrics beyond retention period
   */
  clearOldMetrics(): number {
    const cutoffTime = Date.now() - this.config.retentionPeriodDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    deletedCount += this.clearOldFromMap(this.usageMetrics, cutoffTime);
    deletedCount += this.clearOldFromMap(this.searchMetrics, cutoffTime);
    deletedCount += this.clearOldFromMap(this.apiMetrics, cutoffTime);
    deletedCount += this.clearOldFromMap(this.performanceMetrics, cutoffTime);

    return deletedCount;
  }

  /**
   * Get total metrics count
   */
  getTotalMetricsCount(): {
    usage: number;
    search: number;
    api: number;
    performance: number;
    total: number;
  } {
    const usage = Array.from(this.usageMetrics.values()).reduce((sum, arr) => sum + arr.length, 0);
    const search = Array.from(this.searchMetrics.values()).reduce((sum, arr) => sum + arr.length, 0);
    const api = Array.from(this.apiMetrics.values()).reduce((sum, arr) => sum + arr.length, 0);
    const performance = Array.from(this.performanceMetrics.values()).reduce((sum, arr) => sum + arr.length, 0);

    return {
      usage,
      search,
      api,
      performance,
      total: usage + search + api + performance
    };
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      usage: Array.from(this.usageMetrics.entries()),
      search: Array.from(this.searchMetrics.entries()),
      api: Array.from(this.apiMetrics.entries()),
      performance: Array.from(this.performanceMetrics.entries()),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Stop auto-aggregation
   */
  destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
  }

  // Private helper methods

  private addMetric<T extends Metric>(
    map: Map<string, T[]>,
    key: string,
    metric: T
  ): void {
    const metrics = map.get(key) || [];
    metrics.push(metric);
    map.set(key, metrics);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private filterByTime<T extends Metric>(metrics: T[], hours: number): T[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return metrics.filter(m => m.timestamp.getTime() >= cutoffTime);
  }

  private calculateSummary(
    metricType: string,
    metrics: Metric[],
    hours: number
  ): MetricsSummary {
    const recentMetrics = this.filterByTime(metrics, hours);
    const values = recentMetrics.map(m => m.value);

    if (values.length === 0) {
      const now = new Date();
      const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

      return {
        metricType,
        count: 0,
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        percentiles: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
        period: { start, end: now }
      };
    }

    const sortedValues = [...values].sort((a, b) => a - b);
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = total / values.length;

    const p50 = this.calculatePercentile(sortedValues, 0.50);
    const p75 = this.calculatePercentile(sortedValues, 0.75);
    const p90 = this.calculatePercentile(sortedValues, 0.90);
    const p95 = this.calculatePercentile(sortedValues, 0.95);
    const p99 = this.calculatePercentile(sortedValues, 0.99);

    return {
      metricType,
      count: values.length,
      total,
      average,
      min: sortedValues[0] ?? 0,
      max: sortedValues[sortedValues.length - 1] ?? 0,
      stdDev: this.calculateStdDev(values, average),
      percentiles: {
        p50,
        p75,
        p90,
        p95,
        p99
      },
      period: {
        start: new Date(Date.now() - hours * 60 * 60 * 1000),
        end: new Date()
      }
    };
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private calculateStdDev(numbers: number[], mean: number): number {
    if (numbers.length === 0) return 0;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const variance = squaredDiffs.reduce((sum, n) => sum + n, 0) / numbers.length;
    return Math.sqrt(variance);
  }

  private calculatePercentile(sortedNumbers: number[], percentile: number): number {
    if (sortedNumbers.length === 0) return 0;
    const index = Math.ceil(sortedNumbers.length * percentile) - 1;
    const value = sortedNumbers[Math.max(0, index)];
    return value !== undefined ? value : 0;
  }

  private aggregateTimeSeries(metrics: Metric[], intervalMinutes: number): TimeSeriesPoint[] {
    const intervalMs = intervalMinutes * 60 * 1000;
    const buckets = new Map<number, { total: number; count: number }>();

    for (const metric of metrics) {
      const bucketTime = Math.floor(metric.timestamp.getTime() / intervalMs) * intervalMs;
      const bucket = buckets.get(bucketTime) || { total: 0, count: 0 };
      bucket.total += metric.value;
      bucket.count++;
      buckets.set(bucketTime, bucket);
    }

    return Array.from(buckets.entries())
      .map(([timestamp, bucket]) => ({
        timestamp: new Date(timestamp),
        value: bucket.total / bucket.count,
        count: bucket.count
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private clearOldFromMap<T extends Metric>(
    map: Map<string, T[]>,
    cutoffTime: number
  ): number {
    let deletedCount = 0;

    for (const [key, metrics] of map.entries()) {
      const filtered = metrics.filter(m => m.timestamp.getTime() >= cutoffTime);
      deletedCount += metrics.length - filtered.length;

      if (filtered.length === 0) {
        map.delete(key);
      } else {
        map.set(key, filtered);
      }
    }

    return deletedCount;
  }

  private startAutoAggregation(): void {
    const intervalMs = this.config.aggregationIntervalMinutes * 60 * 1000;

    this.aggregationTimer = setInterval(() => {
      this.clearOldMetrics();
    }, intervalMs);
  }
}
