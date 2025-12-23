/**
 * Risk Monitoring System
 * Real-time risk score tracking, alerts, trend analysis, and dashboard metrics
 */

import { SupplierRiskProfile } from './risk-scorer';
import { GeoRiskAssessment } from './geo-risk';

export interface RiskAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'threshold_breach' | 'rapid_increase' | 'new_event' | 'supplier_status';
  supplierId?: string;
  supplierName?: string;
  title: string;
  message: string;
  currentRisk: number;
  previousRisk?: number;
  riskChange?: number;
  triggeredAt: string;
  acknowledged: boolean;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface RiskThreshold {
  level: 'low' | 'medium' | 'high' | 'critical';
  minScore: number;
  maxScore: number;
  actions: string[];
  notificationChannels: string[];
}

export interface RiskTrend {
  supplierId: string;
  supplierName: string;
  timeSeriesData: {
    timestamp: string;
    riskScore: number;
    geoRisk: number;
    economicRisk: number;
    tradeRisk: number;
    operationalRisk: number;
    financialRisk: number;
  }[];
  trend: 'improving' | 'stable' | 'deteriorating';
  trendStrength: number;      // 0-100
  volatility: number;          // Standard deviation
  forecastedRisk: number;      // 30-day forecast
}

export interface DashboardMetrics {
  timestamp: string;
  summary: {
    totalSuppliers: number;
    averageRisk: number;
    criticalSuppliers: number;
    highRiskSuppliers: number;
    mediumRiskSuppliers: number;
    lowRiskSuppliers: number;
  };
  activeAlerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  topRisks: {
    supplierId: string;
    name: string;
    riskScore: number;
    change24h: number;
  }[];
  riskByRegion: {
    region: string;
    averageRisk: number;
    supplierCount: number;
  }[];
  riskByCategory: {
    category: string;
    score: number;
  }[];
  trends: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

export interface MonitoringConfig {
  updateIntervalMs: number;
  alertThresholds: RiskThreshold[];
  trackHistoricalDays: number;
  enableRealTimeAlerts: boolean;
  enableTrendAnalysis: boolean;
  dashboardRefreshIntervalMs: number;
}

export class RiskMonitoring {
  private riskHistory: Map<string, SupplierRiskProfile[]> = new Map();
  private alerts: RiskAlert[] = [];
  private config: MonitoringConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private callbacks: Map<string, (alert: RiskAlert) => void> = new Map();

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      updateIntervalMs: 3600000,        // 1 hour default
      trackHistoricalDays: 90,          // 90 days of history
      enableRealTimeAlerts: true,
      enableTrendAnalysis: true,
      dashboardRefreshIntervalMs: 60000, // 1 minute
      alertThresholds: [
        {
          level: 'low',
          minScore: 0,
          maxScore: 25,
          actions: ['log'],
          notificationChannels: []
        },
        {
          level: 'medium',
          minScore: 25,
          maxScore: 50,
          actions: ['log', 'notify'],
          notificationChannels: ['email']
        },
        {
          level: 'high',
          minScore: 50,
          maxScore: 75,
          actions: ['log', 'notify', 'escalate'],
          notificationChannels: ['email', 'slack']
        },
        {
          level: 'critical',
          minScore: 75,
          maxScore: 100,
          actions: ['log', 'notify', 'escalate', 'alert_management'],
          notificationChannels: ['email', 'slack', 'sms', 'pagerduty']
        }
      ],
      ...config
    };
  }

  /**
   * Update risk score for a supplier and check for alerts
   */
  updateRiskScore(riskProfile: SupplierRiskProfile): RiskAlert[] {
    const supplierId = riskProfile.supplierId;

    // Get historical data
    let history = this.riskHistory.get(supplierId) || [];

    // Add new profile to history
    history.push(riskProfile);

    // Trim history to configured retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.trackHistoricalDays);
    history = history.filter(h => new Date(h.calculatedAt) >= cutoffDate);

    this.riskHistory.set(supplierId, history);

    // Check for alerts
    const newAlerts: RiskAlert[] = [];

    if (this.config.enableRealTimeAlerts) {
      // Threshold breach alerts
      const thresholdAlert = this.checkThresholdBreach(riskProfile);
      if (thresholdAlert) {
        newAlerts.push(thresholdAlert);
      }

      // Rapid increase alerts
      if (history.length >= 2) {
        const rapidIncreaseAlert = this.checkRapidIncrease(history, riskProfile);
        if (rapidIncreaseAlert) {
          newAlerts.push(rapidIncreaseAlert);
        }
      }
    }

    // Store alerts
    newAlerts.forEach(alert => {
      this.alerts.push(alert);
      this.triggerCallbacks(alert);
    });

    return newAlerts;
  }

  /**
   * Check if risk score breached threshold
   */
  private checkThresholdBreach(profile: SupplierRiskProfile): RiskAlert | null {
    const threshold = this.config.alertThresholds.find(
      t => profile.overallScore >= t.minScore && profile.overallScore < t.maxScore
    );

    if (!threshold) return null;

    // Only alert on high and critical
    if (threshold.level === 'low' || threshold.level === 'medium') {
      return null;
    }

    return {
      id: `alert-${Date.now()}-${profile.supplierId}`,
      severity: threshold.level,
      type: 'threshold_breach',
      supplierId: profile.supplierId,
      supplierName: profile.supplierName,
      title: `${threshold.level.toUpperCase()} Risk Level: ${profile.supplierName}`,
      message: `Supplier risk score of ${profile.overallScore.toFixed(1)} exceeds ${threshold.level} threshold`,
      currentRisk: profile.overallScore,
      triggeredAt: new Date().toISOString(),
      acknowledged: false,
      metadata: {
        threshold: threshold.level,
        factors: profile.factors
      }
    };
  }

  /**
   * Check for rapid risk increase
   */
  private checkRapidIncrease(
    history: SupplierRiskProfile[],
    current: SupplierRiskProfile
  ): RiskAlert | null {
    const previous = history[history.length - 2];
    const riskChange = current.overallScore - previous.overallScore;

    // Alert if risk increased by more than 15 points
    if (riskChange > 15) {
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      if (riskChange > 30) severity = 'critical';
      else if (riskChange > 25) severity = 'high';

      return {
        id: `alert-${Date.now()}-${current.supplierId}`,
        severity,
        type: 'rapid_increase',
        supplierId: current.supplierId,
        supplierName: current.supplierName,
        title: `Rapid Risk Increase: ${current.supplierName}`,
        message: `Risk score increased by ${riskChange.toFixed(1)} points from ${previous.overallScore.toFixed(1)} to ${current.overallScore.toFixed(1)}`,
        currentRisk: current.overallScore,
        previousRisk: previous.overallScore,
        riskChange,
        triggeredAt: new Date().toISOString(),
        acknowledged: false,
        metadata: {
          timespan: this.calculateTimespan(previous.calculatedAt, current.calculatedAt)
        }
      };
    }

    return null;
  }

  /**
   * Calculate timespan between two timestamps
   */
  private calculateTimespan(start: string, end: string): string {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  /**
   * Analyze risk trends for a supplier
   */
  analyzeTrend(supplierId: string): RiskTrend | null {
    const history = this.riskHistory.get(supplierId);

    if (!history || history.length < 3) {
      return null;
    }

    const supplier = history[history.length - 1];

    // Extract time series data
    const timeSeriesData = history.map(h => ({
      timestamp: h.calculatedAt,
      riskScore: h.overallScore,
      geoRisk: h.factors.geoRisk,
      economicRisk: h.factors.economicRisk,
      tradeRisk: h.factors.tradeRisk,
      operationalRisk: h.factors.operationalRisk,
      financialRisk: h.factors.financialRisk
    }));

    // Calculate trend using linear regression
    const trend = this.calculateTrendDirection(timeSeriesData.map(d => d.riskScore));
    const trendStrength = this.calculateTrendStrength(timeSeriesData.map(d => d.riskScore));
    const volatility = this.calculateVolatility(timeSeriesData.map(d => d.riskScore));

    // Simple 30-day forecast (linear extrapolation)
    const forecastedRisk = this.forecastRisk(timeSeriesData.map(d => d.riskScore));

    return {
      supplierId,
      supplierName: supplier.supplierName,
      timeSeriesData,
      trend,
      trendStrength,
      volatility,
      forecastedRisk
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(scores: number[]): 'improving' | 'stable' | 'deteriorating' {
    if (scores.length < 2) return 'stable';

    const recent = scores.slice(-5); // Last 5 data points
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const first = recent[0];
    const last = recent[recent.length - 1];

    const change = last - first;

    if (change < -5) return 'improving';  // Risk decreasing
    if (change > 5) return 'deteriorating'; // Risk increasing
    return 'stable';
  }

  /**
   * Calculate trend strength (0-100)
   */
  private calculateTrendStrength(scores: number[]): number {
    if (scores.length < 2) return 0;

    // Calculate R-squared for linear regression
    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = scores;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yPred = x.map(xi => slope * xi + intercept);
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - yPred[i], 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - sumY / n, 2), 0);

    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

    return Math.round(Math.abs(rSquared) * 100);
  }

  /**
   * Calculate volatility (standard deviation)
   */
  private calculateVolatility(scores: number[]): number {
    if (scores.length < 2) return 0;

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

    return Math.sqrt(variance);
  }

  /**
   * Forecast risk using simple linear extrapolation
   */
  private forecastRisk(scores: number[]): number {
    if (scores.length < 3) return scores[scores.length - 1];

    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = scores;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Forecast 30 steps ahead (assuming daily data)
    const forecast = slope * (n + 30) + intercept;

    return Math.min(100, Math.max(0, forecast));
  }

  /**
   * Generate dashboard metrics
   */
  generateDashboardMetrics(
    allRiskProfiles: SupplierRiskProfile[],
    geoAssessments?: Map<string, GeoRiskAssessment>
  ): DashboardMetrics {
    const total = allRiskProfiles.length;

    // Count by risk level
    let critical = 0, high = 0, medium = 0, low = 0;
    allRiskProfiles.forEach(profile => {
      switch (profile.riskLevel) {
        case 'critical': critical++; break;
        case 'high': high++; break;
        case 'medium': medium++; break;
        case 'low': low++; break;
      }
    });

    // Average risk
    const averageRisk = total > 0
      ? allRiskProfiles.reduce((sum, p) => sum + p.overallScore, 0) / total
      : 0;

    // Count active alerts
    const now = new Date();
    const activeAlerts = this.alerts.filter(a => !a.acknowledged);
    const alertCounts = {
      critical: activeAlerts.filter(a => a.severity === 'critical').length,
      high: activeAlerts.filter(a => a.severity === 'high').length,
      medium: activeAlerts.filter(a => a.severity === 'medium').length,
      low: activeAlerts.filter(a => a.severity === 'low').length
    };

    // Top risks (highest scores with recent changes)
    const topRisks = allRiskProfiles
      .map(profile => {
        const history = this.riskHistory.get(profile.supplierId) || [];
        const change24h = history.length >= 2
          ? profile.overallScore - history[history.length - 2].overallScore
          : 0;

        return {
          supplierId: profile.supplierId,
          name: profile.supplierName,
          riskScore: profile.overallScore,
          change24h
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Risk by region
    const regionMap = new Map<string, { total: number; count: number }>();
    allRiskProfiles.forEach(profile => {
      const region = this.getRegion(profile.countryCode);
      const current = regionMap.get(region) || { total: 0, count: 0 };
      current.total += profile.overallScore;
      current.count++;
      regionMap.set(region, current);
    });

    const riskByRegion = Array.from(regionMap.entries()).map(([region, data]) => ({
      region,
      averageRisk: data.total / data.count,
      supplierCount: data.count
    }));

    // Risk by category
    const avgFactors = this.calculateAverageFactors(allRiskProfiles);
    const riskByCategory = [
      { category: 'Geographic', score: avgFactors.geoRisk },
      { category: 'Economic', score: avgFactors.economicRisk },
      { category: 'Trade', score: avgFactors.tradeRisk },
      { category: 'Operational', score: avgFactors.operationalRisk },
      { category: 'Financial', score: avgFactors.financialRisk }
    ];

    // Trends (simplified - in production, calculate actual changes)
    const trends = {
      last24h: this.calculateRecentTrend(allRiskProfiles, 1),
      last7d: this.calculateRecentTrend(allRiskProfiles, 7),
      last30d: this.calculateRecentTrend(allRiskProfiles, 30)
    };

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuppliers: total,
        averageRisk: Math.round(averageRisk * 10) / 10,
        criticalSuppliers: critical,
        highRiskSuppliers: high,
        mediumRiskSuppliers: medium,
        lowRiskSuppliers: low
      },
      activeAlerts: alertCounts,
      topRisks,
      riskByRegion,
      riskByCategory,
      trends
    };
  }

  /**
   * Get region from country code
   */
  private getRegion(countryCode: string): string {
    const regionMap: Record<string, string> = {
      'US': 'North America',
      'CA': 'North America',
      'MX': 'North America',
      'CN': 'East Asia',
      'JP': 'East Asia',
      'KR': 'East Asia',
      'IN': 'South Asia',
      'VN': 'Southeast Asia',
      'TH': 'Southeast Asia',
      'DE': 'Europe',
      'FR': 'Europe',
      'GB': 'Europe'
    };

    return regionMap[countryCode] || 'Other';
  }

  /**
   * Calculate average risk factors
   */
  private calculateAverageFactors(profiles: SupplierRiskProfile[]) {
    if (profiles.length === 0) {
      return {
        geoRisk: 0,
        economicRisk: 0,
        tradeRisk: 0,
        operationalRisk: 0,
        financialRisk: 0
      };
    }

    const sum = profiles.reduce((acc, p) => ({
      geoRisk: acc.geoRisk + p.factors.geoRisk,
      economicRisk: acc.economicRisk + p.factors.economicRisk,
      tradeRisk: acc.tradeRisk + p.factors.tradeRisk,
      operationalRisk: acc.operationalRisk + p.factors.operationalRisk,
      financialRisk: acc.financialRisk + p.factors.financialRisk
    }), { geoRisk: 0, economicRisk: 0, tradeRisk: 0, operationalRisk: 0, financialRisk: 0 });

    return {
      geoRisk: sum.geoRisk / profiles.length,
      economicRisk: sum.economicRisk / profiles.length,
      tradeRisk: sum.tradeRisk / profiles.length,
      operationalRisk: sum.operationalRisk / profiles.length,
      financialRisk: sum.financialRisk / profiles.length
    };
  }

  /**
   * Calculate recent trend
   */
  private calculateRecentTrend(profiles: SupplierRiskProfile[], days: number): number {
    // Simplified - in production, compare with historical data
    return Math.random() * 10 - 5; // Random change between -5 and +5
  }

  /**
   * Register alert callback
   */
  onAlert(callbackId: string, callback: (alert: RiskAlert) => void): void {
    this.callbacks.set(callbackId, callback);
  }

  /**
   * Trigger registered callbacks
   */
  private triggerCallbacks(alert: RiskAlert): void {
    this.callbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
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
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): RiskAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Get alerts for specific supplier
   */
  getSupplierAlerts(supplierId: string): RiskAlert[] {
    return this.alerts.filter(a => a.supplierId === supplierId);
  }

  /**
   * Clear old resolved alerts
   */
  clearResolvedAlerts(olderThanDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const before = this.alerts.length;
    this.alerts = this.alerts.filter(
      a => !a.resolvedAt || new Date(a.resolvedAt) >= cutoffDate
    );

    return before - this.alerts.length;
  }
}
