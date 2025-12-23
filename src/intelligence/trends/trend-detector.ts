/**
 * TrendDetector - Identifies emerging product trends and patterns
 * Uses time-series analysis and vector clustering
 */

import { TrendDocument } from '../../database/collections';

export interface TrendPattern {
  keyword: string;
  category: string;
  velocity: number; // Rate of growth
  acceleration: number; // Change in velocity
  confidence: number; // 0-1
  classification: 'emerging' | 'declining' | 'stable' | 'seasonal';
  strength: 'strong' | 'moderate' | 'weak';
}

export interface SeasonalPattern {
  category: string;
  period: number; // Days in cycle
  amplitude: number; // Strength of seasonality
  phase: number; // Current position in cycle
  peakMonths: number[]; // Months where trend peaks
}

export interface CrossCategoryCorrelation {
  category1: string;
  category2: string;
  correlation: number; // -1 to 1
  lag: number; // Days of lag between categories
  significance: number; // Statistical significance
}

export interface TrendAnalysisResult {
  emergingTrends: TrendPattern[];
  decliningTrends: TrendPattern[];
  seasonalPatterns: SeasonalPattern[];
  correlations: CrossCategoryCorrelation[];
  timestamp: string;
}

export class TrendDetector {
  private readonly minDataPoints: number = 7; // Minimum data points for analysis
  private readonly emergingThreshold: number = 0.15; // 15% growth
  private readonly decliningThreshold: number = -0.10; // -10% decline
  private readonly seasonalityThreshold: number = 0.6; // Correlation threshold

  /**
   * Analyze trends from historical data
   */
  async analyzeTrends(
    trendData: TrendDocument[],
    timeWindow: number = 30 // days
  ): Promise<TrendAnalysisResult> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - timeWindow * 24 * 60 * 60 * 1000);

    // Filter recent data
    const recentData = trendData.filter(
      (doc) => new Date(doc.timestamp) >= cutoffDate
    );

    // Group by keyword
    const groupedByKeyword = this.groupByKeyword(recentData);

    // Detect emerging and declining trends
    const emergingTrends: TrendPattern[] = [];
    const decliningTrends: TrendPattern[] = [];

    for (const [keyword, docs] of groupedByKeyword.entries()) {
      const pattern = this.analyzeKeywordTrend(keyword, docs);

      if (pattern.classification === 'emerging' && pattern.velocity > 0) {
        emergingTrends.push(pattern);
      } else if (pattern.classification === 'declining' && pattern.velocity < 0) {
        decliningTrends.push(pattern);
      }
    }

    // Sort by strength and velocity
    emergingTrends.sort((a, b) => Math.abs(b.velocity) - Math.abs(a.velocity));
    decliningTrends.sort((a, b) => Math.abs(b.velocity) - Math.abs(a.velocity));

    // Detect seasonal patterns
    const seasonalPatterns = await this.detectSeasonalPatterns(trendData);

    // Detect cross-category correlations
    const correlations = await this.detectCrossCategoryCorrelations(trendData);

    return {
      emergingTrends: emergingTrends.slice(0, 20), // Top 20
      decliningTrends: decliningTrends.slice(0, 20),
      seasonalPatterns,
      correlations,
      timestamp: now.toISOString(),
    };
  }

  /**
   * Analyze individual keyword trend
   */
  private analyzeKeywordTrend(keyword: string, docs: TrendDocument[]): TrendPattern {
    // Sort by timestamp
    const sorted = docs.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate velocity (rate of change)
    const volumes = sorted.map((d) => d.volume);
    const velocity = this.calculateVelocity(volumes);
    const acceleration = this.calculateAcceleration(volumes);

    // Determine classification
    let classification: TrendPattern['classification'] = 'stable';
    if (velocity > this.emergingThreshold) {
      classification = 'emerging';
    } else if (velocity < this.decliningThreshold) {
      classification = 'declining';
    } else if (this.isSeasonalPattern(volumes)) {
      classification = 'seasonal';
    }

    // Calculate strength
    const strength = this.calculateStrength(velocity, acceleration);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(sorted.length, volumes);

    return {
      keyword,
      category: sorted[0]?.category || 'unknown',
      velocity,
      acceleration,
      confidence,
      classification,
      strength,
    };
  }

  /**
   * Calculate velocity (rate of change) using linear regression
   */
  private calculateVelocity(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    // Linear regression: y = mx + b
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;

    // Normalize by average to get percentage change
    return avgY > 0 ? slope / avgY : 0;
  }

  /**
   * Calculate acceleration (change in velocity)
   */
  private calculateAcceleration(values: number[]): number {
    if (values.length < 3) return 0;

    const midPoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midPoint);
    const secondHalf = values.slice(midPoint);

    const velocity1 = this.calculateVelocity(firstHalf);
    const velocity2 = this.calculateVelocity(secondHalf);

    return velocity2 - velocity1;
  }

  /**
   * Check if pattern is seasonal using autocorrelation
   */
  private isSeasonalPattern(values: number[]): boolean {
    if (values.length < 14) return false; // Need at least 2 weeks

    // Calculate autocorrelation at lag 7 (weekly seasonality)
    const correlation = this.calculateAutocorrelation(values, 7);
    return Math.abs(correlation) > this.seasonalityThreshold;
  }

  /**
   * Calculate autocorrelation at specific lag
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (lag >= values.length) return 0;

    const n = values.length - lag;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate trend strength
   */
  private calculateStrength(
    velocity: number,
    acceleration: number
  ): TrendPattern['strength'] {
    const combined = Math.abs(velocity) + Math.abs(acceleration) * 0.5;

    if (combined > 0.3) return 'strong';
    if (combined > 0.15) return 'moderate';
    return 'weak';
  }

  /**
   * Calculate confidence in trend detection
   */
  private calculateConfidence(dataPoints: number, values: number[]): number {
    // Base confidence on amount of data
    let confidence = Math.min(dataPoints / this.minDataPoints, 1.0);

    // Reduce confidence for high volatility
    const volatility = this.calculateVolatility(values);
    confidence *= Math.max(0.5, 1 - volatility);

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate volatility (coefficient of variation)
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 0;
  }

  /**
   * Detect seasonal patterns using decomposition
   */
  private async detectSeasonalPatterns(
    trendData: TrendDocument[]
  ): Promise<SeasonalPattern[]> {
    const groupedByCategory = this.groupByCategory(trendData);
    const patterns: SeasonalPattern[] = [];

    for (const [category, docs] of groupedByCategory.entries()) {
      if (docs.length < 30) continue; // Need at least 30 days

      // Sort by timestamp
      const sorted = docs.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Aggregate by day
      const dailyVolumes = this.aggregateByDay(sorted);
      if (dailyVolumes.length < 30) continue;

      // Detect periodicity
      const period = this.detectPeriod(dailyVolumes);
      if (period === 0) continue;

      // Calculate amplitude
      const amplitude = this.calculateAmplitude(dailyVolumes, period);

      // Calculate current phase
      const phase = dailyVolumes.length % period;

      // Identify peak months
      const peakMonths = this.identifyPeakMonths(sorted);

      patterns.push({
        category,
        period,
        amplitude,
        phase,
        peakMonths,
      });
    }

    return patterns.sort((a, b) => b.amplitude - a.amplitude);
  }

  /**
   * Detect dominant period using FFT-like analysis
   */
  private detectPeriod(values: number[]): number {
    const maxLag = Math.min(30, Math.floor(values.length / 2));
    let maxCorrelation = 0;
    let bestPeriod = 0;

    // Check common periods: weekly (7), bi-weekly (14), monthly (30)
    const testPeriods = [7, 14, 21, 30];

    for (const lag of testPeriods) {
      if (lag >= values.length) continue;

      const correlation = Math.abs(this.calculateAutocorrelation(values, lag));
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestPeriod = lag;
      }
    }

    return maxCorrelation > this.seasonalityThreshold ? bestPeriod : 0;
  }

  /**
   * Calculate amplitude of seasonal pattern
   */
  private calculateAmplitude(values: number[], period: number): number {
    if (period === 0) return 0;

    // Calculate mean for each phase
    const phases: number[][] = Array.from({ length: period }, () => []);

    values.forEach((val, idx) => {
      const phase = idx % period;
      phases[phase].push(val);
    });

    const phaseMeans = phases.map((phaseVals) => {
      if (phaseVals.length === 0) return 0;
      return phaseVals.reduce((a, b) => a + b, 0) / phaseVals.length;
    });

    const overallMean = values.reduce((a, b) => a + b, 0) / values.length;
    const maxDeviation = Math.max(
      ...phaseMeans.map((mean) => Math.abs(mean - overallMean))
    );

    return overallMean > 0 ? maxDeviation / overallMean : 0;
  }

  /**
   * Identify months with peak activity
   */
  private identifyPeakMonths(docs: TrendDocument[]): number[] {
    const monthlyVolumes: Map<number, number> = new Map();

    docs.forEach((doc) => {
      const month = new Date(doc.timestamp).getMonth();
      monthlyVolumes.set(month, (monthlyVolumes.get(month) || 0) + doc.volume);
    });

    const avgVolume =
      Array.from(monthlyVolumes.values()).reduce((a, b) => a + b, 0) /
      monthlyVolumes.size;

    return Array.from(monthlyVolumes.entries())
      .filter(([_, volume]) => volume > avgVolume * 1.2)
      .map(([month, _]) => month)
      .sort((a, b) => a - b);
  }

  /**
   * Detect cross-category correlations
   */
  private async detectCrossCategoryCorrelations(
    trendData: TrendDocument[]
  ): Promise<CrossCategoryCorrelation[]> {
    const groupedByCategory = this.groupByCategory(trendData);
    const categories = Array.from(groupedByCategory.keys());
    const correlations: CrossCategoryCorrelation[] = [];

    // Compare all category pairs
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const cat1 = categories[i];
        const cat2 = categories[j];

        const data1 = groupedByCategory.get(cat1)!;
        const data2 = groupedByCategory.get(cat2)!;

        // Aggregate by day
        const series1 = this.aggregateByDay(data1);
        const series2 = this.aggregateByDay(data2);

        if (series1.length < 7 || series2.length < 7) continue;

        // Calculate cross-correlation at different lags
        const { correlation, lag } = this.calculateCrossCorrelation(series1, series2);

        if (Math.abs(correlation) > 0.5) {
          // Significant correlation
          correlations.push({
            category1: cat1,
            category2: cat2,
            correlation,
            lag,
            significance: Math.abs(correlation),
          });
        }
      }
    }

    return correlations.sort((a, b) => b.significance - a.significance);
  }

  /**
   * Calculate cross-correlation between two time series
   */
  private calculateCrossCorrelation(
    series1: number[],
    series2: number[]
  ): { correlation: number; lag: number } {
    const maxLag = Math.min(7, Math.floor(Math.min(series1.length, series2.length) / 2));
    let maxCorrelation = 0;
    let bestLag = 0;

    // Align series to same length
    const minLength = Math.min(series1.length, series2.length);
    const s1 = series1.slice(-minLength);
    const s2 = series2.slice(-minLength);

    // Test different lags
    for (let lag = -maxLag; lag <= maxLag; lag++) {
      const correlation = this.calculatePearsonCorrelation(s1, s2, lag);

      if (Math.abs(correlation) > Math.abs(maxCorrelation)) {
        maxCorrelation = correlation;
        bestLag = lag;
      }
    }

    return { correlation: maxCorrelation, lag: bestLag };
  }

  /**
   * Calculate Pearson correlation with lag
   */
  private calculatePearsonCorrelation(
    x: number[],
    y: number[],
    lag: number
  ): number {
    let x_series = x;
    let y_series = y;

    // Adjust for lag
    if (lag > 0) {
      x_series = x.slice(0, -lag);
      y_series = y.slice(lag);
    } else if (lag < 0) {
      x_series = x.slice(-lag);
      y_series = y.slice(0, lag);
    }

    const n = Math.min(x_series.length, y_series.length);
    if (n < 2) return 0;

    const meanX = x_series.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y_series.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = x_series[i] - meanX;
      const dy = y_series[i] - meanY;
      numerator += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }

    const denominator = Math.sqrt(sumX2 * sumY2);
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Group documents by keyword
   */
  private groupByKeyword(docs: TrendDocument[]): Map<string, TrendDocument[]> {
    const grouped = new Map<string, TrendDocument[]>();

    docs.forEach((doc) => {
      const existing = grouped.get(doc.keyword) || [];
      existing.push(doc);
      grouped.set(doc.keyword, existing);
    });

    return grouped;
  }

  /**
   * Group documents by category
   */
  private groupByCategory(docs: TrendDocument[]): Map<string, TrendDocument[]> {
    const grouped = new Map<string, TrendDocument[]>();

    docs.forEach((doc) => {
      if (!doc.category) return;
      const existing = grouped.get(doc.category) || [];
      existing.push(doc);
      grouped.set(doc.category, existing);
    });

    return grouped;
  }

  /**
   * Aggregate documents by day
   */
  private aggregateByDay(docs: TrendDocument[]): number[] {
    const dailyMap = new Map<string, number>();

    docs.forEach((doc) => {
      const date = new Date(doc.timestamp).toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + doc.volume);
    });

    const sorted = Array.from(dailyMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    return sorted.map(([_, volume]) => volume);
  }

  /**
   * Use vector clustering to identify trend clusters
   */
  async clusterTrends(
    trendData: TrendDocument[],
    numClusters: number = 5
  ): Promise<Map<number, TrendDocument[]>> {
    // Filter documents with vectors
    const docsWithVectors = trendData.filter((doc) => doc.vector && doc.vector.length > 0);

    if (docsWithVectors.length < numClusters) {
      // Not enough data for clustering
      const clusters = new Map<number, TrendDocument[]>();
      clusters.set(0, docsWithVectors);
      return clusters;
    }

    // K-means clustering
    const clusters = this.kMeansClustering(
      docsWithVectors.map((doc) => doc.vector!),
      numClusters
    );

    // Map back to documents
    const clusterMap = new Map<number, TrendDocument[]>();
    clusters.forEach((clusterIdx, docIdx) => {
      const existing = clusterMap.get(clusterIdx) || [];
      existing.push(docsWithVectors[docIdx]);
      clusterMap.set(clusterIdx, existing);
    });

    return clusterMap;
  }

  /**
   * Simple K-means clustering implementation
   */
  private kMeansClustering(vectors: number[][], k: number): number[] {
    const n = vectors.length;
    const dim = vectors[0].length;

    // Initialize centroids randomly
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < k; i++) {
      let idx;
      do {
        idx = Math.floor(Math.random() * n);
      } while (usedIndices.has(idx));

      usedIndices.add(idx);
      centroids.push([...vectors[idx]]);
    }

    // Assignment array
    let assignments = new Array(n).fill(0);
    let changed = true;
    let iterations = 0;
    const maxIterations = 100;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Assignment step
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestCluster = 0;

        for (let j = 0; j < k; j++) {
          const dist = this.euclideanDistance(vectors[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        }

        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterPoints = vectors.filter((_, idx) => assignments[idx] === j);

        if (clusterPoints.length > 0) {
          for (let d = 0; d < dim; d++) {
            centroids[j][d] =
              clusterPoints.reduce((sum, point) => sum + point[d], 0) /
              clusterPoints.length;
          }
        }
      }
    }

    return assignments;
  }

  /**
   * Calculate Euclidean distance between vectors
   */
  private euclideanDistance(v1: number[], v2: number[]): number {
    return Math.sqrt(
      v1.reduce((sum, val, idx) => sum + Math.pow(val - v2[idx], 2), 0)
    );
  }
}
