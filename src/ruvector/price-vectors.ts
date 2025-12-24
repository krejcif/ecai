/**
 * Price vectorization for vector-based price intelligence
 * Converts price data into multi-dimensional vectors for analysis
 */

import { ProductDocument } from '../database/collections';

export interface PriceFeatures {
  price: number;
  categoryAverage: number;
  categoryMedian: number;
  priceHistory: number[]; // Last N price points
  priceVolatility: number; // Standard deviation of price changes
  priceVelocity: number; // Rate of price change
  margin: number; // Profit margin if available
  competitorAverage: number;
  percentileInCategory: number; // 0-100
  daysSinceLastChange: number;
  priceChangeFrequency: number; // Changes per month
  seasonalFactor: number; // 0-1, seasonal price adjustment
}

export interface PriceVectorConfig {
  dimension: number; // Total vector dimension (default: 384)
  priceHistoryLength: number; // Number of historical price points to include
  normalizationMethod: 'minmax' | 'zscore' | 'log';
  includeTemporalFeatures: boolean;
  includeCompetitiveFeatures: boolean;
}

export interface PriceData {
  productId: string;
  currentPrice: number;
  priceHistory?: Array<{ price: number; timestamp: Date }>;
  category: string;
  cost?: number; // For margin calculation
  competitors?: Array<{ id: string; price: number }>;
  metadata?: Record<string, any>;
}

export class PriceVectorizer {
  private config: Required<PriceVectorConfig>;
  private categoryStats: Map<string, CategoryPriceStats>;
  private priceCache: Map<string, number[]>;

  constructor(config: Partial<PriceVectorConfig> = {}) {
    this.config = {
      dimension: config.dimension ?? 384,
      priceHistoryLength: config.priceHistoryLength ?? 30,
      normalizationMethod: config.normalizationMethod ?? 'minmax',
      includeTemporalFeatures: config.includeTemporalFeatures ?? true,
      includeCompetitiveFeatures: config.includeCompetitiveFeatures ?? true
    };
    this.categoryStats = new Map();
    this.priceCache = new Map();
  }

  /**
   * Create a price vector from product data
   */
  async createPriceVector(product: ProductDocument, priceData?: PriceData): Promise<number[]> {
    const features = await this.extractPriceFeatures(product, priceData);
    const vector = this.featuresToVector(features);

    // Cache the vector
    this.priceCache.set(product.id, vector);

    return vector;
  }

  /**
   * Create price vectors for multiple products
   */
  async createPriceVectors(
    products: ProductDocument[],
    priceDataMap?: Map<string, PriceData>
  ): Promise<Map<string, number[]>> {
    // First pass: collect category statistics
    await this.updateCategoryStatistics(products, priceDataMap);

    // Second pass: create vectors
    const vectors = new Map<string, number[]>();

    for (const product of products) {
      const priceData = priceDataMap?.get(product.id);
      const vector = await this.createPriceVector(product, priceData);
      vectors.set(product.id, vector);
    }

    return vectors;
  }

  /**
   * Extract comprehensive price features from product
   */
  private async extractPriceFeatures(
    product: ProductDocument,
    priceData?: PriceData
  ): Promise<PriceFeatures> {
    const category = product.category;
    const categoryStats = this.categoryStats.get(category);

    // Extract price history
    const priceHistory = this.extractPriceHistory(product, priceData);
    const priceVolatility = this.calculateVolatility(priceHistory);
    const priceVelocity = this.calculateVelocity(priceHistory);

    // Calculate margin
    const margin = this.calculateMargin(product.price, priceData?.cost);

    // Calculate competitor average
    const competitorAverage = this.calculateCompetitorAverage(priceData?.competitors);

    // Calculate percentile in category
    const percentile = categoryStats
      ? this.calculatePercentile(product.price, categoryStats)
      : 50;

    // Calculate temporal features
    const daysSinceLastChange = this.calculateDaysSinceLastChange(priceHistory);
    const priceChangeFrequency = this.calculateChangeFrequency(priceHistory);

    // Calculate seasonal factor
    const seasonalFactor = this.calculateSeasonalFactor(product, priceHistory);

    return {
      price: product.price,
      categoryAverage: categoryStats?.mean ?? product.price,
      categoryMedian: categoryStats?.median ?? product.price,
      priceHistory: priceHistory.slice(-this.config.priceHistoryLength),
      priceVolatility,
      priceVelocity,
      margin,
      competitorAverage,
      percentileInCategory: percentile,
      daysSinceLastChange,
      priceChangeFrequency,
      seasonalFactor
    };
  }

  /**
   * Convert features to a normalized vector
   */
  private featuresToVector(features: PriceFeatures): number[] {
    const vector: number[] = [];

    // Core price features (normalized)
    vector.push(this.normalize(features.price, 0, 10000));
    vector.push(this.normalize(features.categoryAverage, 0, 10000));
    vector.push(this.normalize(features.categoryMedian, 0, 10000));

    // Price position features
    vector.push(features.price / Math.max(features.categoryAverage, 1));
    vector.push(features.price / Math.max(features.categoryMedian, 1));
    vector.push(features.percentileInCategory / 100);

    // Margin features
    vector.push(this.normalize(features.margin, -1, 1));

    // Volatility and velocity
    vector.push(this.normalize(features.priceVolatility, 0, 1000));
    vector.push(this.normalize(features.priceVelocity, -100, 100));

    // Temporal features
    if (this.config.includeTemporalFeatures) {
      vector.push(this.normalize(features.daysSinceLastChange, 0, 365));
      vector.push(this.normalize(features.priceChangeFrequency, 0, 30));
      vector.push(features.seasonalFactor);
    }

    // Competitive features
    if (this.config.includeCompetitiveFeatures) {
      vector.push(this.normalize(features.competitorAverage, 0, 10000));
      vector.push(features.price / Math.max(features.competitorAverage, 1));
    }

    // Price history embeddings (recent trends)
    const historyEmbedding = this.embedPriceHistory(features.priceHistory);
    vector.push(...historyEmbedding);

    // Pad to target dimension
    while (vector.length < this.config.dimension) {
      vector.push(0);
    }

    // Truncate if too long
    return vector.slice(0, this.config.dimension);
  }

  /**
   * Embed price history into a fixed-size representation
   */
  private embedPriceHistory(priceHistory: number[]): number[] {
    if (priceHistory.length === 0) {
      return new Array(20).fill(0);
    }

    const embedding: number[] = [];

    // Statistical features
    const mean = priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length;
    const variance = priceHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / priceHistory.length;
    const stdDev = Math.sqrt(variance);

    embedding.push(this.normalize(mean, 0, 10000));
    embedding.push(this.normalize(stdDev, 0, 1000));
    embedding.push(this.normalize(Math.min(...priceHistory), 0, 10000));
    embedding.push(this.normalize(Math.max(...priceHistory), 0, 10000));

    // Trend features (linear regression slope)
    const trend = this.calculateTrend(priceHistory);
    embedding.push(this.normalize(trend, -100, 100));

    // Moving averages
    const ma7 = this.movingAverage(priceHistory, 7);
    const ma30 = this.movingAverage(priceHistory, 30);
    embedding.push(this.normalize(ma7, 0, 10000));
    embedding.push(this.normalize(ma30, 0, 10000));

    // Recent changes
    if (priceHistory.length >= 2) {
      const recentChange = ((priceHistory[priceHistory.length - 1] - priceHistory[priceHistory.length - 2]) /
                           priceHistory[priceHistory.length - 2]) * 100;
      embedding.push(this.normalize(recentChange, -50, 50));
    } else {
      embedding.push(0);
    }

    // Momentum indicators
    const momentum = this.calculateMomentum(priceHistory);
    embedding.push(this.normalize(momentum, -100, 100));

    // Sampled price points (normalized)
    const sampledPoints = this.samplePriceHistory(priceHistory, 10);
    embedding.push(...sampledPoints.map(p => this.normalize(p, 0, 10000)));

    return embedding;
  }

  /**
   * Update category statistics from products
   */
  private async updateCategoryStatistics(
    products: ProductDocument[],
    priceDataMap?: Map<string, PriceData>
  ): Promise<void> {
    const categoryPrices = new Map<string, number[]>();

    // Group prices by category
    for (const product of products) {
      const prices = categoryPrices.get(product.category) || [];
      prices.push(product.price);
      categoryPrices.set(product.category, prices);
    }

    // Calculate statistics for each category
    categoryPrices.forEach((prices, category) => {
      const stats = this.calculateCategoryStats(prices);
      this.categoryStats.set(category, stats);
    });
  }

  /**
   * Calculate category price statistics
   */
  private calculateCategoryStats(prices: number[]): CategoryPriceStats {
    const sorted = [...prices].sort((a, b) => a - b);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: prices.length,
      percentiles: {
        p25: sorted[Math.floor(sorted.length * 0.25)],
        p50: median,
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p90: sorted[Math.floor(sorted.length * 0.90)]
      }
    };
  }

  /**
   * Extract price history from product or price data
   */
  private extractPriceHistory(product: ProductDocument, priceData?: PriceData): number[] {
    if (priceData?.priceHistory && priceData.priceHistory.length > 0) {
      return priceData.priceHistory.map(h => h.price);
    }

    // Fallback to metadata or current price
    if (product.metadata?.priceHistory) {
      return product.metadata.priceHistory;
    }

    return [product.price];
  }

  /**
   * Calculate price volatility (standard deviation of changes)
   */
  private calculateVolatility(priceHistory: number[]): number {
    if (priceHistory.length < 2) return 0;

    const changes: number[] = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const change = ((priceHistory[i] - priceHistory[i - 1]) / priceHistory[i - 1]) * 100;
      changes.push(change);
    }

    const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / changes.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate price velocity (rate of change)
   */
  private calculateVelocity(priceHistory: number[]): number {
    if (priceHistory.length < 2) return 0;

    const first = priceHistory[0];
    const last = priceHistory[priceHistory.length - 1];
    const days = priceHistory.length;

    return ((last - first) / first) * 100 / days;
  }

  /**
   * Calculate profit margin
   */
  private calculateMargin(price: number, cost?: number): number {
    if (!cost || cost === 0) return 0;
    return (price - cost) / price;
  }

  /**
   * Calculate average competitor price
   */
  private calculateCompetitorAverage(competitors?: Array<{ id: string; price: number }>): number {
    if (!competitors || competitors.length === 0) return 0;

    const sum = competitors.reduce((a, b) => a + b.price, 0);
    return sum / competitors.length;
  }

  /**
   * Calculate percentile position in category
   */
  private calculatePercentile(price: number, stats: CategoryPriceStats): number {
    if (price <= stats.min) return 0;
    if (price >= stats.max) return 100;

    // Approximate percentile using normal distribution
    const zScore = (price - stats.mean) / stats.stdDev;
    const percentile = this.normalCDF(zScore) * 100;

    return Math.max(0, Math.min(100, percentile));
  }

  /**
   * Calculate days since last price change
   */
  private calculateDaysSinceLastChange(priceHistory: number[]): number {
    if (priceHistory.length < 2) return 0;

    for (let i = priceHistory.length - 1; i > 0; i--) {
      if (priceHistory[i] !== priceHistory[i - 1]) {
        return priceHistory.length - 1 - i;
      }
    }

    return priceHistory.length;
  }

  /**
   * Calculate price change frequency (changes per month)
   */
  private calculateChangeFrequency(priceHistory: number[]): number {
    if (priceHistory.length < 2) return 0;

    let changes = 0;
    for (let i = 1; i < priceHistory.length; i++) {
      if (priceHistory[i] !== priceHistory[i - 1]) {
        changes++;
      }
    }

    const months = priceHistory.length / 30;
    return changes / Math.max(months, 1);
  }

  /**
   * Calculate seasonal price factor
   */
  private calculateSeasonalFactor(product: ProductDocument, priceHistory: number[]): number {
    // Simple seasonal factor based on current month
    const month = new Date().getMonth();
    const category = product.category.toLowerCase();

    // Example seasonal adjustments (can be customized per category)
    const seasonalMap: Record<string, number[]> = {
      'electronics': [0.9, 0.9, 1.0, 1.0, 1.0, 1.1, 1.1, 1.0, 1.0, 1.0, 1.2, 1.3],
      'clothing': [0.8, 0.8, 1.0, 1.0, 1.0, 1.1, 1.2, 1.1, 1.0, 1.0, 1.3, 1.2],
      'toys': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.2, 1.3, 1.5, 1.4]
    };

    for (const [key, factors] of Object.entries(seasonalMap)) {
      if (category.includes(key)) {
        return factors[month];
      }
    }

    return 1.0; // No seasonal adjustment
  }

  /**
   * Calculate trend using linear regression
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Calculate moving average
   */
  private movingAverage(values: number[], window: number): number {
    if (values.length === 0) return 0;

    const start = Math.max(0, values.length - window);
    const subset = values.slice(start);

    return subset.reduce((a, b) => a + b, 0) / subset.length;
  }

  /**
   * Calculate momentum (recent trend strength)
   */
  private calculateMomentum(priceHistory: number[]): number {
    if (priceHistory.length < 10) return 0;

    const recent = priceHistory.slice(-10);
    const older = priceHistory.slice(-20, -10);

    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    return ((recentAvg - olderAvg) / olderAvg) * 100;
  }

  /**
   * Sample price history at regular intervals
   */
  private samplePriceHistory(priceHistory: number[], samples: number): number[] {
    if (priceHistory.length === 0) {
      return new Array(samples).fill(0);
    }

    if (priceHistory.length <= samples) {
      const result = [...priceHistory];
      while (result.length < samples) {
        result.push(priceHistory[priceHistory.length - 1]);
      }
      return result;
    }

    const step = priceHistory.length / samples;
    const sampled: number[] = [];

    for (let i = 0; i < samples; i++) {
      const index = Math.floor(i * step);
      sampled.push(priceHistory[index]);
    }

    return sampled;
  }

  /**
   * Normalize value to [0, 1] range
   */
  private normalize(value: number, min: number, max: number): number {
    if (max === min) return 0.5;

    switch (this.config.normalizationMethod) {
      case 'minmax':
        return Math.max(0, Math.min(1, (value - min) / (max - min)));

      case 'log':
        const logValue = Math.log(Math.max(value, 1));
        const logMin = Math.log(Math.max(min, 1));
        const logMax = Math.log(Math.max(max, 1));
        return Math.max(0, Math.min(1, (logValue - logMin) / (logMax - logMin)));

      case 'zscore':
        const mean = (min + max) / 2;
        const range = max - min;
        const zScore = (value - mean) / (range / 6); // Assume ~3 std devs
        return Math.max(0, Math.min(1, (zScore + 3) / 6));

      default:
        return Math.max(0, Math.min(1, (value - min) / (max - min)));
    }
  }

  /**
   * Normal cumulative distribution function (for percentile calculation)
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return x > 0 ? 1 - probability : probability;
  }

  /**
   * Get cached vector for a product
   */
  getCachedVector(productId: string): number[] | undefined {
    return this.priceCache.get(productId);
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    this.priceCache.clear();
  }

  /**
   * Get category statistics
   */
  getCategoryStats(category: string): CategoryPriceStats | undefined {
    return this.categoryStats.get(category);
  }
}

interface CategoryPriceStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}
