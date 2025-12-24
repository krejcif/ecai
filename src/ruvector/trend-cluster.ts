/**
 * TrendClusterer - Groups and analyzes product trends using vector similarity
 * Uses ruvector for efficient similarity search and clustering
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { VectorizedTrend, TrendVectorizer, TrendVectorData } from './trend-vectors';

export interface ProductTrendData {
  productId: string;
  productName: string;
  category: string;
  signals: {
    searchVolume: number;
    salesVelocity: number;
    socialMentions: number;
    priceChange: number;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TrendCluster {
  clusterId: string;
  centroid: number[];
  products: VectorizedTrend[];
  size: number;
  avgVelocity: number;
  dominantCategory?: string;
  keywords: string[];
  timestamp: string;
}

export interface EmergingTrend {
  clusterId: string;
  keyword: string;
  category?: string;
  growthRate: number;
  velocity: number;
  acceleration: number;
  clusterSize: number;
  confidence: number;
  products: string[];
  signals: {
    avgSearchVolume: number;
    avgSalesVelocity: number;
    avgSocialMentions: number;
    avgPriceChange: number;
  };
  timestamp: string;
}

export interface TrendVelocity {
  clusterId: string;
  currentVelocity: number;
  historicalVelocity: number[];
  acceleration: number;
  growthRate: number;
  trend: 'accelerating' | 'decelerating' | 'stable';
  projectedGrowth: number;
}

export interface RelatedTrend {
  trendId: string;
  keyword: string;
  category?: string;
  similarity: number;
  correlationScore: number;
  sharedProducts: string[];
  relationshipType: 'similar' | 'complementary' | 'substitutable';
}

export interface ClusteringOptions {
  numClusters?: number;
  minClusterSize?: number;
  similarityThreshold?: number;
  useTemporalFeatures?: boolean;
}

export class TrendClusterer {
  private vectorizer: TrendVectorizer;
  private dataPath: string;
  private collectionPath: string;
  private clusterHistory: Map<string, TrendVelocity[]>;

  constructor(dataPath: string = '/home/user/ecai/data') {
    this.vectorizer = new TrendVectorizer();
    this.dataPath = dataPath;
    this.collectionPath = path.join(dataPath, 'trend-clusters');
    this.clusterHistory = new Map();

    // Ensure data directory exists
    this.ensureDataDirectory();
  }

  /**
   * Cluster products by trend similarity
   */
  async clusterProducts(
    products: ProductTrendData[],
    options: ClusteringOptions = {}
  ): Promise<TrendCluster[]> {
    const numClusters = options.numClusters ?? Math.min(Math.ceil(Math.sqrt(products.length)), 10);
    const minClusterSize = options.minClusterSize ?? 2;

    // Convert products to vectorized trends
    const trendData: TrendVectorData[] = products.map(p => ({
      id: p.productId,
      keyword: p.productName,
      category: p.category,
      signals: p.signals,
      timestamp: p.timestamp,
      metadata: p.metadata,
    }));

    const vectorized = await this.vectorizer.createTrendVectors(trendData, {
      useEmbeddings: true,
      includeTemporalFeatures: options.useTemporalFeatures ?? true,
    });

    // Perform K-means clustering
    const clusters = await this.performKMeansClustering(vectorized, numClusters);

    // Filter out small clusters
    const validClusters = clusters.filter(c => c.size >= minClusterSize);

    // Sort by velocity (most active first)
    validClusters.sort((a, b) => Math.abs(b.avgVelocity) - Math.abs(a.avgVelocity));

    return validClusters;
  }

  /**
   * Detect emerging trends from clusters
   */
  async detectEmergingTrends(
    clusters: TrendCluster[],
    minGrowthRate: number = 0.15
  ): Promise<EmergingTrend[]> {
    const emergingTrends: EmergingTrend[] = [];

    for (const cluster of clusters) {
      // Calculate cluster metrics
      const avgSignals = this.calculateAverageSignals(cluster.products);
      const velocity = this.calculateClusterVelocity(cluster);
      const acceleration = this.calculateClusterAcceleration(cluster);
      const growthRate = this.calculateGrowthRate(cluster);

      // Check if trend is emerging
      if (growthRate >= minGrowthRate && velocity > 0) {
        const confidence = this.calculateEmergingConfidence(
          cluster,
          velocity,
          acceleration,
          growthRate
        );

        emergingTrends.push({
          clusterId: cluster.clusterId,
          keyword: cluster.keywords[0] || 'Unknown',
          category: cluster.dominantCategory,
          growthRate,
          velocity,
          acceleration,
          clusterSize: cluster.size,
          confidence,
          products: cluster.products.map(p => p.id),
          signals: avgSignals,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Sort by confidence and growth rate
    emergingTrends.sort((a, b) => {
      const scoreDiff = (b.confidence * b.growthRate) - (a.confidence * a.growthRate);
      return scoreDiff;
    });

    return emergingTrends;
  }

  /**
   * Get trend velocity - how fast a trend cluster is growing
   */
  getTrendVelocity(clusterId: string, currentCluster?: TrendCluster): TrendVelocity {
    const history = this.clusterHistory.get(clusterId) || [];
    const historicalVelocity = history.map(h => h.currentVelocity);

    let currentVelocity = 0;
    let acceleration = 0;
    let growthRate = 0;

    if (currentCluster) {
      currentVelocity = this.calculateClusterVelocity(currentCluster);
      acceleration = this.calculateClusterAcceleration(currentCluster);
      growthRate = this.calculateGrowthRate(currentCluster);
    }

    // Determine trend direction
    let trend: TrendVelocity['trend'] = 'stable';
    if (acceleration > 0.1) {
      trend = 'accelerating';
    } else if (acceleration < -0.1) {
      trend = 'decelerating';
    }

    // Project future growth using linear regression
    const projectedGrowth = this.projectGrowth(historicalVelocity, currentVelocity);

    const velocity: TrendVelocity = {
      clusterId,
      currentVelocity,
      historicalVelocity,
      acceleration,
      growthRate,
      trend,
      projectedGrowth,
    };

    // Update history
    if (currentCluster) {
      history.push(velocity);
      // Keep only last 30 data points
      if (history.length > 30) {
        history.shift();
      }
      this.clusterHistory.set(clusterId, history);
    }

    return velocity;
  }

  /**
   * Get related trends using vector similarity
   */
  async getRelatedTrends(
    trendId: string,
    allTrends: VectorizedTrend[],
    limit: number = 10
  ): Promise<RelatedTrend[]> {
    // Find the target trend
    const targetTrend = allTrends.find(t => t.id === trendId || t.keyword === trendId);
    if (!targetTrend || !targetTrend.vector) {
      return [];
    }

    // Calculate similarities using ruvector
    const similarities = await this.calculateSimilarities(targetTrend, allTrends);

    // Convert to RelatedTrend objects
    const relatedTrends: RelatedTrend[] = similarities
      .filter(s => s.id !== trendId)
      .map(s => {
        const trend = allTrends.find(t => t.id === s.id)!;
        const correlationScore = this.calculateCorrelation(targetTrend, trend);
        const relationshipType = this.determineRelationshipType(
          targetTrend,
          trend,
          s.similarity,
          correlationScore
        );

        return {
          trendId: s.id,
          keyword: trend.keyword,
          category: trend.category,
          similarity: s.similarity,
          correlationScore,
          sharedProducts: [], // Could be enhanced to track shared products
          relationshipType,
        };
      })
      .slice(0, limit);

    return relatedTrends;
  }

  /**
   * Perform K-means clustering
   */
  private async performKMeansClustering(
    trends: VectorizedTrend[],
    k: number
  ): Promise<TrendCluster[]> {
    const n = trends.length;
    if (n === 0) return [];
    if (n < k) k = n;

    const vectors = trends.map(t => t.vector);
    const dim = vectors[0].length;

    // Initialize centroids using k-means++
    const centroids = this.initializeCentroidsKMeansPlusPlus(vectors, k);

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
        let maxSimilarity = -Infinity;
        let bestCluster = 0;

        for (let j = 0; j < k; j++) {
          const similarity = this.cosineSimilarity(vectors[i], centroids[j]);
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
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
        const clusterVectors = vectors.filter((_, idx) => assignments[idx] === j);

        if (clusterVectors.length > 0) {
          centroids[j] = this.calculateCentroid(clusterVectors);
        }
      }
    }

    // Build cluster objects
    const clusters: TrendCluster[] = [];
    const timestamp = new Date().toISOString();

    for (let j = 0; j < k; j++) {
      const clusterTrends = trends.filter((_, idx) => assignments[idx] === j);

      if (clusterTrends.length === 0) continue;

      const avgVelocity = this.calculateAverageVelocity(clusterTrends);
      const dominantCategory = this.findDominantCategory(clusterTrends);
      const keywords = this.extractKeywords(clusterTrends);

      clusters.push({
        clusterId: `cluster_${j}_${Date.now()}`,
        centroid: centroids[j],
        products: clusterTrends,
        size: clusterTrends.length,
        avgVelocity,
        dominantCategory,
        keywords,
        timestamp,
      });
    }

    return clusters;
  }

  /**
   * Initialize centroids using k-means++ algorithm
   */
  private initializeCentroidsKMeansPlusPlus(vectors: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const n = vectors.length;

    // Choose first centroid randomly
    const firstIdx = Math.floor(Math.random() * n);
    centroids.push([...vectors[firstIdx]]);

    // Choose remaining centroids
    for (let i = 1; i < k; i++) {
      const distances: number[] = [];

      // Calculate distance to nearest centroid for each point
      for (let j = 0; j < n; j++) {
        let minDist = Infinity;

        for (const centroid of centroids) {
          const dist = this.euclideanDistance(vectors[j], centroid);
          minDist = Math.min(minDist, dist);
        }

        distances.push(minDist * minDist);
      }

      // Choose next centroid with probability proportional to distance squared
      const totalDist = distances.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalDist;

      for (let j = 0; j < n; j++) {
        random -= distances[j];
        if (random <= 0) {
          centroids.push([...vectors[j]]);
          break;
        }
      }
    }

    return centroids;
  }

  /**
   * Calculate centroid of vectors
   */
  private calculateCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];

    const dim = vectors[0].length;
    const centroid = new Array(dim).fill(0);

    for (const vector of vectors) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += vector[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      centroid[i] /= vectors.length;
    }

    return centroid;
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * Calculate Euclidean distance
   */
  private euclideanDistance(v1: number[], v2: number[]): number {
    return Math.sqrt(
      v1.reduce((sum, val, idx) => sum + Math.pow(val - v2[idx], 2), 0)
    );
  }

  /**
   * Calculate similarities between target and all trends
   */
  private async calculateSimilarities(
    target: VectorizedTrend,
    allTrends: VectorizedTrend[]
  ): Promise<Array<{ id: string; similarity: number }>> {
    const similarities = allTrends.map(trend => ({
      id: trend.id,
      similarity: this.cosineSimilarity(target.vector, trend.vector),
    }));

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities;
  }

  /**
   * Calculate correlation between two trends
   */
  private calculateCorrelation(trend1: VectorizedTrend, trend2: VectorizedTrend): number {
    // Use signal correlation
    const signals1 = [
      trend1.signals.searchVolume,
      trend1.signals.salesVelocity,
      trend1.signals.socialMentions,
      trend1.signals.priceChange,
    ];

    const signals2 = [
      trend2.signals.searchVolume,
      trend2.signals.salesVelocity,
      trend2.signals.socialMentions,
      trend2.signals.priceChange,
    ];

    return this.pearsonCorrelation(signals1, signals2);
  }

  /**
   * Calculate Pearson correlation
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }

    const denominator = Math.sqrt(sumX2 * sumY2);
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Determine relationship type between trends
   */
  private determineRelationshipType(
    trend1: VectorizedTrend,
    trend2: VectorizedTrend,
    similarity: number,
    correlation: number
  ): RelatedTrend['relationshipType'] {
    // Similar: high similarity and positive correlation
    if (similarity > 0.8 && correlation > 0.6) {
      return 'similar';
    }

    // Complementary: moderate similarity, positive correlation
    if (similarity > 0.5 && correlation > 0.3) {
      return 'complementary';
    }

    // Substitutable: high similarity but different velocity directions
    if (similarity > 0.7 && Math.abs(correlation) < 0.3) {
      return 'substitutable';
    }

    return 'similar';
  }

  /**
   * Calculate average signals for a cluster
   */
  private calculateAverageSignals(trends: VectorizedTrend[]) {
    const n = trends.length;
    if (n === 0) {
      return {
        avgSearchVolume: 0,
        avgSalesVelocity: 0,
        avgSocialMentions: 0,
        avgPriceChange: 0,
      };
    }

    let totalSearchVolume = 0;
    let totalSalesVelocity = 0;
    let totalSocialMentions = 0;
    let totalPriceChange = 0;

    for (const trend of trends) {
      totalSearchVolume += trend.signals.searchVolume || 0;
      totalSalesVelocity += trend.signals.salesVelocity || 0;
      totalSocialMentions += trend.signals.socialMentions || 0;
      totalPriceChange += trend.signals.priceChange || 0;
    }

    return {
      avgSearchVolume: totalSearchVolume / n,
      avgSalesVelocity: totalSalesVelocity / n,
      avgSocialMentions: totalSocialMentions / n,
      avgPriceChange: totalPriceChange / n,
    };
  }

  /**
   * Calculate cluster velocity
   */
  private calculateClusterVelocity(cluster: TrendCluster): number {
    return cluster.avgVelocity;
  }

  /**
   * Calculate average velocity from trends
   */
  private calculateAverageVelocity(trends: VectorizedTrend[]): number {
    if (trends.length === 0) return 0;

    const velocities = trends.map(t => t.signals.salesVelocity || 0);
    return velocities.reduce((a, b) => a + b, 0) / velocities.length;
  }

  /**
   * Calculate cluster acceleration
   */
  private calculateClusterAcceleration(cluster: TrendCluster): number {
    // Use historical data if available
    const history = this.clusterHistory.get(cluster.clusterId) || [];

    if (history.length < 2) {
      return 0;
    }

    // Calculate acceleration as change in velocity
    const recent = history.slice(-5); // Last 5 data points
    const velocities = recent.map(h => h.currentVelocity);

    if (velocities.length < 2) return 0;

    const firstHalf = velocities.slice(0, Math.floor(velocities.length / 2));
    const secondHalf = velocities.slice(Math.floor(velocities.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return avgSecond - avgFirst;
  }

  /**
   * Calculate growth rate for cluster
   */
  private calculateGrowthRate(cluster: TrendCluster): number {
    // Average search volume growth as proxy
    const searchVolumes = cluster.products.map(p => p.signals.searchVolume || 0);
    const avgSearchVolume = searchVolumes.reduce((a, b) => a + b, 0) / searchVolumes.length;

    // Normalize to growth rate (0-1 scale)
    return Math.min(avgSearchVolume, 1.0);
  }

  /**
   * Calculate confidence for emerging trend
   */
  private calculateEmergingConfidence(
    cluster: TrendCluster,
    velocity: number,
    acceleration: number,
    growthRate: number
  ): number {
    // Factors:
    // 1. Cluster size (more products = higher confidence)
    // 2. Velocity magnitude
    // 3. Positive acceleration
    // 4. Growth rate

    const sizeScore = Math.min(cluster.size / 20, 1.0);
    const velocityScore = Math.min(Math.abs(velocity), 1.0);
    const accelerationScore = acceleration > 0 ? Math.min(acceleration * 2, 1.0) : 0;
    const growthScore = Math.min(growthRate, 1.0);

    return (
      sizeScore * 0.2 +
      velocityScore * 0.3 +
      accelerationScore * 0.3 +
      growthScore * 0.2
    );
  }

  /**
   * Project future growth using linear regression
   */
  private projectGrowth(historicalVelocity: number[], currentVelocity: number): number {
    if (historicalVelocity.length === 0) {
      return currentVelocity;
    }

    // Simple linear regression
    const n = historicalVelocity.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = historicalVelocity;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Project one step ahead
    return currentVelocity + slope;
  }

  /**
   * Find dominant category in cluster
   */
  private findDominantCategory(trends: VectorizedTrend[]): string | undefined {
    const categoryCounts = new Map<string, number>();

    for (const trend of trends) {
      if (trend.category) {
        categoryCounts.set(trend.category, (categoryCounts.get(trend.category) || 0) + 1);
      }
    }

    let maxCount = 0;
    let dominantCategory: string | undefined;

    for (const [category, count] of categoryCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantCategory = category;
      }
    }

    return dominantCategory;
  }

  /**
   * Extract keywords from cluster
   */
  private extractKeywords(trends: VectorizedTrend[]): string[] {
    // Get unique keywords, sorted by frequency
    const keywordCounts = new Map<string, number>();

    for (const trend of trends) {
      keywordCounts.set(trend.keyword, (keywordCounts.get(trend.keyword) || 0) + 1);
    }

    return Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([keyword, _]) => keyword)
      .slice(0, 10); // Top 10 keywords
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
    if (!fs.existsSync(this.collectionPath)) {
      fs.mkdirSync(this.collectionPath, { recursive: true });
    }
  }

  /**
   * Clear cluster history
   */
  clearHistory(): void {
    this.clusterHistory.clear();
  }

  /**
   * Get cluster history
   */
  getClusterHistory(clusterId: string): TrendVelocity[] {
    return this.clusterHistory.get(clusterId) || [];
  }

  /**
   * Get all cluster histories
   */
  getAllClusterHistories(): Map<string, TrendVelocity[]> {
    return new Map(this.clusterHistory);
  }
}
