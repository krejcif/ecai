/**
 * Price tracking system for monitoring price changes over time
 */

import { ProductDocument } from '../../database/collections';

export interface PricePoint {
  productId: string;
  price: number;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

export interface PriceHistory {
  productId: string;
  pricePoints: PricePoint[];
  firstSeen: Date;
  lastUpdated: Date;
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
}

export interface PriceVelocity {
  productId: string;
  velocity: number; // Price change per day
  trend: 'increasing' | 'decreasing' | 'stable';
  percentChange: number;
  period: number; // Days
}

export interface PriceAnomaly {
  productId: string;
  timestamp: Date;
  expectedPrice: number;
  actualPrice: number;
  deviation: number; // Standard deviations from mean
  severity: 'low' | 'medium' | 'high';
  type: 'spike' | 'drop' | 'volatility';
}

export interface PriceTrackerConfig {
  anomalyThreshold?: number; // Standard deviations for anomaly detection (default: 2)
  minHistorySize?: number; // Minimum price points needed for analysis (default: 5)
  velocityWindow?: number; // Days to calculate velocity (default: 7)
  stableThreshold?: number; // Percent change threshold for "stable" trend (default: 5)
}

export class PriceTracker {
  private priceHistory: Map<string, PriceHistory>;
  private config: Required<PriceTrackerConfig>;

  constructor(config: PriceTrackerConfig = {}) {
    this.priceHistory = new Map();
    this.config = {
      anomalyThreshold: config.anomalyThreshold ?? 2,
      minHistorySize: config.minHistorySize ?? 5,
      velocityWindow: config.velocityWindow ?? 7,
      stableThreshold: config.stableThreshold ?? 5
    };
  }

  /**
   * Track a new price point for a product
   */
  trackPrice(productId: string, price: number, source: string, metadata?: Record<string, any>): PricePoint {
    const pricePoint: PricePoint = {
      productId,
      price,
      timestamp: new Date(),
      source,
      metadata
    };

    // Get or create history
    let history = this.priceHistory.get(productId);

    if (!history) {
      history = {
        productId,
        pricePoints: [],
        firstSeen: pricePoint.timestamp,
        lastUpdated: pricePoint.timestamp,
        currentPrice: price,
        minPrice: price,
        maxPrice: price,
        avgPrice: price
      };
      this.priceHistory.set(productId, history);
    }

    // Add price point
    history.pricePoints.push(pricePoint);
    history.lastUpdated = pricePoint.timestamp;
    history.currentPrice = price;

    // Update statistics
    this.updateHistoryStats(history);

    return pricePoint;
  }

  /**
   * Track prices from product documents
   */
  trackProducts(products: ProductDocument[]): PricePoint[] {
    return products.map(product =>
      this.trackPrice(product.id, product.price, product.source, product.metadata)
    );
  }

  /**
   * Get price history for a product
   */
  getHistory(productId: string): PriceHistory | null {
    return this.priceHistory.get(productId) || null;
  }

  /**
   * Get all tracked products
   */
  getAllHistory(): PriceHistory[] {
    return Array.from(this.priceHistory.values());
  }

  /**
   * Calculate price velocity (rate of change over time)
   */
  calculateVelocity(productId: string): PriceVelocity | null {
    const history = this.priceHistory.get(productId);
    if (!history || history.pricePoints.length < 2) {
      return null;
    }

    // Get price points within velocity window
    const windowMs = this.config.velocityWindow * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - windowMs;
    const recentPoints = history.pricePoints.filter(
      point => point.timestamp.getTime() >= cutoffTime
    );

    if (recentPoints.length < 2) {
      // Fall back to all points if not enough in window
      const oldest = history.pricePoints[0];
      const newest = history.pricePoints[history.pricePoints.length - 1];
      const timeDiff = (newest.timestamp.getTime() - oldest.timestamp.getTime()) / (24 * 60 * 60 * 1000);
      const priceDiff = newest.price - oldest.price;
      const velocity = timeDiff > 0 ? priceDiff / timeDiff : 0;
      const percentChange = oldest.price > 0 ? (priceDiff / oldest.price) * 100 : 0;

      return {
        productId,
        velocity,
        trend: this.determineTrend(percentChange),
        percentChange,
        period: timeDiff
      };
    }

    // Calculate velocity using recent points
    const oldest = recentPoints[0];
    const newest = recentPoints[recentPoints.length - 1];
    const timeDiff = (newest.timestamp.getTime() - oldest.timestamp.getTime()) / (24 * 60 * 60 * 1000);
    const priceDiff = newest.price - oldest.price;
    const velocity = timeDiff > 0 ? priceDiff / timeDiff : 0;
    const percentChange = oldest.price > 0 ? (priceDiff / oldest.price) * 100 : 0;

    return {
      productId,
      velocity,
      trend: this.determineTrend(percentChange),
      percentChange,
      period: timeDiff
    };
  }

  /**
   * Detect price anomalies
   */
  detectAnomalies(productId: string): PriceAnomaly[] {
    const history = this.priceHistory.get(productId);
    if (!history || history.pricePoints.length < this.config.minHistorySize) {
      return [];
    }

    const prices = history.pricePoints.map(p => p.price);
    const mean = this.calculateMean(prices);
    const stdDev = this.calculateStdDev(prices, mean);

    if (stdDev === 0) {
      return []; // No variation in prices
    }

    const anomalies: PriceAnomaly[] = [];

    // Check each price point for anomalies
    for (const point of history.pricePoints) {
      const deviation = Math.abs(point.price - mean) / stdDev;

      if (deviation >= this.config.anomalyThreshold) {
        const severity = this.determineSeverity(deviation);
        const type = this.determineAnomalyType(point.price, mean, prices);

        anomalies.push({
          productId,
          timestamp: point.timestamp,
          expectedPrice: mean,
          actualPrice: point.price,
          deviation,
          severity,
          type
        });
      }
    }

    return anomalies;
  }

  /**
   * Get recent anomalies across all products
   */
  getRecentAnomalies(hours: number = 24): PriceAnomaly[] {
    const anomalies: PriceAnomaly[] = [];
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

    for (const [productId] of this.priceHistory) {
      const productAnomalies = this.detectAnomalies(productId);
      const recentAnomalies = productAnomalies.filter(
        a => a.timestamp.getTime() >= cutoffTime
      );
      anomalies.push(...recentAnomalies);
    }

    return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get price statistics for a product
   */
  getStatistics(productId: string): {
    mean: number;
    median: number;
    stdDev: number;
    variance: number;
    range: number;
    count: number;
  } | null {
    const history = this.priceHistory.get(productId);
    if (!history || history.pricePoints.length === 0) {
      return null;
    }

    const prices = history.pricePoints.map(p => p.price).sort((a, b) => a - b);
    const mean = this.calculateMean(prices);
    const stdDev = this.calculateStdDev(prices, mean);
    const variance = stdDev * stdDev;
    const median = this.calculateMedian(prices);
    const range = prices[prices.length - 1] - prices[0];

    return {
      mean,
      median,
      stdDev,
      variance,
      range,
      count: prices.length
    };
  }

  /**
   * Clear history for a product or all products
   */
  clearHistory(productId?: string): void {
    if (productId) {
      this.priceHistory.delete(productId);
    } else {
      this.priceHistory.clear();
    }
  }

  /**
   * Export price history as JSON
   */
  exportHistory(productId?: string): string {
    if (productId) {
      const history = this.priceHistory.get(productId);
      return JSON.stringify(history, null, 2);
    }
    return JSON.stringify(Array.from(this.priceHistory.values()), null, 2);
  }

  /**
   * Import price history from JSON
   */
  importHistory(json: string): void {
    try {
      const data = JSON.parse(json);
      const histories = Array.isArray(data) ? data : [data];

      for (const history of histories) {
        // Convert timestamp strings back to Date objects
        history.firstSeen = new Date(history.firstSeen);
        history.lastUpdated = new Date(history.lastUpdated);
        history.pricePoints = history.pricePoints.map((p: any) => ({
          ...p,
          timestamp: new Date(p.timestamp)
        }));

        this.priceHistory.set(history.productId, history);
      }
    } catch (error) {
      throw new Error(`Failed to import price history: ${error}`);
    }
  }

  /**
   * Update history statistics
   */
  private updateHistoryStats(history: PriceHistory): void {
    const prices = history.pricePoints.map(p => p.price);
    history.minPrice = Math.min(...prices);
    history.maxPrice = Math.max(...prices);
    history.avgPrice = this.calculateMean(prices);
  }

  /**
   * Determine price trend
   */
  private determineTrend(percentChange: number): 'increasing' | 'decreasing' | 'stable' {
    if (Math.abs(percentChange) < this.config.stableThreshold) {
      return 'stable';
    }
    return percentChange > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Determine anomaly severity
   */
  private determineSeverity(deviation: number): 'low' | 'medium' | 'high' {
    if (deviation >= 3) {
      return 'high';
    } else if (deviation >= 2.5) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Determine anomaly type
   */
  private determineAnomalyType(
    price: number,
    mean: number,
    prices: number[]
  ): 'spike' | 'drop' | 'volatility' {
    if (price > mean) {
      return 'spike';
    } else if (price < mean) {
      return 'drop';
    }
    return 'volatility';
  }

  /**
   * Calculate mean of numbers
   */
  private calculateMean(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Calculate median of numbers
   */
  private calculateMedian(sortedNumbers: number[]): number {
    if (sortedNumbers.length === 0) return 0;
    const mid = Math.floor(sortedNumbers.length / 2);
    if (sortedNumbers.length % 2 === 0) {
      return (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;
    }
    return sortedNumbers[mid];
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
