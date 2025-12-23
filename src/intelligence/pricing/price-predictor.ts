/**
 * Price prediction system for forecasting future prices
 */

import { PriceHistory, PricePoint } from './price-tracker';

export interface PricePrediction {
  productId: string;
  currentPrice: number;
  predictions: Array<{
    date: Date;
    predictedPrice: number;
    confidence: number; // 0-1
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number; // 0-1
  model: 'linear' | 'exponential' | 'seasonal' | 'moving-average';
}

export interface SeasonalPattern {
  productId: string;
  pattern: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'none';
  seasonality: number; // Strength of seasonal effect (0-1)
  peaks: Date[]; // Expected peak price dates
  troughs: Date[]; // Expected low price dates
  adjustment: number[]; // Seasonal adjustment factors
}

export interface PricePattern {
  productId: string;
  patternType: 'cyclical' | 'trending' | 'volatile' | 'stable' | 'seasonal';
  confidence: number; // 0-1
  characteristics: {
    volatility: number; // Standard deviation / mean
    autocorrelation: number; // -1 to 1
    changeFrequency: number; // Average days between significant changes
  };
}

export interface PredictorConfig {
  predictionHorizon?: number; // Days to predict ahead (default: 30)
  confidenceLevel?: number; // Confidence level for intervals (default: 0.95)
  minHistoryDays?: number; // Minimum history required (default: 14)
  seasonalPeriods?: number[]; // Periods to check for seasonality (default: [7, 30, 90, 365])
  volatilityThreshold?: number; // Threshold for volatile classification (default: 0.15)
}

export class PricePredictor {
  private config: Required<PredictorConfig>;

  constructor(config: PredictorConfig = {}) {
    this.config = {
      predictionHorizon: config.predictionHorizon ?? 30,
      confidenceLevel: config.confidenceLevel ?? 0.95,
      minHistoryDays: config.minHistoryDays ?? 14,
      seasonalPeriods: config.seasonalPeriods ?? [7, 30, 90, 365],
      volatilityThreshold: config.volatilityThreshold ?? 0.15
    };
  }

  /**
   * Predict future prices for a product
   */
  predictPrices(history: PriceHistory, days: number = this.config.predictionHorizon): PricePrediction {
    if (history.pricePoints.length < 2) {
      throw new Error('Insufficient price history for prediction');
    }

    // Check if we have enough recent history
    const historyDays = this.calculateHistoryDays(history);
    if (historyDays < this.config.minHistoryDays) {
      console.warn(`Limited history (${historyDays} days) may reduce prediction accuracy`);
    }

    // Detect patterns and choose appropriate model
    const pattern = this.identifyPattern(history);
    const seasonal = this.detectSeasonality(history);

    let model: 'linear' | 'exponential' | 'seasonal' | 'moving-average';
    let predictions: PricePrediction['predictions'];

    if (seasonal.pattern !== 'none' && seasonal.seasonality > 0.3) {
      model = 'seasonal';
      predictions = this.predictWithSeasonal(history, seasonal, days);
    } else if (pattern.patternType === 'trending') {
      model = this.detectTrendType(history);
      predictions = model === 'exponential'
        ? this.predictWithExponential(history, days)
        : this.predictWithLinear(history, days);
    } else if (pattern.patternType === 'volatile') {
      model = 'moving-average';
      predictions = this.predictWithMovingAverage(history, days);
    } else {
      model = 'linear';
      predictions = this.predictWithLinear(history, days);
    }

    // Determine overall trend
    const firstPrice = history.pricePoints[0].price;
    const lastPrice = history.pricePoints[history.pricePoints.length - 1].price;
    const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;

    return {
      productId: history.productId,
      currentPrice: history.currentPrice,
      predictions,
      trend: Math.abs(percentChange) < 5 ? 'stable' : percentChange > 0 ? 'increasing' : 'decreasing',
      trendStrength: Math.min(Math.abs(percentChange) / 50, 1),
      model
    };
  }

  /**
   * Detect seasonal patterns in price history
   */
  detectSeasonality(history: PriceHistory): SeasonalPattern {
    if (history.pricePoints.length < 14) {
      return {
        productId: history.productId,
        pattern: 'none',
        seasonality: 0,
        peaks: [],
        troughs: [],
        adjustment: []
      };
    }

    const prices = history.pricePoints.map(p => p.price);
    const timestamps = history.pricePoints.map(p => p.timestamp.getTime());

    // Check each seasonal period
    let bestPeriod: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'none' = 'none';
    let maxSeasonality = 0;

    for (const periodDays of this.config.seasonalPeriods) {
      const periodMs = periodDays * 24 * 60 * 60 * 1000;
      const seasonality = this.calculateSeasonality(prices, timestamps, periodMs);

      if (seasonality > maxSeasonality) {
        maxSeasonality = seasonality;
        if (periodDays === 7) bestPeriod = 'weekly';
        else if (periodDays === 30) bestPeriod = 'monthly';
        else if (periodDays === 90) bestPeriod = 'quarterly';
        else if (periodDays === 365) bestPeriod = 'yearly';
      }
    }

    // Find peaks and troughs if seasonal pattern detected
    const peaks: Date[] = [];
    const troughs: Date[] = [];

    if (maxSeasonality > 0.2) {
      const result = this.findPeaksAndTroughs(history.pricePoints);
      peaks.push(...result.peaks);
      troughs.push(...result.troughs);
    }

    return {
      productId: history.productId,
      pattern: bestPeriod,
      seasonality: maxSeasonality,
      peaks,
      troughs,
      adjustment: this.calculateSeasonalAdjustment(prices, timestamps, bestPeriod)
    };
  }

  /**
   * Identify pricing patterns
   */
  identifyPattern(history: PriceHistory): PricePattern {
    const prices = history.pricePoints.map(p => p.price);
    const mean = this.calculateMean(prices);
    const stdDev = this.calculateStdDev(prices, mean);
    const volatility = mean > 0 ? stdDev / mean : 0;

    // Calculate autocorrelation
    const autocorrelation = this.calculateAutocorrelation(prices, 1);

    // Calculate change frequency
    const changeFrequency = this.calculateChangeFrequency(history.pricePoints);

    // Determine pattern type
    let patternType: PricePattern['patternType'];
    let confidence = 0.5;

    if (volatility > this.config.volatilityThreshold) {
      patternType = 'volatile';
      confidence = Math.min(volatility / 0.3, 1);
    } else if (Math.abs(autocorrelation) > 0.7) {
      patternType = 'trending';
      confidence = Math.abs(autocorrelation);
    } else if (volatility < 0.05) {
      patternType = 'stable';
      confidence = 1 - volatility * 20;
    } else {
      // Check for cyclical patterns
      const seasonal = this.detectSeasonality(history);
      if (seasonal.seasonality > 0.3) {
        patternType = 'seasonal';
        confidence = seasonal.seasonality;
      } else {
        patternType = 'stable';
        confidence = 0.6;
      }
    }

    return {
      productId: history.productId,
      patternType,
      confidence,
      characteristics: {
        volatility,
        autocorrelation,
        changeFrequency
      }
    };
  }

  /**
   * Predict with linear regression
   */
  private predictWithLinear(history: PriceHistory, days: number): PricePrediction['predictions'] {
    const points = history.pricePoints;
    const startTime = points[0].timestamp.getTime();

    // Convert to days since start
    const x = points.map(p => (p.timestamp.getTime() - startTime) / (24 * 60 * 60 * 1000));
    const y = points.map(p => p.price);

    // Calculate linear regression
    const { slope, intercept } = this.linearRegression(x, y);

    // Calculate residuals for confidence intervals
    const residuals = y.map((price, i) => price - (slope * x[i] + intercept));
    const stdError = this.calculateStdDev(residuals, 0);

    // Generate predictions
    const predictions: PricePrediction['predictions'] = [];
    const lastDay = x[x.length - 1];
    const zScore = 1.96; // 95% confidence interval

    for (let i = 1; i <= days; i++) {
      const futureDay = lastDay + i;
      const predictedPrice = slope * futureDay + intercept;
      const date = new Date(startTime + futureDay * 24 * 60 * 60 * 1000);

      // Confidence decreases with prediction distance
      const confidence = Math.max(0.3, 0.9 - (i / days) * 0.6);
      const margin = zScore * stdError * Math.sqrt(1 + i / x.length);

      predictions.push({
        date,
        predictedPrice: Math.max(0, predictedPrice),
        confidence,
        confidenceInterval: {
          lower: Math.max(0, predictedPrice - margin),
          upper: predictedPrice + margin
        }
      });
    }

    return predictions;
  }

  /**
   * Predict with exponential smoothing
   */
  private predictWithExponential(history: PriceHistory, days: number): PricePrediction['predictions'] {
    const prices = history.pricePoints.map(p => p.price);
    const alpha = 0.3; // Smoothing parameter

    // Calculate exponential moving average
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = alpha * prices[i] + (1 - alpha) * ema;
    }

    // Calculate trend
    const recentPrices = prices.slice(-5);
    const trend = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices.length;

    // Generate predictions
    const predictions: PricePrediction['predictions'] = [];
    const lastTimestamp = history.pricePoints[history.pricePoints.length - 1].timestamp;
    let currentPrediction = ema;

    for (let i = 1; i <= days; i++) {
      currentPrediction = currentPrediction + trend;
      const date = new Date(lastTimestamp.getTime() + i * 24 * 60 * 60 * 1000);
      const confidence = Math.max(0.4, 0.9 - (i / days) * 0.5);

      predictions.push({
        date,
        predictedPrice: Math.max(0, currentPrediction),
        confidence,
        confidenceInterval: {
          lower: Math.max(0, currentPrediction * 0.9),
          upper: currentPrediction * 1.1
        }
      });
    }

    return predictions;
  }

  /**
   * Predict with seasonal adjustment
   */
  private predictWithSeasonal(
    history: PriceHistory,
    seasonal: SeasonalPattern,
    days: number
  ): PricePrediction['predictions'] {
    // Start with linear prediction
    const basePredictions = this.predictWithLinear(history, days);

    // Apply seasonal adjustment
    const adjustedPredictions = basePredictions.map((pred, index) => {
      const adjustmentIndex = index % seasonal.adjustment.length;
      const adjustment = seasonal.adjustment[adjustmentIndex] || 1;

      return {
        ...pred,
        predictedPrice: pred.predictedPrice * adjustment,
        confidenceInterval: {
          lower: pred.confidenceInterval.lower * adjustment,
          upper: pred.confidenceInterval.upper * adjustment
        }
      };
    });

    return adjustedPredictions;
  }

  /**
   * Predict with moving average
   */
  private predictWithMovingAverage(history: PriceHistory, days: number): PricePrediction['predictions'] {
    const windowSize = Math.min(7, Math.floor(history.pricePoints.length / 2));
    const recentPrices = history.pricePoints.slice(-windowSize).map(p => p.price);
    const movingAvg = this.calculateMean(recentPrices);
    const stdDev = this.calculateStdDev(recentPrices, movingAvg);

    const predictions: PricePrediction['predictions'] = [];
    const lastTimestamp = history.pricePoints[history.pricePoints.length - 1].timestamp;

    for (let i = 1; i <= days; i++) {
      const date = new Date(lastTimestamp.getTime() + i * 24 * 60 * 60 * 1000);
      const confidence = Math.max(0.5, 0.8 - (i / days) * 0.3);

      predictions.push({
        date,
        predictedPrice: movingAvg,
        confidence,
        confidenceInterval: {
          lower: Math.max(0, movingAvg - 2 * stdDev),
          upper: movingAvg + 2 * stdDev
        }
      });
    }

    return predictions;
  }

  /**
   * Calculate seasonality strength
   */
  private calculateSeasonality(prices: number[], timestamps: number[], periodMs: number): number {
    if (prices.length < 2) return 0;

    // Group prices by period
    const periodGroups = new Map<number, number[]>();

    for (let i = 0; i < prices.length; i++) {
      const period = Math.floor(timestamps[i] / periodMs);
      if (!periodGroups.has(period)) {
        periodGroups.set(period, []);
      }
      periodGroups.get(period)!.push(prices[i]);
    }

    if (periodGroups.size < 2) return 0;

    // Calculate variance between periods vs within periods
    const periodMeans = Array.from(periodGroups.values()).map(group =>
      this.calculateMean(group)
    );

    const overallMean = this.calculateMean(prices);
    const betweenVariance = this.calculateMean(
      periodMeans.map(mean => Math.pow(mean - overallMean, 2))
    );

    const withinVariance = this.calculateMean(
      prices.map(price => Math.pow(price - overallMean, 2))
    );

    if (withinVariance === 0) return 0;

    // Return ratio (higher means more seasonal)
    return Math.min(betweenVariance / withinVariance, 1);
  }

  /**
   * Find peaks and troughs in price history
   */
  private findPeaksAndTroughs(points: PricePoint[]): { peaks: Date[]; troughs: Date[] } {
    const peaks: Date[] = [];
    const troughs: Date[] = [];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1].price;
      const curr = points[i].price;
      const next = points[i + 1].price;

      if (curr > prev && curr > next) {
        peaks.push(points[i].timestamp);
      } else if (curr < prev && curr < next) {
        troughs.push(points[i].timestamp);
      }
    }

    return { peaks, troughs };
  }

  /**
   * Calculate seasonal adjustment factors
   */
  private calculateSeasonalAdjustment(
    prices: number[],
    timestamps: number[],
    period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'none'
  ): number[] {
    if (period === 'none' || prices.length < 2) {
      return [1];
    }

    const periodMap: Record<string, number> = {
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      yearly: 365
    };

    const periodDays = periodMap[period];
    const buckets = new Array(periodDays).fill(0).map(() => ({ sum: 0, count: 0 }));

    // Group prices by day in period
    const startTime = timestamps[0];
    for (let i = 0; i < prices.length; i++) {
      const daysSinceStart = Math.floor((timestamps[i] - startTime) / (24 * 60 * 60 * 1000));
      const bucket = daysSinceStart % periodDays;
      buckets[bucket].sum += prices[i];
      buckets[bucket].count++;
    }

    // Calculate average for each bucket
    const averages = buckets.map(b => b.count > 0 ? b.sum / b.count : 0);
    const overallAvg = this.calculateMean(averages.filter(a => a > 0));

    // Return adjustment factors (ratio to overall average)
    return averages.map(avg => avg > 0 ? avg / overallAvg : 1);
  }

  /**
   * Calculate change frequency
   */
  private calculateChangeFrequency(points: PricePoint[]): number {
    if (points.length < 2) return 0;

    let changes = 0;
    const threshold = 0.01; // 1% change threshold

    for (let i = 1; i < points.length; i++) {
      const percentChange = Math.abs((points[i].price - points[i - 1].price) / points[i - 1].price);
      if (percentChange >= threshold) {
        changes++;
      }
    }

    const totalDays = this.calculateHistoryDays({ pricePoints: points } as PriceHistory);
    return changes > 0 ? totalDays / changes : totalDays;
  }

  /**
   * Calculate history duration in days
   */
  private calculateHistoryDays(history: PriceHistory): number {
    if (history.pricePoints.length < 2) return 0;

    const first = history.pricePoints[0].timestamp.getTime();
    const last = history.pricePoints[history.pricePoints.length - 1].timestamp.getTime();

    return (last - first) / (24 * 60 * 60 * 1000);
  }

  /**
   * Detect trend type (linear vs exponential)
   */
  private detectTrendType(history: PriceHistory): 'linear' | 'exponential' {
    const prices = history.pricePoints.map(p => p.price);

    // Calculate differences
    const diffs = [];
    for (let i = 1; i < prices.length; i++) {
      diffs.push(prices[i] - prices[i - 1]);
    }

    // If differences are relatively constant, it's linear
    // If differences are increasing/decreasing, it's exponential
    const diffMean = this.calculateMean(diffs);
    const diffStdDev = this.calculateStdDev(diffs, diffMean);

    return diffStdDev / Math.abs(diffMean) < 0.5 ? 'linear' : 'exponential';
  }

  /**
   * Linear regression
   */
  private linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Calculate autocorrelation
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const mean = this.calculateMean(values);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < values.length - lag; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate mean
   */
  private calculateMean(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(numbers: number[], mean: number): number {
    if (numbers.length === 0) return 0;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const variance = squaredDiffs.reduce((sum, n) => sum + n, 0) / numbers.length;
    return Math.sqrt(variance);
  }
}
