/**
 * Analytics System - Main Export Module
 * Comprehensive analytics, reporting, KPIs, and data export for EcommerceIQ
 */

// Export MetricsCollector
export { MetricsCollector } from './metrics-collector';
export type {
  Metric,
  UsageMetric,
  SearchMetric,
  APIMetric,
  PerformanceMetric,
  MetricsSummary,
  TimeSeriesPoint,
  MetricsCollectorConfig
} from './metrics-collector';

// Import classes and types for internal use
import { MetricsCollector } from './metrics-collector';
import { ReportGenerator, ReportType } from './report-generator';
import { KPICalculator } from './kpi-calculator';
import { DataExporter } from './export';
import type { MetricsCollectorConfig } from './metrics-collector';
import type { ReportGeneratorConfig } from './report-generator';
import type { KPICalculatorConfig } from './kpi-calculator';
import type { DataExporterConfig } from './export';

// Export ReportGenerator
export { ReportGenerator, ReportType, ReportFormat } from './report-generator';
export type {
  Report,
  ReportSection,
  ChartData,
  TableData,
  MarketAnalysisData,
  ProductPerformanceData,
  TrendAnalysisData,
  ReportGeneratorConfig
} from './report-generator';

// Export KPICalculator
export { KPICalculator, KPICategory, KPIStatus } from './kpi-calculator';
export type {
  KPI,
  KPIGoal,
  KPIBenchmark,
  KPIAlert,
  KPIThreshold,
  KPICalculatorConfig
} from './kpi-calculator';

// Export DataExporter
export { DataExporter, ExportFormat, ExportStatus } from './export';
export type {
  ExportJob,
  ExportFilter,
  ExportSchedule,
  SchedulePattern,
  ExportDestination,
  ExportOptions,
  ExportStats,
  DataExporterConfig
} from './export';

/**
 * Create a complete analytics system instance
 */
export function createAnalyticsSystem(config?: {
  metrics?: MetricsCollectorConfig;
  reports?: ReportGeneratorConfig;
  kpis?: KPICalculatorConfig;
  export?: DataExporterConfig;
}) {
  const metricsCollector = new MetricsCollector(config?.metrics);
  const reportGenerator = new ReportGenerator(config?.reports);
  const kpiCalculator = new KPICalculator(config?.kpis);
  const dataExporter = new DataExporter(config?.export);

  return {
    metrics: metricsCollector,
    reports: reportGenerator,
    kpis: kpiCalculator,
    exporter: dataExporter,

    /**
     * Destroy all analytics components
     */
    destroy: () => {
      metricsCollector.destroy();
      kpiCalculator.destroy();
      dataExporter.destroy();
    },

    /**
     * Get comprehensive analytics dashboard data
     */
    getDashboard: () => {
      const now = new Date();
      const last24Hours = 24;

      return {
        timestamp: now,
        metrics: {
          usage: metricsCollector.getUsageSummary(undefined, last24Hours),
          search: metricsCollector.getSearchSummary(last24Hours),
          api: metricsCollector.getAPISummary(undefined, last24Hours),
          performance: metricsCollector.getPerformanceSummary(undefined, last24Hours),
          totals: metricsCollector.getTotalMetricsCount()
        },
        kpis: {
          summary: kpiCalculator.getDashboardSummary(),
          alerts: kpiCalculator.getActiveAlerts(),
          criticalAlerts: kpiCalculator.getActiveAlerts('critical')
        },
        reports: {
          recent: reportGenerator.listReports().slice(0, 10),
          byType: {
            market_analysis: reportGenerator.listReports(ReportType.MARKET_ANALYSIS).length,
            product_performance: reportGenerator.listReports(ReportType.PRODUCT_PERFORMANCE).length,
            trend_analysis: reportGenerator.listReports(ReportType.TREND_ANALYSIS).length
          }
        },
        exports: {
          stats: dataExporter.getStats(),
          recent: dataExporter.listJobs({ limit: 10 }),
          scheduled: dataExporter.listSchedules(true)
        }
      };
    },

    /**
     * Generate comprehensive system health report
     */
    generateHealthReport: () => {
      const dashboard = {
        metrics: {
          usage: metricsCollector.getUsageSummary(undefined, 24),
          search: metricsCollector.getSearchSummary(24),
          api: metricsCollector.getAPISummary(undefined, 24),
          performance: metricsCollector.getPerformanceSummary(undefined, 24)
        },
        kpis: kpiCalculator.getDashboardSummary()
      };

      const healthReport = {
        timestamp: new Date(),
        status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
        metrics: {
          apiSuccessRate: dashboard.metrics.api.successRate,
          avgResponseTime: dashboard.metrics.api.avgResponseTime,
          errorRate: dashboard.metrics.api.errorRate,
          activeUsers: dashboard.metrics.usage.count
        },
        kpis: {
          total: dashboard.kpis.totalKPIs,
          critical: dashboard.kpis.byStatus.critical || 0,
          warnings: dashboard.kpis.byStatus.warning || 0,
          activeAlerts: dashboard.kpis.activeAlerts
        },
        issues: [] as string[]
      };

      // Determine health status
      if (healthReport.metrics.errorRate > 5) {
        healthReport.status = 'unhealthy';
        healthReport.issues.push('High error rate detected');
      } else if (healthReport.metrics.errorRate > 2) {
        healthReport.status = 'degraded';
        healthReport.issues.push('Elevated error rate');
      }

      if (healthReport.metrics.avgResponseTime > 1000) {
        healthReport.status = 'degraded';
        healthReport.issues.push('High response times detected');
      }

      if (healthReport.kpis.critical > 0) {
        healthReport.status = 'degraded';
        healthReport.issues.push(`${healthReport.kpis.critical} critical KPIs`);
      }

      if (healthReport.kpis.activeAlerts > 5) {
        healthReport.status = 'degraded';
        healthReport.issues.push(`${healthReport.kpis.activeAlerts} active alerts`);
      }

      return healthReport;
    },

    /**
     * Export analytics data
     */
    exportAnalytics: async (format: 'json' | 'csv') => {
      const dashboard = {
        metrics: {
          usage: metricsCollector.getUsageSummary(undefined, 24),
          search: metricsCollector.getSearchSummary(24),
          api: metricsCollector.getAPISummary(undefined, 24),
          performance: metricsCollector.getPerformanceSummary(undefined, 24)
        },
        kpis: kpiCalculator.getDashboardSummary()
      };

      if (format === 'json') {
        return JSON.stringify(dashboard, null, 2);
      } else {
        // Simple CSV export of key metrics
        const lines = [
          'Metric,Value,Unit',
          `Total Metrics,${metricsCollector.getTotalMetricsCount().total},count`,
          `API Success Rate,${dashboard.metrics.api.successRate.toFixed(2)},%`,
          `Avg Response Time,${dashboard.metrics.api.avgResponseTime.toFixed(2)},ms`,
          `Total Searches,${dashboard.metrics.search.totalSearches},count`,
          `Active KPIs,${dashboard.kpis.totalKPIs},count`,
          `Active Alerts,${dashboard.kpis.activeAlerts},count`
        ];
        return lines.join('\n');
      }
    }
  };
}

/**
 * Analytics system singleton instance
 */
let analyticsInstance: ReturnType<typeof createAnalyticsSystem> | null = null;

/**
 * Get or create analytics system singleton
 */
export function getAnalytics(config?: Parameters<typeof createAnalyticsSystem>[0]): ReturnType<typeof createAnalyticsSystem> {
  if (!analyticsInstance) {
    analyticsInstance = createAnalyticsSystem(config);
  }
  return analyticsInstance;
}

/**
 * Reset analytics singleton (useful for testing)
 */
export function resetAnalytics(): void {
  if (analyticsInstance) {
    analyticsInstance.destroy();
    analyticsInstance = null;
  }
}
