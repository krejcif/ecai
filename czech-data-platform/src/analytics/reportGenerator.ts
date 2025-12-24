/**
 * Report Generator - Generates economic reports, alerts, and visualizations
 * Creates daily reports, currency alerts, and chart-ready data
 */

import {
  ExchangeRate,
  TrendAnalysis,
  VolatilityPattern,
  RatePrediction,
  IndustryTrend,
  RegionalDensity
} from './insightEngine';

// ===== TYPES & INTERFACES =====

export interface DailyEconomicReport {
  date: Date;
  summary: string;
  exchangeRates: {
    currency: string;
    currentRate: number;
    change24h: number;
    changePercent: number;
    trend: TrendAnalysis;
  }[];
  predictions: RatePrediction[];
  volatilityAlerts: {
    currency: string;
    pattern: VolatilityPattern;
    severity: 'low' | 'medium' | 'high';
  }[];
  marketCondition: 'stable' | 'volatile' | 'trending';
  recommendations: string[];
}

export interface CurrencyAlert {
  id: string;
  timestamp: Date;
  currency: string;
  alertType: 'rate_spike' | 'rate_drop' | 'volatility_high' | 'trend_reversal';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  currentRate: number;
  threshold: number;
  metadata: {
    changePercent?: number;
    previousRate?: number;
    timeframe?: string;
  };
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface TrendVisualizationData {
  chartType: 'line' | 'bar' | 'candlestick' | 'area';
  title: string;
  xAxis: {
    label: string;
    type: 'time' | 'category';
  };
  yAxis: {
    label: string;
    type: 'linear' | 'logarithmic';
  };
  datasets: {
    name: string;
    color: string;
    data: ChartDataPoint[];
    type?: 'solid' | 'dashed' | 'dotted';
  }[];
  annotations?: {
    type: 'line' | 'area' | 'point';
    position: number | { x: number; y: number };
    label: string;
    color: string;
  }[];
}

export interface AlertThresholds {
  rateChangePercent: number; // e.g., 2% change triggers alert
  volatilityMultiplier: number; // e.g., 2x normal volatility
  trendReversalConfidence: number; // e.g., 0.8 confidence
}

// ===== DAILY ECONOMIC REPORT GENERATOR =====

export class DailyEconomicReportGenerator {
  private alertThresholds: AlertThresholds;

  constructor(thresholds?: Partial<AlertThresholds>) {
    this.alertThresholds = {
      rateChangePercent: thresholds?.rateChangePercent || 2,
      volatilityMultiplier: thresholds?.volatilityMultiplier || 2,
      trendReversalConfidence: thresholds?.trendReversalConfidence || 0.75
    };
  }

  /**
   * Generates a comprehensive daily economic report
   */
  public generateDailyReport(data: {
    exchangeRates: Map<string, ExchangeRate[]>;
    trends: Map<string, TrendAnalysis>;
    predictions: RatePrediction[];
    volatilityPatterns: Map<string, VolatilityPattern>;
  }): DailyEconomicReport {
    const reportDate = new Date();

    // Process exchange rates
    const exchangeRatesData = this.processExchangeRates(
      data.exchangeRates,
      data.trends
    );

    // Detect volatility alerts
    const volatilityAlerts = this.detectVolatilityAlerts(data.volatilityPatterns);

    // Determine overall market condition
    const marketCondition = this.assessMarketCondition(
      exchangeRatesData,
      volatilityAlerts
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      exchangeRatesData,
      data.predictions,
      marketCondition
    );

    // Create summary
    const summary = this.createSummary(
      exchangeRatesData,
      marketCondition,
      volatilityAlerts.length
    );

    return {
      date: reportDate,
      summary,
      exchangeRates: exchangeRatesData,
      predictions: data.predictions,
      volatilityAlerts,
      marketCondition,
      recommendations
    };
  }

  /**
   * Generates a formatted text version of the report
   */
  public formatReportAsText(report: DailyEconomicReport): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('        CZECH ECONOMY DAILY REPORT');
    lines.push(`        ${report.date.toLocaleDateString('cs-CZ', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })}`);
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`SUMMARY: ${report.summary}`);
    lines.push('');
    lines.push(`MARKET CONDITION: ${report.marketCondition.toUpperCase()}`);
    lines.push('');

    // Exchange Rates
    lines.push('─── EXCHANGE RATES (CZK) ───');
    for (const rate of report.exchangeRates) {
      const change = rate.changePercent >= 0 ? '+' : '';
      const arrow = rate.changePercent > 0 ? '↑' : rate.changePercent < 0 ? '↓' : '→';
      lines.push(
        `  ${rate.currency}: ${rate.currentRate.toFixed(4)} ` +
        `${arrow} ${change}${rate.changePercent.toFixed(2)}% ` +
        `(${rate.trend.direction})`
      );
    }
    lines.push('');

    // Predictions
    if (report.predictions.length > 0) {
      lines.push('─── PREDICTIONS ───');
      for (const pred of report.predictions) {
        const change = ((pred.predictedRate - pred.currentRate) / pred.currentRate * 100);
        const direction = change > 0 ? '↑' : '↓';
        lines.push(
          `  ${pred.currency} (${pred.timeHorizon}): ` +
          `${pred.predictedRate.toFixed(4)} ${direction} ` +
          `(confidence: ${(pred.confidence * 100).toFixed(0)}%)`
        );
      }
      lines.push('');
    }

    // Volatility Alerts
    if (report.volatilityAlerts.length > 0) {
      lines.push('─── VOLATILITY ALERTS ───');
      for (const alert of report.volatilityAlerts) {
        const icon = alert.severity === 'high' ? '⚠️' :
                     alert.severity === 'medium' ? '⚡' : 'ℹ️';
        lines.push(
          `  ${icon} ${alert.currency}: ${alert.pattern.type.toUpperCase()} volatility ` +
          `(σ=${alert.pattern.stdDeviation.toFixed(4)})`
        );
      }
      lines.push('');
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('─── RECOMMENDATIONS ───');
      report.recommendations.forEach((rec, i) => {
        lines.push(`  ${i + 1}. ${rec}`);
      });
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  // ===== PRIVATE HELPER METHODS =====

  private processExchangeRates(
    rates: Map<string, ExchangeRate[]>,
    trends: Map<string, TrendAnalysis>
  ): DailyEconomicReport['exchangeRates'] {
    const result: DailyEconomicReport['exchangeRates'] = [];

    for (const [currency, rateHistory] of rates.entries()) {
      if (rateHistory.length === 0) continue;

      const currentRate = rateHistory[rateHistory.length - 1].rate;
      const yesterdayRate = rateHistory.length > 1
        ? rateHistory[rateHistory.length - 2].rate
        : currentRate;

      const change24h = currentRate - yesterdayRate;
      const changePercent = (change24h / yesterdayRate) * 100;

      const trend = trends.get(currency) || {
        direction: 'neutral' as const,
        strength: 0,
        confidence: 0,
        timeframe: 'N/A',
        indicators: {}
      };

      result.push({
        currency,
        currentRate,
        change24h,
        changePercent,
        trend
      });
    }

    return result;
  }

  private detectVolatilityAlerts(
    patterns: Map<string, VolatilityPattern>
  ): DailyEconomicReport['volatilityAlerts'] {
    const alerts: DailyEconomicReport['volatilityAlerts'] = [];

    for (const [currency, pattern] of patterns.entries()) {
      alerts.push({
        currency,
        pattern,
        severity: pattern.type === 'high' ? 'high' :
                  pattern.type === 'medium' ? 'medium' : 'low'
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private assessMarketCondition(
    rates: DailyEconomicReport['exchangeRates'],
    alerts: DailyEconomicReport['volatilityAlerts']
  ): 'stable' | 'volatile' | 'trending' {
    const highVolatilityCount = alerts.filter(a => a.severity === 'high').length;
    const strongTrends = rates.filter(r => r.trend.strength > 50).length;

    if (highVolatilityCount > 0) return 'volatile';
    if (strongTrends >= rates.length / 2) return 'trending';
    return 'stable';
  }

  private generateRecommendations(
    rates: DailyEconomicReport['exchangeRates'],
    predictions: RatePrediction[],
    condition: 'stable' | 'volatile' | 'trending'
  ): string[] {
    const recommendations: string[] = [];

    if (condition === 'volatile') {
      recommendations.push('Avoid large currency exchanges during high volatility period');
      recommendations.push('Consider hedging strategies for currency exposure');
    }

    // Check for favorable exchange opportunities
    for (const pred of predictions) {
      const expectedChange = ((pred.predictedRate - pred.currentRate) / pred.currentRate) * 100;

      if (expectedChange > 1 && pred.confidence > 0.7) {
        recommendations.push(
          `Consider delaying ${pred.currency} purchases - rate expected to improve by ` +
          `${expectedChange.toFixed(2)}% in ${pred.timeHorizon}`
        );
      } else if (expectedChange < -1 && pred.confidence > 0.7) {
        recommendations.push(
          `Good time to exchange CZK to ${pred.currency} - rate expected to worsen by ` +
          `${Math.abs(expectedChange).toFixed(2)}% in ${pred.timeHorizon}`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Market conditions are normal - no special action required');
    }

    return recommendations;
  }

  private createSummary(
    rates: DailyEconomicReport['exchangeRates'],
    condition: string,
    alertCount: number
  ): string {
    const avgChange = rates.reduce((sum, r) => sum + Math.abs(r.changePercent), 0) / rates.length;

    const summaryParts: string[] = [];
    summaryParts.push(`Market is ${condition}`);
    summaryParts.push(`with average rate change of ${avgChange.toFixed(2)}%`);

    if (alertCount > 0) {
      summaryParts.push(`and ${alertCount} volatility alert(s)`);
    }

    return summaryParts.join(' ') + '.';
  }
}

// ===== CURRENCY ALERT SYSTEM =====

export class CurrencyAlertSystem {
  private alerts: CurrencyAlert[];
  private thresholds: AlertThresholds;
  private lastRates: Map<string, number>;

  constructor(thresholds?: Partial<AlertThresholds>) {
    this.alerts = [];
    this.thresholds = {
      rateChangePercent: thresholds?.rateChangePercent || 2,
      volatilityMultiplier: thresholds?.volatilityMultiplier || 2,
      trendReversalConfidence: thresholds?.trendReversalConfidence || 0.75
    };
    this.lastRates = new Map();
  }

  /**
   * Checks for significant rate changes and generates alerts
   */
  public checkRateChange(
    currency: string,
    currentRate: number,
    timestamp: Date = new Date()
  ): CurrencyAlert[] {
    const newAlerts: CurrencyAlert[] = [];

    const lastRate = this.lastRates.get(currency);
    if (lastRate !== undefined) {
      const changePercent = ((currentRate - lastRate) / lastRate) * 100;
      const absChange = Math.abs(changePercent);

      if (absChange >= this.thresholds.rateChangePercent) {
        const alertType = changePercent > 0 ? 'rate_spike' : 'rate_drop';
        const severity = absChange >= 5 ? 'critical' :
                        absChange >= 3 ? 'warning' : 'info';

        const alert: CurrencyAlert = {
          id: this.generateAlertId(),
          timestamp,
          currency,
          alertType,
          severity,
          message: `${currency} rate ${changePercent > 0 ? 'increased' : 'decreased'} by ` +
                   `${absChange.toFixed(2)}% to ${currentRate.toFixed(4)}`,
          currentRate,
          threshold: this.thresholds.rateChangePercent,
          metadata: {
            changePercent,
            previousRate: lastRate
          }
        };

        newAlerts.push(alert);
        this.alerts.push(alert);
      }
    }

    this.lastRates.set(currency, currentRate);
    return newAlerts;
  }

  /**
   * Creates an alert for high volatility detection
   */
  public createVolatilityAlert(
    currency: string,
    pattern: VolatilityPattern,
    normalVolatility: number
  ): CurrencyAlert | null {
    if (pattern.stdDeviation < normalVolatility * this.thresholds.volatilityMultiplier) {
      return null;
    }

    const severity = pattern.type === 'high' ? 'critical' :
                    pattern.type === 'medium' ? 'warning' : 'info';

    const alert: CurrencyAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      currency,
      alertType: 'volatility_high',
      severity,
      message: `${currency} showing ${pattern.type} volatility - ` +
               `standard deviation: ${pattern.stdDeviation.toFixed(4)}`,
      currentRate: (pattern.range.min + pattern.range.max) / 2,
      threshold: normalVolatility * this.thresholds.volatilityMultiplier,
      metadata: {
        timeframe: '30d'
      }
    };

    this.alerts.push(alert);
    return alert;
  }

  /**
   * Creates an alert for trend reversal
   */
  public createTrendReversalAlert(
    currency: string,
    currentRate: number,
    previousTrend: 'bullish' | 'bearish',
    newTrend: 'bullish' | 'bearish',
    confidence: number
  ): CurrencyAlert | null {
    if (previousTrend === newTrend) {
      return null;
    }

    if (confidence < this.thresholds.trendReversalConfidence) {
      return null;
    }

    const alert: CurrencyAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      currency,
      alertType: 'trend_reversal',
      severity: 'warning',
      message: `${currency} trend reversed from ${previousTrend} to ${newTrend} ` +
               `(confidence: ${(confidence * 100).toFixed(0)}%)`,
      currentRate,
      threshold: this.thresholds.trendReversalConfidence,
      metadata: {}
    };

    this.alerts.push(alert);
    return alert;
  }

  /**
   * Gets all alerts, optionally filtered by severity and time range
   */
  public getAlerts(options?: {
    severity?: 'info' | 'warning' | 'critical';
    since?: Date;
    currency?: string;
  }): CurrencyAlert[] {
    let filtered = [...this.alerts];

    if (options?.severity) {
      filtered = filtered.filter(a => a.severity === options.severity);
    }

    if (options?.since) {
      filtered = filtered.filter(a => a.timestamp >= options.since);
    }

    if (options?.currency) {
      filtered = filtered.filter(a => a.currency === options.currency);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clears old alerts (older than specified days)
   */
  public clearOldAlerts(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialLength = this.alerts.length;
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoffDate);

    return initialLength - this.alerts.length;
  }

  // ===== PRIVATE HELPER METHODS =====

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ===== TREND VISUALIZATION DATA FORMATTER =====

export class TrendVisualization {
  /**
   * Formats exchange rate data for line chart visualization
   */
  public formatExchangeRateChart(
    rates: Map<string, ExchangeRate[]>,
    options?: {
      currencies?: string[];
      days?: number;
      showMovingAverage?: boolean;
    }
  ): TrendVisualizationData {
    const currencies = options?.currencies || Array.from(rates.keys());
    const days = options?.days || 30;

    const datasets: TrendVisualizationData['datasets'] = [];
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

    currencies.forEach((currency, index) => {
      const rateHistory = rates.get(currency) || [];
      const recentRates = this.filterByDays(rateHistory, days);

      const data: ChartDataPoint[] = recentRates.map(r => ({
        timestamp: r.timestamp.getTime(),
        value: r.rate,
        label: r.timestamp.toLocaleDateString('cs-CZ')
      }));

      datasets.push({
        name: `CZK/${currency}`,
        color: colors[index % colors.length],
        data,
        type: 'solid'
      });

      // Add moving average if requested
      if (options?.showMovingAverage && data.length > 7) {
        const maData = this.calculateMovingAverageData(data, 7);
        datasets.push({
          name: `${currency} MA(7)`,
          color: colors[index % colors.length],
          data: maData,
          type: 'dashed'
        });
      }
    });

    return {
      chartType: 'line',
      title: 'CZK Exchange Rates',
      xAxis: {
        label: 'Date',
        type: 'time'
      },
      yAxis: {
        label: 'Rate',
        type: 'linear'
      },
      datasets
    };
  }

  /**
   * Formats industry trend data for bar chart
   */
  public formatIndustryTrendChart(
    trends: IndustryTrend[]
  ): TrendVisualizationData {
    const data: ChartDataPoint[] = trends.map((trend, index) => ({
      timestamp: index,
      value: trend.companyCount,
      label: trend.industry,
      metadata: {
        growthRate: trend.growthRate,
        avgRevenue: trend.avgRevenue,
        sentiment: trend.sentiment
      }
    }));

    return {
      chartType: 'bar',
      title: 'Companies by Industry',
      xAxis: {
        label: 'Industry',
        type: 'category'
      },
      yAxis: {
        label: 'Number of Companies',
        type: 'linear'
      },
      datasets: [{
        name: 'Company Count',
        color: '#3b82f6',
        data
      }]
    };
  }

  /**
   * Formats regional density data for visualization
   */
  public formatRegionalDensityChart(
    densities: RegionalDensity[]
  ): TrendVisualizationData {
    const data: ChartDataPoint[] = densities.map((density, index) => ({
      timestamp: index,
      value: density.economicScore,
      label: density.region,
      metadata: {
        companyCount: density.companyCount,
        density: density.density,
        industries: density.dominantIndustries
      }
    }));

    return {
      chartType: 'bar',
      title: 'Regional Economic Scores',
      xAxis: {
        label: 'Region',
        type: 'category'
      },
      yAxis: {
        label: 'Economic Score',
        type: 'linear'
      },
      datasets: [{
        name: 'Economic Score',
        color: '#10b981',
        data
      }]
    };
  }

  /**
   * Formats volatility pattern data for area chart
   */
  public formatVolatilityChart(
    patterns: Map<string, { date: Date; volatility: number }[]>
  ): TrendVisualizationData {
    const datasets: TrendVisualizationData['datasets'] = [];
    const colors = ['#ef4444', '#f59e0b', '#8b5cf6'];

    let index = 0;
    for (const [currency, volatilityHistory] of patterns.entries()) {
      const data: ChartDataPoint[] = volatilityHistory.map(v => ({
        timestamp: v.date.getTime(),
        value: v.volatility,
        label: v.date.toLocaleDateString('cs-CZ')
      }));

      datasets.push({
        name: `${currency} Volatility`,
        color: colors[index % colors.length],
        data
      });

      index++;
    }

    return {
      chartType: 'area',
      title: 'Currency Volatility Over Time',
      xAxis: {
        label: 'Date',
        type: 'time'
      },
      yAxis: {
        label: 'Volatility (σ)',
        type: 'linear'
      },
      datasets
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  private filterByDays(rates: ExchangeRate[], days: number): ExchangeRate[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return rates.filter(r => r.timestamp >= cutoffDate);
  }

  private calculateMovingAverageData(
    data: ChartDataPoint[],
    window: number
  ): ChartDataPoint[] {
    const result: ChartDataPoint[] = [];

    for (let i = window - 1; i < data.length; i++) {
      const windowData = data.slice(i - window + 1, i + 1);
      const avg = windowData.reduce((sum, d) => sum + d.value, 0) / window;

      result.push({
        timestamp: data[i].timestamp,
        value: avg,
        label: data[i].label
      });
    }

    return result;
  }
}
