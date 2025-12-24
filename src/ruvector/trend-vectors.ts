/**
 * TrendVectorizer - Converts trend signals into high-dimensional vectors
 * for clustering and similarity analysis using ruvector
 */

import { execSync } from 'child_process';

export interface TrendSignals {
  searchVolume: number;          // Search volume (normalized 0-1)
  salesVelocity: number;         // Sales growth rate (-1 to 1)
  socialMentions: number;        // Social media mentions (normalized 0-1)
  priceChange: number;           // Price change rate (-1 to 1)

  // Optional additional signals
  reviewVolume?: number;         // Number of reviews (normalized)
  sentimentScore?: number;       // Average sentiment (-1 to 1)
  competitorActivity?: number;   // Competitor activity level (0-1)
  seasonalityScore?: number;     // Seasonality strength (0-1)
  inventoryLevel?: number;       // Stock levels (normalized 0-1)
  conversionRate?: number;       // Purchase conversion (0-1)
}

export interface TrendVectorData {
  id: string;
  keyword: string;
  category?: string;
  signals: TrendSignals;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface VectorizedTrend {
  id: string;
  keyword: string;
  category?: string;
  vector: number[];
  signals: TrendSignals;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface VectorizationOptions {
  dimension?: number;           // Target vector dimension (default: 384)
  useEmbeddings?: boolean;      // Use text embeddings (default: true)
  includeTemporalFeatures?: boolean; // Add time-based features
  normalization?: 'minmax' | 'zscore' | 'none';
}

export class TrendVectorizer {
  private readonly defaultDimension: number = 384;
  private cache: Map<string, number[]>;
  private featureStats: Map<string, { mean: number; std: number; min: number; max: number }>;

  constructor() {
    this.cache = new Map();
    this.featureStats = new Map();
  }

  /**
   * Create trend vector from signals and text embeddings
   */
  async createTrendVector(
    data: TrendVectorData,
    options: VectorizationOptions = {}
  ): Promise<VectorizedTrend> {
    const useEmbeddings = options.useEmbeddings ?? true;
    const includeTemporalFeatures = options.includeTemporalFeatures ?? true;
    const dimension = options.dimension ?? this.defaultDimension;

    let vector: number[];

    if (useEmbeddings) {
      // Combine embeddings with signal features
      const textVector = await this.generateTextEmbedding(data.keyword, data.category);
      const signalVector = this.createSignalVector(data.signals, includeTemporalFeatures, data.timestamp);

      // Combine vectors: text embeddings + signal features
      vector = this.combineVectors(textVector, signalVector, dimension);
    } else {
      // Use only signal-based features
      vector = this.createSignalVector(data.signals, includeTemporalFeatures, data.timestamp);

      // Pad or truncate to target dimension
      vector = this.adjustVectorDimension(vector, dimension);
    }

    // Apply normalization if requested
    if (options.normalization && options.normalization !== 'none') {
      vector = this.normalizeVector(vector, options.normalization);
    }

    return {
      id: data.id,
      keyword: data.keyword,
      category: data.category,
      vector,
      signals: data.signals,
      timestamp: data.timestamp,
      metadata: data.metadata,
    };
  }

  /**
   * Batch vectorize multiple trends
   */
  async createTrendVectors(
    trends: TrendVectorData[],
    options: VectorizationOptions = {}
  ): Promise<VectorizedTrend[]> {
    // Calculate feature statistics for normalization
    if (options.normalization === 'zscore') {
      this.calculateFeatureStatistics(trends);
    }

    const vectorized: VectorizedTrend[] = [];

    // Process in batches for efficiency
    const batchSize = 10;
    for (let i = 0; i < trends.length; i += batchSize) {
      const batch = trends.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(trend => this.createTrendVector(trend, options))
      );
      vectorized.push(...batchResults);
    }

    return vectorized;
  }

  /**
   * Generate text embedding using ruvector
   */
  private async generateTextEmbedding(keyword: string, category?: string): Promise<number[]> {
    const text = category ? `${keyword} in ${category}` : keyword;
    const cacheKey = this.getCacheKey(text);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Escape text for shell command
      const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');
      const command = `npx ruvector embed "${escapedText}"`;

      const output = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      });

      const vector = this.parseEmbeddingOutput(output);

      // Cache the result
      this.cache.set(cacheKey, vector);

      return vector;
    } catch (error) {
      console.warn(`Failed to generate embedding for "${text}":`, error);

      // Return zero vector on failure
      return new Array(this.defaultDimension).fill(0);
    }
  }

  /**
   * Create feature vector from trend signals
   */
  private createSignalVector(
    signals: TrendSignals,
    includeTemporalFeatures: boolean,
    timestamp?: string
  ): number[] {
    const features: number[] = [];

    // Core signals (always included)
    features.push(
      this.normalizeValue(signals.searchVolume, 0, 1),
      this.normalizeValue(signals.salesVelocity, -1, 1),
      this.normalizeValue(signals.socialMentions, 0, 1),
      this.normalizeValue(signals.priceChange, -1, 1)
    );

    // Optional signals
    if (signals.reviewVolume !== undefined) {
      features.push(this.normalizeValue(signals.reviewVolume, 0, 1));
    }
    if (signals.sentimentScore !== undefined) {
      features.push(this.normalizeValue(signals.sentimentScore, -1, 1));
    }
    if (signals.competitorActivity !== undefined) {
      features.push(this.normalizeValue(signals.competitorActivity, 0, 1));
    }
    if (signals.seasonalityScore !== undefined) {
      features.push(this.normalizeValue(signals.seasonalityScore, 0, 1));
    }
    if (signals.inventoryLevel !== undefined) {
      features.push(this.normalizeValue(signals.inventoryLevel, 0, 1));
    }
    if (signals.conversionRate !== undefined) {
      features.push(this.normalizeValue(signals.conversionRate, 0, 1));
    }

    // Temporal features
    if (includeTemporalFeatures && timestamp) {
      const temporalFeatures = this.extractTemporalFeatures(timestamp);
      features.push(...temporalFeatures);
    }

    // Derived features (combinations that might be meaningful)
    const momentum = signals.searchVolume * signals.salesVelocity;
    const demand = signals.searchVolume * (signals.conversionRate ?? 0.5);
    const marketHeat = signals.socialMentions * signals.searchVolume;
    const priceElasticity = Math.abs(signals.priceChange) * signals.salesVelocity;

    features.push(
      this.normalizeValue(momentum, -1, 1),
      this.normalizeValue(demand, 0, 1),
      this.normalizeValue(marketHeat, 0, 1),
      this.normalizeValue(priceElasticity, -1, 1)
    );

    return features;
  }

  /**
   * Extract temporal features from timestamp
   */
  private extractTemporalFeatures(timestamp: string): number[] {
    const date = new Date(timestamp);
    const features: number[] = [];

    // Day of week (0-6, normalized)
    const dayOfWeek = date.getDay() / 6;
    features.push(dayOfWeek);

    // Day of month (1-31, normalized)
    const dayOfMonth = (date.getDate() - 1) / 30;
    features.push(dayOfMonth);

    // Month (0-11, normalized)
    const month = date.getMonth() / 11;
    features.push(month);

    // Quarter (0-3, normalized)
    const quarter = Math.floor(date.getMonth() / 3) / 3;
    features.push(quarter);

    // Cyclical encoding for seasonality (sine/cosine)
    const dayOfYear = this.getDayOfYear(date);
    const yearProgress = dayOfYear / 365;
    features.push(
      Math.sin(2 * Math.PI * yearProgress),
      Math.cos(2 * Math.PI * yearProgress)
    );

    return features;
  }

  /**
   * Combine text embeddings with signal vectors
   */
  private combineVectors(textVector: number[], signalVector: number[], targetDim: number): number[] {
    // Strategy: Use most of the dimension for text embeddings,
    // append signal features at the end

    const signalDim = Math.min(signalVector.length, Math.floor(targetDim * 0.2));
    const textDim = targetDim - signalDim;

    // Adjust text vector to target dimension
    const adjustedTextVector = this.adjustVectorDimension(textVector, textDim);

    // Take most important signal features
    const adjustedSignalVector = signalVector.slice(0, signalDim);

    return [...adjustedTextVector, ...adjustedSignalVector];
  }

  /**
   * Adjust vector to target dimension
   */
  private adjustVectorDimension(vector: number[], targetDim: number): number[] {
    if (vector.length === targetDim) {
      return vector;
    } else if (vector.length > targetDim) {
      // Truncate or use PCA-like compression (simple truncation for now)
      return vector.slice(0, targetDim);
    } else {
      // Pad with zeros
      return [...vector, ...new Array(targetDim - vector.length).fill(0)];
    }
  }

  /**
   * Normalize vector
   */
  private normalizeVector(vector: number[], method: 'minmax' | 'zscore'): number[] {
    if (method === 'minmax') {
      // Min-max normalization to [0, 1]
      const min = Math.min(...vector);
      const max = Math.max(...vector);
      const range = max - min;

      if (range === 0) return vector;

      return vector.map(v => (v - min) / range);
    } else if (method === 'zscore') {
      // Z-score normalization
      const mean = vector.reduce((a, b) => a + b, 0) / vector.length;
      const variance = vector.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vector.length;
      const std = Math.sqrt(variance);

      if (std === 0) return vector;

      return vector.map(v => (v - mean) / std);
    }

    return vector;
  }

  /**
   * Normalize value to range
   */
  private normalizeValue(value: number, min: number, max: number): number {
    const range = max - min;
    if (range === 0) return 0;
    return Math.max(0, Math.min(1, (value - min) / range));
  }

  /**
   * Parse embedding output from ruvector
   */
  private parseEmbeddingOutput(output: string): number[] {
    try {
      const trimmed = output.trim();

      if (trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      }

      if (trimmed.startsWith('{')) {
        const obj = JSON.parse(trimmed);
        return obj.vector || obj.embedding || [];
      }

      // Try space or comma separated numbers
      const numbers = trimmed
        .split(/[\s,]+/)
        .map(s => parseFloat(s))
        .filter(n => !isNaN(n));

      return numbers.length > 0 ? numbers : [];
    } catch (error) {
      throw new Error(`Failed to parse embedding output: ${error}`);
    }
  }

  /**
   * Calculate feature statistics for z-score normalization
   */
  private calculateFeatureStatistics(trends: TrendVectorData[]): void {
    const features = ['searchVolume', 'salesVelocity', 'socialMentions', 'priceChange'];

    for (const feature of features) {
      const values = trends
        .map(t => (t.signals as any)[feature])
        .filter(v => v !== undefined);

      if (values.length === 0) continue;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      const min = Math.min(...values);
      const max = Math.max(...values);

      this.featureStats.set(feature, { mean, std, min, max });
    }
  }

  /**
   * Get day of year
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(text: string): string {
    return `embed:${text}`;
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    };
  }

  /**
   * Get feature statistics
   */
  getFeatureStatistics(): Map<string, { mean: number; std: number; min: number; max: number }> {
    return new Map(this.featureStats);
  }
}
