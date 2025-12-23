/**
 * KPI Calculation and Tracking System
 * Define and calculate KPIs, benchmark comparisons, goal tracking, and alerts
 */

export interface KPI {
  id: string;
  name: string;
  description: string;
  category: KPICategory;
  value: number;
  unit: string;
  timestamp: Date;
  target?: number;
  benchmark?: number;
  trend?: 'up' | 'down' | 'stable';
  status?: KPIStatus;
  metadata?: Record<string, any>;
}

export enum KPICategory {
  REVENUE = 'revenue',
  GROWTH = 'growth',
  ENGAGEMENT = 'engagement',
  PERFORMANCE = 'performance',
  QUALITY = 'quality',
  EFFICIENCY = 'efficiency',
  CUSTOMER = 'customer'
}

export enum KPIStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export interface KPIGoal {
  kpiId: string;
  target: number;
  deadline: Date;
  description: string;
  createdAt: Date;
  achieved?: boolean;
  achievedAt?: Date;
}

export interface KPIBenchmark {
  kpiId: string;
  industry: string;
  value: number;
  source: string;
  updatedAt: Date;
}

export interface KPIAlert {
  id: string;
  kpiId: string;
  type: 'threshold' | 'trend' | 'goal';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  triggeredAt: Date;
  acknowledged?: boolean;
  metadata?: Record<string, any>;
}

export interface KPIThreshold {
  kpiId: string;
  excellent: number;
  good: number;
  warning: number;
  critical: number;
  operator: 'gt' | 'lt'; // Greater than or less than for positive KPIs
}

export interface KPICalculatorConfig {
  enableAutoAlerts?: boolean;
  alertCheckIntervalMinutes?: number;
  trendWindowDays?: number;
  trendStableThreshold?: number; // Percentage change for "stable" trend
}

export class KPICalculator {
  private kpis: Map<string, KPI[]>;
  private goals: Map<string, KPIGoal>;
  private benchmarks: Map<string, KPIBenchmark[]>;
  private thresholds: Map<string, KPIThreshold>;
  private alerts: KPIAlert[];
  private config: Required<KPICalculatorConfig>;
  private alertTimer?: NodeJS.Timeout;

  constructor(config: KPICalculatorConfig = {}) {
    this.kpis = new Map();
    this.goals = new Map();
    this.benchmarks = new Map();
    this.thresholds = new Map();
    this.alerts = [];

    this.config = {
      enableAutoAlerts: config.enableAutoAlerts ?? true,
      alertCheckIntervalMinutes: config.alertCheckIntervalMinutes ?? 30,
      trendWindowDays: config.trendWindowDays ?? 7,
      trendStableThreshold: config.trendStableThreshold ?? 5
    };

    this.initializeDefaultKPIs();
    this.initializeDefaultThresholds();

    if (this.config.enableAutoAlerts) {
      this.startAlertMonitoring();
    }
  }

  /**
   * Calculate and record a KPI
   */
  calculateKPI(params: {
    name: string;
    description: string;
    category: KPICategory;
    value: number;
    unit: string;
    target?: number;
    metadata?: Record<string, any>;
  }): KPI {
    const kpi: KPI = {
      id: this.generateId(),
      name: params.name,
      description: params.description,
      category: params.category,
      value: params.value,
      unit: params.unit,
      timestamp: new Date(),
      target: params.target,
      metadata: params.metadata
    };

    // Calculate trend
    const history = this.kpis.get(params.name) || [];
    kpi.trend = this.calculateTrend(history, params.value);

    // Get benchmark if available
    const benchmarks = this.benchmarks.get(params.name);
    if (benchmarks && benchmarks.length > 0) {
      const firstBenchmark = benchmarks[0];
      if (firstBenchmark) {
        kpi.benchmark = firstBenchmark.value;
      }
    }

    // Determine status
    kpi.status = this.determineStatus(params.name, params.value);

    // Add to history
    history.push(kpi);
    this.kpis.set(params.name, history);

    // Check for alerts
    if (this.config.enableAutoAlerts) {
      this.checkKPIAlerts(kpi);
    }

    return kpi;
  }

  /**
   * Calculate revenue KPIs
   */
  calculateRevenueKPIs(data: {
    totalRevenue: number;
    previousRevenue?: number;
    averageOrderValue?: number;
    transactionCount?: number;
  }): KPI[] {
    const kpis: KPI[] = [];

    // Total Revenue
    kpis.push(this.calculateKPI({
      name: 'total_revenue',
      description: 'Total revenue generated',
      category: KPICategory.REVENUE,
      value: data.totalRevenue,
      unit: 'USD'
    }));

    // Revenue Growth Rate
    if (data.previousRevenue !== undefined) {
      const growthRate = ((data.totalRevenue - data.previousRevenue) / data.previousRevenue) * 100;
      kpis.push(this.calculateKPI({
        name: 'revenue_growth_rate',
        description: 'Revenue growth rate',
        category: KPICategory.GROWTH,
        value: growthRate,
        unit: '%',
        target: 10
      }));
    }

    // Average Order Value
    if (data.averageOrderValue !== undefined && data.averageOrderValue !== null) {
      kpis.push(this.calculateKPI({
        name: 'average_order_value',
        description: 'Average order value',
        category: KPICategory.REVENUE,
        value: data.averageOrderValue,
        unit: 'USD'
      }));
    }

    // Transaction Count
    if (data.transactionCount !== undefined) {
      kpis.push(this.calculateKPI({
        name: 'transaction_count',
        description: 'Total number of transactions',
        category: KPICategory.REVENUE,
        value: data.transactionCount,
        unit: 'count'
      }));
    }

    return kpis;
  }

  /**
   * Calculate engagement KPIs
   */
  calculateEngagementKPIs(data: {
    activeUsers: number;
    totalUsers?: number;
    averageSessionDuration?: number;
    sessionsPerUser?: number;
    bounceRate?: number;
  }): KPI[] {
    const kpis: KPI[] = [];

    // Active Users
    kpis.push(this.calculateKPI({
      name: 'active_users',
      description: 'Number of active users',
      category: KPICategory.ENGAGEMENT,
      value: data.activeUsers,
      unit: 'users'
    }));

    // User Engagement Rate
    if (data.totalUsers !== undefined) {
      const engagementRate = (data.activeUsers / data.totalUsers) * 100;
      kpis.push(this.calculateKPI({
        name: 'user_engagement_rate',
        description: 'Percentage of engaged users',
        category: KPICategory.ENGAGEMENT,
        value: engagementRate,
        unit: '%',
        target: 50
      }));
    }

    // Average Session Duration
    if (data.averageSessionDuration !== undefined) {
      kpis.push(this.calculateKPI({
        name: 'avg_session_duration',
        description: 'Average session duration',
        category: KPICategory.ENGAGEMENT,
        value: data.averageSessionDuration,
        unit: 'seconds'
      }));
    }

    // Sessions Per User
    if (data.sessionsPerUser !== undefined) {
      kpis.push(this.calculateKPI({
        name: 'sessions_per_user',
        description: 'Average sessions per user',
        category: KPICategory.ENGAGEMENT,
        value: data.sessionsPerUser,
        unit: 'sessions'
      }));
    }

    // Bounce Rate
    if (data.bounceRate !== undefined) {
      kpis.push(this.calculateKPI({
        name: 'bounce_rate',
        description: 'Percentage of single-page sessions',
        category: KPICategory.ENGAGEMENT,
        value: data.bounceRate,
        unit: '%',
        target: 40
      }));
    }

    return kpis;
  }

  /**
   * Calculate performance KPIs
   */
  calculatePerformanceKPIs(data: {
    averageResponseTime: number;
    errorRate: number;
    uptime?: number;
    throughput?: number;
  }): KPI[] {
    const kpis: KPI[] = [];

    // Average Response Time
    kpis.push(this.calculateKPI({
      name: 'avg_response_time',
      description: 'Average API response time',
      category: KPICategory.PERFORMANCE,
      value: data.averageResponseTime,
      unit: 'ms',
      target: 200
    }));

    // Error Rate
    kpis.push(this.calculateKPI({
      name: 'error_rate',
      description: 'Percentage of failed requests',
      category: KPICategory.PERFORMANCE,
      value: data.errorRate,
      unit: '%',
      target: 1
    }));

    // System Uptime
    if (data.uptime !== undefined) {
      kpis.push(this.calculateKPI({
        name: 'system_uptime',
        description: 'System availability percentage',
        category: KPICategory.PERFORMANCE,
        value: data.uptime,
        unit: '%',
        target: 99.9
      }));
    }

    // Throughput
    if (data.throughput !== undefined) {
      kpis.push(this.calculateKPI({
        name: 'throughput',
        description: 'Requests per second',
        category: KPICategory.PERFORMANCE,
        value: data.throughput,
        unit: 'req/s'
      }));
    }

    return kpis;
  }

  /**
   * Calculate customer KPIs
   */
  calculateCustomerKPIs(data: {
    customerSatisfaction: number;
    netPromoterScore?: number;
    churnRate?: number;
    retentionRate?: number;
    customerLifetimeValue?: number;
  }): KPI[] {
    const kpis: KPI[] = [];

    // Customer Satisfaction (CSAT)
    kpis.push(this.calculateKPI({
      name: 'customer_satisfaction',
      description: 'Customer satisfaction score',
      category: KPICategory.CUSTOMER,
      value: data.customerSatisfaction,
      unit: 'score',
      target: 4.5
    }));

    // Net Promoter Score (NPS)
    if (data.netPromoterScore !== undefined) {
      kpis.push(this.calculateKPI({
        name: 'net_promoter_score',
        description: 'Net promoter score',
        category: KPICategory.CUSTOMER,
        value: data.netPromoterScore,
        unit: 'score',
        target: 50
      }));
    }

    // Churn Rate
    if (data.churnRate !== undefined) {
      kpis.push(this.calculateKPI({
        name: 'churn_rate',
        description: 'Customer churn rate',
        category: KPICategory.CUSTOMER,
        value: data.churnRate,
        unit: '%',
        target: 5
      }));
    }

    // Retention Rate
    if (data.retentionRate !== undefined) {
      kpis.push(this.calculateKPI({
        name: 'retention_rate',
        description: 'Customer retention rate',
        category: KPICategory.CUSTOMER,
        value: data.retentionRate,
        unit: '%',
        target: 85
      }));
    }

    // Customer Lifetime Value (CLV)
    if (data.customerLifetimeValue !== undefined) {
      kpis.push(this.calculateKPI({
        name: 'customer_lifetime_value',
        description: 'Average customer lifetime value',
        category: KPICategory.CUSTOMER,
        value: data.customerLifetimeValue,
        unit: 'USD'
      }));
    }

    return kpis;
  }

  /**
   * Set a KPI goal
   */
  setGoal(params: {
    kpiName: string;
    target: number;
    deadline: Date;
    description: string;
  }): KPIGoal {
    const goal: KPIGoal = {
      kpiId: params.kpiName,
      target: params.target,
      deadline: params.deadline,
      description: params.description,
      createdAt: new Date()
    };

    this.goals.set(params.kpiName, goal);
    return goal;
  }

  /**
   * Add benchmark for a KPI
   */
  addBenchmark(params: {
    kpiName: string;
    industry: string;
    value: number;
    source: string;
  }): KPIBenchmark {
    const benchmark: KPIBenchmark = {
      kpiId: params.kpiName,
      industry: params.industry,
      value: params.value,
      source: params.source,
      updatedAt: new Date()
    };

    const benchmarks = this.benchmarks.get(params.kpiName) || [];
    benchmarks.push(benchmark);
    this.benchmarks.set(params.kpiName, benchmarks);

    return benchmark;
  }

  /**
   * Set threshold for a KPI
   */
  setThreshold(params: {
    kpiName: string;
    excellent: number;
    good: number;
    warning: number;
    critical: number;
    operator?: 'gt' | 'lt';
  }): KPIThreshold {
    const threshold: KPIThreshold = {
      kpiId: params.kpiName,
      excellent: params.excellent,
      good: params.good,
      warning: params.warning,
      critical: params.critical,
      operator: params.operator || 'gt'
    };

    this.thresholds.set(params.kpiName, threshold);
    return threshold;
  }

  /**
   * Get KPI history
   */
  getKPIHistory(kpiName: string, hours?: number): KPI[] {
    const history = this.kpis.get(kpiName) || [];

    if (hours === undefined) {
      return history;
    }

    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return history.filter(kpi => kpi.timestamp.getTime() >= cutoffTime);
  }

  /**
   * Get latest KPI value
   */
  getLatestKPI(kpiName: string): KPI | null {
    const history = this.kpis.get(kpiName);
    if (!history || history.length === 0) {
      return null;
    }
    const latest = history[history.length - 1];
    return latest || null;
  }

  /**
   * Get all KPIs by category
   */
  getKPIsByCategory(category: KPICategory, hours: number = 24): KPI[] {
    const kpis: KPI[] = [];
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

    for (const history of this.kpis.values()) {
      const recent = history
        .filter(kpi => kpi.category === category && kpi.timestamp.getTime() >= cutoffTime);
      kpis.push(...recent);
    }

    return kpis.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get KPI performance vs target
   */
  getPerformanceVsTarget(kpiName: string): {
    current: number;
    target?: number;
    achievement: number;
    status: 'on_track' | 'behind' | 'exceeded' | 'no_target';
  } | null {
    const latest = this.getLatestKPI(kpiName);
    if (!latest) {
      return null;
    }

    if (!latest.target) {
      return {
        current: latest.value,
        achievement: 0,
        status: 'no_target'
      };
    }

    const achievement = (latest.value / latest.target) * 100;
    let status: 'on_track' | 'behind' | 'exceeded' = 'behind';

    if (achievement >= 100) {
      status = 'exceeded';
    } else if (achievement >= 80) {
      status = 'on_track';
    }

    return {
      current: latest.value,
      target: latest.target,
      achievement,
      status
    };
  }

  /**
   * Get KPI performance vs benchmark
   */
  getPerformanceVsBenchmark(kpiName: string): {
    current: number;
    benchmark?: number;
    difference: number;
    percentDifference: number;
    status: 'above' | 'below' | 'equal' | 'no_benchmark';
  } | null {
    const latest = this.getLatestKPI(kpiName);
    if (!latest) {
      return null;
    }

    const latestValue = latest.value;
    const benchmarks = this.benchmarks.get(kpiName);
    if (!benchmarks || benchmarks.length === 0) {
      return {
        current: latestValue,
        difference: 0,
        percentDifference: 0,
        status: 'no_benchmark'
      };
    }

    const firstBenchmark = benchmarks[0];
    if (!firstBenchmark) {
      return {
        current: latestValue,
        difference: 0,
        percentDifference: 0,
        status: 'no_benchmark'
      };
    }

    const benchmark = firstBenchmark.value;
    const difference = latestValue - benchmark;
    const percentDifference = (difference / benchmark) * 100;

    let status: 'above' | 'below' | 'equal' = 'equal';
    if (difference > 0) {
      status = 'above';
    } else if (difference < 0) {
      status = 'below';
    }

    return {
      current: latestValue,
      benchmark,
      difference,
      percentDifference,
      status
    };
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(severity?: 'info' | 'warning' | 'critical'): KPIAlert[] {
    const alerts = this.alerts.filter(a => !a.acknowledged);
    return severity ? alerts.filter(a => a.severity === severity) : alerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get dashboard summary
   */
  getDashboardSummary(): {
    totalKPIs: number;
    byCategory: Record<KPICategory, number>;
    byStatus: Record<KPIStatus, number>;
    activeGoals: number;
    activeAlerts: number;
    criticalAlerts: number;
  } {
    const summary = {
      totalKPIs: this.kpis.size,
      byCategory: {} as Record<KPICategory, number>,
      byStatus: {} as Record<KPIStatus, number>,
      activeGoals: this.goals.size,
      activeAlerts: this.alerts.filter(a => !a.acknowledged).length,
      criticalAlerts: this.alerts.filter(a => !a.acknowledged && a.severity === 'critical').length
    };

    // Initialize counters
    for (const category of Object.values(KPICategory)) {
      summary.byCategory[category] = 0;
    }
    for (const status of Object.values(KPIStatus)) {
      summary.byStatus[status] = 0;
    }

    // Count KPIs by category and status
    for (const history of this.kpis.values()) {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        if (latest) {
          summary.byCategory[latest.category]++;
          if (latest.status) {
            summary.byStatus[latest.status]++;
          }
        }
      }
    }

    return summary;
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.kpis.clear();
    this.goals.clear();
    this.benchmarks.clear();
    this.alerts = [];
  }

  /**
   * Stop alert monitoring
   */
  destroy(): void {
    if (this.alertTimer) {
      clearInterval(this.alertTimer);
    }
  }

  // Private helper methods

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private initializeDefaultKPIs(): void {
    // KPI names are registered when first calculated
  }

  private initializeDefaultThresholds(): void {
    // Revenue Growth Rate
    this.setThreshold({
      kpiName: 'revenue_growth_rate',
      excellent: 20,
      good: 10,
      warning: 5,
      critical: 0,
      operator: 'gt'
    });

    // Error Rate (lower is better)
    this.setThreshold({
      kpiName: 'error_rate',
      excellent: 0.5,
      good: 1,
      warning: 3,
      critical: 5,
      operator: 'lt'
    });

    // Customer Satisfaction
    this.setThreshold({
      kpiName: 'customer_satisfaction',
      excellent: 4.5,
      good: 4.0,
      warning: 3.5,
      critical: 3.0,
      operator: 'gt'
    });

    // Response Time (lower is better)
    this.setThreshold({
      kpiName: 'avg_response_time',
      excellent: 100,
      good: 200,
      warning: 500,
      critical: 1000,
      operator: 'lt'
    });
  }

  private calculateTrend(history: KPI[], currentValue: number): 'up' | 'down' | 'stable' {
    if (history.length === 0) {
      return 'stable';
    }

    const cutoffTime = Date.now() - this.config.trendWindowDays * 24 * 60 * 60 * 1000;
    const recentHistory = history.filter(kpi => kpi.timestamp.getTime() >= cutoffTime);

    if (recentHistory.length === 0) {
      return 'stable';
    }

    const avgPrevious = recentHistory.reduce((sum, kpi) => sum + kpi.value, 0) / recentHistory.length;
    const percentChange = ((currentValue - avgPrevious) / avgPrevious) * 100;

    if (Math.abs(percentChange) < this.config.trendStableThreshold) {
      return 'stable';
    }

    return percentChange > 0 ? 'up' : 'down';
  }

  private determineStatus(kpiName: string, value: number): KPIStatus {
    const threshold = this.thresholds.get(kpiName);
    if (!threshold) {
      return KPIStatus.GOOD;
    }

    if (threshold.operator === 'gt') {
      // Higher is better
      if (value >= threshold.excellent) return KPIStatus.EXCELLENT;
      if (value >= threshold.good) return KPIStatus.GOOD;
      if (value >= threshold.warning) return KPIStatus.WARNING;
      return KPIStatus.CRITICAL;
    } else {
      // Lower is better
      if (value <= threshold.excellent) return KPIStatus.EXCELLENT;
      if (value <= threshold.good) return KPIStatus.GOOD;
      if (value <= threshold.warning) return KPIStatus.WARNING;
      return KPIStatus.CRITICAL;
    }
  }

  private checkKPIAlerts(kpi: KPI): void {
    // Check threshold alerts
    if (kpi.status === KPIStatus.CRITICAL) {
      this.createAlert({
        kpiId: kpi.name,
        type: 'threshold',
        severity: 'critical',
        message: `KPI "${kpi.name}" is in critical state: ${kpi.value} ${kpi.unit}`,
        metadata: { kpi }
      });
    } else if (kpi.status === KPIStatus.WARNING) {
      this.createAlert({
        kpiId: kpi.name,
        type: 'threshold',
        severity: 'warning',
        message: `KPI "${kpi.name}" is in warning state: ${kpi.value} ${kpi.unit}`,
        metadata: { kpi }
      });
    }

    // Check goal alerts
    const goal = this.goals.get(kpi.name);
    if (goal && !goal.achieved && goal.target !== undefined) {
      if (kpi.value >= goal.target) {
        goal.achieved = true;
        goal.achievedAt = new Date();
        this.createAlert({
          kpiId: kpi.name,
          type: 'goal',
          severity: 'info',
          message: `Goal achieved for "${kpi.name}": ${kpi.value} ${kpi.unit} (target: ${goal.target} ${kpi.unit})`,
          metadata: { kpi, goal }
        });
      } else if (goal.deadline < new Date()) {
        this.createAlert({
          kpiId: kpi.name,
          type: 'goal',
          severity: 'warning',
          message: `Goal deadline passed for "${kpi.name}": ${kpi.value} ${kpi.unit} (target: ${goal.target} ${kpi.unit})`,
          metadata: { kpi, goal }
        });
      }
    }

    // Check trend alerts
    if (kpi.trend === 'down' && kpi.status !== KPIStatus.EXCELLENT) {
      this.createAlert({
        kpiId: kpi.name,
        type: 'trend',
        severity: 'info',
        message: `Downward trend detected for "${kpi.name}"`,
        metadata: { kpi }
      });
    }
  }

  private createAlert(params: {
    kpiId: string;
    type: 'threshold' | 'trend' | 'goal';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    metadata?: Record<string, any>;
  }): void {
    const alert: KPIAlert = {
      id: this.generateId(),
      kpiId: params.kpiId,
      type: params.type,
      severity: params.severity,
      message: params.message,
      triggeredAt: new Date(),
      metadata: params.metadata
    };

    this.alerts.push(alert);
  }

  private startAlertMonitoring(): void {
    const intervalMs = this.config.alertCheckIntervalMinutes * 60 * 1000;

    this.alertTimer = setInterval(() => {
      // Periodic alert checks can be added here
      // For now, alerts are checked when KPIs are calculated
    }, intervalMs);
  }
}
