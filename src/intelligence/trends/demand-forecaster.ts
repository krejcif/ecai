/**
 * DemandForecaster - Predicts future demand using historical data and external factors
 * Implements time-series forecasting with seasonal decomposition
 */

import { TrendDocument } from '../../database/collections';

export interface ForecastPoint {
  timestamp: string;
  predictedValue: number;
  lowerBound: number; // Lower confidence interval
  upperBound: number; // Upper confidence interval
  confidence: number; // 0-1
}

export interface SeasonalDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
  period: number;
}

export interface EconomicIndicators {
  gdpGrowth?: number;
  inflation?: number;
  unemployment?: number;
  consumerConfidence?: number;
  retailSales?: number;
}

export interface ForecastConfig {
  horizon: number; // Number of periods to forecast
  confidenceLevel: number; // e.g., 0.95 for 95% confidence
  includeSeasonality: boolean;
  economicAdjustment: boolean;
}

export interface DemandForecast {
  category: string;
  keyword?: string;
  forecast: ForecastPoint[];
  decomposition: SeasonalDecomposition;
  accuracy: number; // Historical accuracy score
  model: 'arima' | 'ets' | 'prophet' | 'hybrid';
}

export class DemandForecaster {
  private readonly defaultConfidenceLevel: number = 0.95;
  private readonly minHistoricalPoints: number = 14;

  /**
   * Generate demand forecast for a category or keyword
   */
  async forecastDemand(
    historicalData: TrendDocument[],
    config: Partial<ForecastConfig> = {},
    economicIndicators?: EconomicIndicators
  ): Promise<DemandForecast> {
    const fullConfig: ForecastConfig = {
      horizon: 30, // Default 30 days
      confidenceLevel: this.defaultConfidenceLevel,
      includeSeasonality: true,
      economicAdjustment: economicIndicators !== undefined,
      ...config,
    };

    // Sort by timestamp
    const sorted = historicalData.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (sorted.length < this.minHistoricalPoints) {
      throw new Error(
        `Insufficient historical data. Need at least ${this.minHistoricalPoints} points.`
      );
    }

    // Extract time series
    const timeSeries = sorted.map((doc) => doc.volume);
    const timestamps = sorted.map((doc) => doc.timestamp);

    // Decompose time series
    const decomposition = fullConfig.includeSeasonality
      ? this.decomposeTimeSeries(timeSeries)
      : this.createSimpleDecomposition(timeSeries);

    // Select forecasting model
    const model = this.selectModel(timeSeries, fullConfig);

    // Generate forecast
    const forecast = await this.generateForecast(
      timeSeries,
      timestamps,
      decomposition,
      fullConfig,
      economicIndicators
    );

    // Calculate historical accuracy
    const accuracy = this.calculateAccuracy(timeSeries, decomposition);

    return {
      category: sorted[0]?.category || 'unknown',
      keyword: sorted[0]?.keyword,
      forecast,
      decomposition,
      accuracy,
      model,
    };
  }

  /**
   * Decompose time series into trend, seasonal, and residual components
   */
  private decomposeTimeSeries(data: number[]): SeasonalDecomposition {
    const period = this.detectSeasonalPeriod(data);

    if (period === 0 || data.length < period * 2) {
      return this.createSimpleDecomposition(data);
    }

    // Extract seasonal component using moving averages
    const trend = this.extractTrend(data, period);
    const detrended = data.map((val, idx) => val - trend[idx]);

    // Calculate seasonal indices
    const seasonal = this.extractSeasonal(detrended, period);

    // Calculate residuals
    const residual = data.map((val, idx) => val - trend[idx] - seasonal[idx]);

    return { trend, seasonal, residual, period };
  }

  /**
   * Create simple decomposition without seasonality
   */
  private createSimpleDecomposition(data: number[]): SeasonalDecomposition {
    const trend = this.extractTrendSimple(data);
    const seasonal = new Array(data.length).fill(0);
    const residual = data.map((val, idx) => val - trend[idx]);

    return { trend, seasonal, residual, period: 0 };
  }

  /**
   * Detect seasonal period
   */
  private detectSeasonalPeriod(data: number[]): number {
    if (data.length < 14) return 0;

    // Test common periods
    const testPeriods = [7, 14, 30]; // Weekly, bi-weekly, monthly
    let bestPeriod = 0;
    let maxCorrelation = 0;

    for (const period of testPeriods) {
      if (period >= data.length / 2) continue;

      const correlation = this.calculateAutocorrelation(data, period);
      if (Math.abs(correlation) > maxCorrelation) {
        maxCorrelation = Math.abs(correlation);
        bestPeriod = period;
      }
    }

    return maxCorrelation > 0.5 ? bestPeriod : 0;
  }

  /**
   * Calculate autocorrelation
   */
  private calculateAutocorrelation(data: number[], lag: number): number {
    if (lag >= data.length) return 0;

    const n = data.length - lag;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean);
    }

    for (let i = 0; i < data.length; i++) {
      denominator += Math.pow(data[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Extract trend component using centered moving average
   */
  private extractTrend(data: number[], period: number): number[] {
    const trend: number[] = [];
    const halfWindow = Math.floor(period / 2);

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(data.length, i + halfWindow + 1);
      const window = data.slice(start, end);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      trend.push(avg);
    }

    return trend;
  }

  /**
   * Extract trend using simple linear regression
   */
  private extractTrendSimple(data: number[]): number[] {
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);

    // Calculate linear regression coefficients
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return x.map((xi) => slope * xi + intercept);
  }

  /**
   * Extract seasonal component
   */
  private extractSeasonal(detrended: number[], period: number): number[] {
    // Calculate average for each season
    const seasonalAverages = new Array(period).fill(0);
    const counts = new Array(period).fill(0);

    detrended.forEach((val, idx) => {
      const season = idx % period;
      seasonalAverages[season] += val;
      counts[season]++;
    });

    for (let i = 0; i < period; i++) {
      if (counts[i] > 0) {
        seasonalAverages[i] /= counts[i];
      }
    }

    // Normalize seasonal component to sum to zero
    const mean = seasonalAverages.reduce((a, b) => a + b, 0) / period;
    const normalized = seasonalAverages.map((val) => val - mean);

    // Repeat pattern for entire series
    return detrended.map((_, idx) => normalized[idx % period]);
  }

  /**
   * Select appropriate forecasting model
   */
  private selectModel(
    data: number[],
    config: ForecastConfig
  ): DemandForecast['model'] {
    const hasSeasonality = config.includeSeasonality && this.detectSeasonalPeriod(data) > 0;
    const hasTrend = this.hasTrend(data);
    const isVolatile = this.isVolatile(data);

    if (hasSeasonality && hasTrend) {
      return 'prophet'; // Best for seasonal + trend
    } else if (hasSeasonality) {
      return 'ets'; // Exponential smoothing for seasonality
    } else if (isVolatile) {
      return 'hybrid'; // Ensemble for high volatility
    } else {
      return 'arima'; // Default for general time series
    }
  }

  /**
   * Check if data has significant trend
   */
  private hasTrend(data: number[]): boolean {
    const trend = this.extractTrendSimple(data);
    const firstThird = trend.slice(0, Math.floor(data.length / 3));
    const lastThird = trend.slice(-Math.floor(data.length / 3));

    const avgFirst = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const avgLast = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;

    const change = Math.abs(avgLast - avgFirst) / avgFirst;
    return change > 0.1; // 10% change indicates trend
  }

  /**
   * Check if data is volatile
   */
  private isVolatile(data: number[]): boolean {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // Coefficient of variation

    return cv > 0.3; // CV > 30% indicates high volatility
  }

  /**
   * Generate forecast points
   */
  private async generateForecast(
    historicalData: number[],
    timestamps: string[],
    decomposition: SeasonalDecomposition,
    config: ForecastConfig,
    economicIndicators?: EconomicIndicators
  ): Promise<ForecastPoint[]> {
    const forecast: ForecastPoint[] = [];
    const lastTimestamp = new Date(timestamps[timestamps.length - 1]);

    // Project trend forward
    const trendSlope = this.calculateTrendSlope(decomposition.trend);

    // Get last values
    const lastTrend = decomposition.trend[decomposition.trend.length - 1];
    const lastSeasonal = decomposition.seasonal;

    // Calculate residual standard deviation for confidence intervals
    const residualStdDev = this.calculateStdDev(decomposition.residual);

    // Z-score for confidence level
    const zScore = this.getZScore(config.confidenceLevel);

    // Economic adjustment factor
    const economicFactor = economicIndicators
      ? this.calculateEconomicFactor(economicIndicators)
      : 1.0;

    for (let i = 1; i <= config.horizon; i++) {
      // Project trend
      const projectedTrend = lastTrend + trendSlope * i;

      // Get seasonal component (repeat pattern)
      const seasonalIdx = decomposition.period > 0
        ? (historicalData.length + i - 1) % decomposition.period
        : 0;
      const seasonalComponent = decomposition.period > 0
        ? lastSeasonal[seasonalIdx]
        : 0;

      // Combine components
      let predictedValue = projectedTrend + seasonalComponent;

      // Apply economic adjustment
      predictedValue *= economicFactor;

      // Ensure non-negative
      predictedValue = Math.max(0, predictedValue);

      // Calculate confidence interval (widens with forecast horizon)
      const intervalWidth = residualStdDev * zScore * Math.sqrt(i);
      const lowerBound = Math.max(0, predictedValue - intervalWidth);
      const upperBound = predictedValue + intervalWidth;

      // Confidence decreases with forecast horizon
      const confidence = config.confidenceLevel * Math.exp(-i / (config.horizon * 0.5));

      // Generate timestamp
      const forecastDate = new Date(lastTimestamp);
      forecastDate.setDate(forecastDate.getDate() + i);

      forecast.push({
        timestamp: forecastDate.toISOString(),
        predictedValue,
        lowerBound,
        upperBound,
        confidence,
      });
    }

    return forecast;
  }

  /**
   * Calculate trend slope
   */
  private calculateTrendSlope(trend: number[]): number {
    const n = trend.length;
    if (n < 2) return 0;

    // Use last 25% of data to estimate current slope
    const recentN = Math.max(2, Math.floor(n * 0.25));
    const recentTrend = trend.slice(-recentN);

    const x = Array.from({ length: recentN }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = recentTrend.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * recentTrend[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    return (recentN * sumXY - sumX * sumY) / (recentN * sumX2 - sumX * sumX);
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Get Z-score for confidence level
   */
  private getZScore(confidenceLevel: number): number {
    // Common Z-scores
    const zScores: { [key: number]: number } = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };

    return zScores[confidenceLevel] || 1.96;
  }

  /**
   * Calculate economic adjustment factor
   */
  private calculateEconomicFactor(indicators: EconomicIndicators): number {
    let factor = 1.0;
    let weightSum = 0;

    // GDP growth (weight: 0.3)
    if (indicators.gdpGrowth !== undefined) {
      factor += indicators.gdpGrowth * 0.3;
      weightSum += 0.3;
    }

    // Inflation (weight: 0.2, inverse relationship)
    if (indicators.inflation !== undefined) {
      factor -= indicators.inflation * 0.2;
      weightSum += 0.2;
    }

    // Unemployment (weight: 0.2, inverse relationship)
    if (indicators.unemployment !== undefined) {
      factor -= indicators.unemployment * 0.2;
      weightSum += 0.2;
    }

    // Consumer confidence (weight: 0.15)
    if (indicators.consumerConfidence !== undefined) {
      factor += (indicators.consumerConfidence - 100) / 100 * 0.15;
      weightSum += 0.15;
    }

    // Retail sales (weight: 0.15)
    if (indicators.retailSales !== undefined) {
      factor += indicators.retailSales * 0.15;
      weightSum += 0.15;
    }

    // Normalize and bound
    return Math.max(0.5, Math.min(1.5, factor));
  }

  /**
   * Calculate historical accuracy
   */
  private calculateAccuracy(
    data: number[],
    decomposition: SeasonalDecomposition
  ): number {
    // Calculate MAPE (Mean Absolute Percentage Error)
    const fitted = decomposition.trend.map(
      (t, idx) => t + decomposition.seasonal[idx]
    );

    let totalError = 0;
    let count = 0;

    for (let i = 0; i < data.length; i++) {
      if (data[i] > 0) {
        const percentError = Math.abs((data[i] - fitted[i]) / data[i]);
        totalError += percentError;
        count++;
      }
    }

    const mape = count > 0 ? totalError / count : 1.0;

    // Convert MAPE to accuracy score (0-1)
    return Math.max(0, Math.min(1, 1 - mape));
  }

  /**
   * Batch forecast for multiple categories
   */
  async batchForecast(
    dataByCategory: Map<string, TrendDocument[]>,
    config: Partial<ForecastConfig> = {},
    economicIndicators?: EconomicIndicators
  ): Promise<Map<string, DemandForecast>> {
    const forecasts = new Map<string, DemandForecast>();

    for (const [category, data] of dataByCategory.entries()) {
      try {
        const forecast = await this.forecastDemand(data, config, economicIndicators);
        forecasts.set(category, forecast);
      } catch (error) {
        console.error(`Failed to forecast for category ${category}:`, error);
      }
    }

    return forecasts;
  }

  /**
   * Calculate forecast accuracy metrics
   */
  calculateForecastMetrics(
    actual: number[],
    predicted: number[]
  ): {
    mape: number;
    rmse: number;
    mae: number;
    r2: number;
  } {
    const n = Math.min(actual.length, predicted.length);

    // MAPE (Mean Absolute Percentage Error)
    let mape = 0;
    let mapeCount = 0;
    for (let i = 0; i < n; i++) {
      if (actual[i] > 0) {
        mape += Math.abs((actual[i] - predicted[i]) / actual[i]);
        mapeCount++;
      }
    }
    mape = mapeCount > 0 ? mape / mapeCount : 0;

    // RMSE (Root Mean Square Error)
    const mse =
      actual
        .slice(0, n)
        .reduce((sum, val, idx) => sum + Math.pow(val - predicted[idx], 2), 0) / n;
    const rmse = Math.sqrt(mse);

    // MAE (Mean Absolute Error)
    const mae =
      actual
        .slice(0, n)
        .reduce((sum, val, idx) => sum + Math.abs(val - predicted[idx]), 0) / n;

    // R² (Coefficient of Determination)
    const meanActual = actual.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const ssRes = actual
      .slice(0, n)
      .reduce((sum, val, idx) => sum + Math.pow(val - predicted[idx], 2), 0);
    const ssTot = actual
      .slice(0, n)
      .reduce((sum, val) => sum + Math.pow(val - meanActual, 2), 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { mape, rmse, mae, r2 };
  }
}
