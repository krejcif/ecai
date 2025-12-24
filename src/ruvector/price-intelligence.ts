/**
 * Price Intelligence System using ruvector
 * Provides advanced pricing analytics using vector similarity search
 */

import { VectorStore, SearchResult } from '../database/vector-store';
import { ProductDocument, CollectionName } from '../database/collections';
import { PriceVectorizer, PriceData, PriceFeatures } from './price-vectors';

export interface PriceAnomaly {
  productId: string;
  product: ProductDocument;
  anomalyScore: number; // 0-1, higher is more anomalous
  anomalyType: 'overpriced' | 'underpriced' | 'volatile' | 'stagnant' | 'outlier';
  currentPrice: number;
  expectedPrice: number;
  deviation: number; // Percentage deviation
  confidence: number; // 0-1
  explanation: string;
  clusterInfo: {
    clusterId: number;
    clusterSize: number;
    avgClusterPrice: number;
    distanceFromCenter: number;
  };
}

export interface PriceChangePrognosis {
  productId: string;
  currentPrice: number;
  predictedPrice: number;
  priceChange: number; // Amount
  priceChangePercent: number; // Percentage
  direction: 'increase' | 'decrease' | 'stable';
  confidence: number; // 0-1
  timeframe: string; // e.g., "30 days"
  factors: Array<{
    factor: string;
    impact: number; // -1 to 1
    weight: number; // 0-1
  }>;
  similarProducts: Array<{
    productId: string;
    name: string;
    similarity: number;
    recentPriceChange: number;
  }>;
}

export interface CompetitivePricing {
  productId: string;
  currentPrice: number;
  competitivePosition: 'leader' | 'competitive' | 'follower' | 'premium' | 'discount';
  similarProducts: Array<{
    productId: string;
    name: string;
    price: number;
    similarity: number;
    priceDifference: number;
    priceDifferencePercent: number;
    marketShare?: number;
  }>;
  priceRange: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
  marketPosition: {
    percentile: number; // 0-100
    rank: number;
    totalCompetitors: number;
  };
  recommendations: string[];
}

export interface PriceOptimization {
  productId: string;
  currentPrice: number;
  optimalPrice: number;
  priceAdjustment: number; // Amount
  priceAdjustmentPercent: number; // Percentage
  reasoning: string;
  expectedImpact: {
    revenueChange: number; // Percentage
    volumeChange: number; // Percentage
    marginChange: number; // Percentage
    profitChange: number; // Percentage
  };
  confidence: number; // 0-1
  priceElasticity: number; // Estimated price elasticity
  constraints: {
    minPrice: number;
    maxPrice: number;
    competitorFloor: number;
    competitorCeiling: number;
  };
  scenarios: Array<{
    price: number;
    expectedRevenue: number;
    expectedVolume: number;
    expectedProfit: number;
    probability: number;
  }>;
}

export interface PriceIntelligenceConfig {
  vectorStore?: VectorStore;
  vectorizer?: PriceVectorizer;
  anomalyThreshold?: number; // 0-1, higher is more strict
  similarityThreshold?: number; // 0-1 for finding similar products
  clusteringMethod?: 'kmeans' | 'dbscan' | 'hierarchical';
  maxCompetitors?: number;
  priceElasticityDefault?: number; // Default elasticity if not calculable
}

export class PriceIntelligence {
  private vectorStore: VectorStore;
  private vectorizer: PriceVectorizer;
  private config: Required<PriceIntelligenceConfig>;
  private productCache: Map<string, ProductDocument>;
  private priceDataCache: Map<string, PriceData>;

  constructor(config: PriceIntelligenceConfig = {}) {
    this.vectorStore = config.vectorStore || new VectorStore();
    this.vectorizer = config.vectorizer || new PriceVectorizer();
    this.config = {
      vectorStore: this.vectorStore,
      vectorizer: this.vectorizer,
      anomalyThreshold: config.anomalyThreshold ?? 0.7,
      similarityThreshold: config.similarityThreshold ?? 0.75,
      clusteringMethod: config.clusteringMethod ?? 'kmeans',
      maxCompetitors: config.maxCompetitors ?? 20,
      priceElasticityDefault: config.priceElasticityDefault ?? -1.5
    };
    this.productCache = new Map();
    this.priceDataCache = new Map();
  }

  /**
   * Find price anomalies using vector clustering
   * Groups similar products and identifies outliers
   */
  async findPriceAnomalies(
    products?: ProductDocument[],
    priceDataMap?: Map<string, PriceData>
  ): Promise<PriceAnomaly[]> {
    // Load products from vector store if not provided
    let productList: ProductDocument[];
    if (products) {
      productList = products;
    } else {
      productList = await this.loadProductsFromVectorStore();
    }

    if (productList.length === 0) {
      return [];
    }

    // Generate price vectors for all products
    const priceVectors = await this.vectorizer.createPriceVectors(productList, priceDataMap);

    // Cluster products using vector similarity
    const clusters = await this.clusterProducts(productList, priceVectors);

    // Identify anomalies in each cluster
    const anomalies: PriceAnomaly[] = [];

    for (const cluster of clusters) {
      const clusterAnomalies = this.detectClusterAnomalies(cluster);
      anomalies.push(...clusterAnomalies);
    }

    // Sort by anomaly score (highest first)
    anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);

    return anomalies;
  }

  /**
   * Predict price change based on similar products' price history
   */
  async predictPriceChange(
    productId: string,
    timeframe: number = 30 // days
  ): Promise<PriceChangePrognosis> {
    // Get product
    const product = await this.getProduct(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Generate price vector
    const priceData = this.priceDataCache.get(productId);
    const priceVector = await this.vectorizer.createPriceVector(product, priceData);

    // Find similar products using vector search
    const similarResults = await this.vectorStore.search<ProductDocument>(
      CollectionName.PRODUCTS,
      priceVector,
      { limit: this.config.maxCompetitors, scoreThreshold: this.config.similarityThreshold }
    );

    // Filter out the product itself
    const similarProducts = similarResults.filter(r => r.id !== productId);

    // Analyze price trends of similar products
    const priceTrends = await this.analyzePriceTrends(similarProducts);

    // Calculate prediction factors
    const factors = this.calculatePredictionFactors(product, similarProducts, priceTrends);

    // Calculate predicted price
    const prediction = this.computePricePrediction(product, factors, timeframe);

    const priceChange = prediction.predictedPrice - product.price;
    const priceChangePercent = (priceChange / product.price) * 100;

    return {
      productId: product.id,
      currentPrice: product.price,
      predictedPrice: prediction.predictedPrice,
      priceChange,
      priceChangePercent,
      direction: priceChange > 0.5 ? 'increase' : priceChange < -0.5 ? 'decrease' : 'stable',
      confidence: prediction.confidence,
      timeframe: `${timeframe} days`,
      factors,
      similarProducts: similarProducts.slice(0, 10).map(r => ({
        productId: r.id,
        name: r.document.name,
        similarity: r.score,
        recentPriceChange: this.getRecentPriceChange(r.document)
      }))
    };
  }

  /**
   * Get competitive pricing analysis using vector similarity
   */
  async getCompetitivePricing(productId: string): Promise<CompetitivePricing> {
    // Get product
    const product = await this.getProduct(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Generate price vector
    const priceData = this.priceDataCache.get(productId);
    const priceVector = await this.vectorizer.createPriceVector(product, priceData);

    // Find similar products (competitors) using vector search
    const similarResults = await this.vectorStore.search<ProductDocument>(
      CollectionName.PRODUCTS,
      priceVector,
      { limit: this.config.maxCompetitors + 1, scoreThreshold: this.config.similarityThreshold }
    );

    // Filter out the product itself
    const competitors = similarResults.filter(r => r.id !== productId);

    // Calculate price statistics
    const prices = competitors.map(c => c.document.price);
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      median: this.calculateMedian(prices)
    };

    // Determine market position
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const rank = sortedPrices.filter(p => p < product.price).length + 1;
    const percentile = (rank / (sortedPrices.length + 1)) * 100;

    // Determine competitive position
    const competitivePosition = this.determineCompetitivePosition(
      product.price,
      priceRange,
      percentile
    );

    // Build similar products list with details
    const similarProducts = competitors.map(r => ({
      productId: r.id,
      name: r.document.name,
      price: r.document.price,
      similarity: r.score,
      priceDifference: r.document.price - product.price,
      priceDifferencePercent: ((r.document.price - product.price) / product.price) * 100,
      marketShare: r.document.metadata?.marketShare
    }));

    // Generate recommendations
    const recommendations = this.generateCompetitiveRecommendations(
      product,
      competitivePosition,
      priceRange,
      percentile
    );

    return {
      productId: product.id,
      currentPrice: product.price,
      competitivePosition,
      similarProducts,
      priceRange,
      marketPosition: {
        percentile,
        rank,
        totalCompetitors: competitors.length
      },
      recommendations
    };
  }

  /**
   * Get price optimization recommendations
   */
  async getPriceOptimization(productId: string): Promise<PriceOptimization> {
    // Get product and competitive analysis
    const product = await this.getProduct(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const competitive = await this.getCompetitivePricing(productId);
    const priceChange = await this.predictPriceChange(productId);

    // Calculate price elasticity based on similar products
    const priceElasticity = await this.estimatePriceElasticity(productId);

    // Determine optimal price using multiple factors
    const optimization = this.calculateOptimalPrice(
      product,
      competitive,
      priceChange,
      priceElasticity
    );

    const priceAdjustment = optimization.optimalPrice - product.price;
    const priceAdjustmentPercent = (priceAdjustment / product.price) * 100;

    // Calculate expected impact
    const expectedImpact = this.calculatePriceImpact(
      product.price,
      optimization.optimalPrice,
      priceElasticity
    );

    // Define price constraints
    const constraints = {
      minPrice: competitive.priceRange.min * 0.95, // Can go 5% below minimum
      maxPrice: competitive.priceRange.max * 1.05, // Can go 5% above maximum
      competitorFloor: competitive.priceRange.min,
      competitorCeiling: competitive.priceRange.max
    };

    // Generate price scenarios
    const scenarios = this.generatePriceScenarios(
      product,
      competitive,
      priceElasticity,
      constraints
    );

    return {
      productId: product.id,
      currentPrice: product.price,
      optimalPrice: optimization.optimalPrice,
      priceAdjustment,
      priceAdjustmentPercent,
      reasoning: optimization.reasoning,
      expectedImpact,
      confidence: optimization.confidence,
      priceElasticity,
      constraints,
      scenarios
    };
  }

  /**
   * Load products from vector store
   */
  private async loadProductsFromVectorStore(): Promise<ProductDocument[]> {
    // This is a simplified version - in practice, you'd want to
    // query the vector store or use a separate product database
    const products: ProductDocument[] = [];

    // For now, return from cache
    this.productCache.forEach(product => products.push(product));

    return products;
  }

  /**
   * Cluster products based on price vectors
   */
  private async clusterProducts(
    products: ProductDocument[],
    priceVectors: Map<string, number[]>
  ): Promise<ProductCluster[]> {
    // Simple clustering based on vector similarity
    // In production, you'd use k-means or DBSCAN

    const clusters: ProductCluster[] = [];
    const assigned = new Set<string>();

    for (const product of products) {
      if (assigned.has(product.id)) continue;

      const cluster: ProductCluster = {
        id: clusters.length,
        products: [product],
        centerVector: priceVectors.get(product.id)!,
        avgPrice: product.price,
        priceStdDev: 0
      };

      // Find similar products for this cluster
      const productVector = priceVectors.get(product.id)!;

      for (const otherProduct of products) {
        if (otherProduct.id === product.id || assigned.has(otherProduct.id)) continue;

        const otherVector = priceVectors.get(otherProduct.id)!;
        const similarity = this.cosineSimilarity(productVector, otherVector);

        if (similarity >= 0.85) {
          cluster.products.push(otherProduct);
          assigned.add(otherProduct.id);
        }
      }

      assigned.add(product.id);

      // Calculate cluster statistics
      const prices = cluster.products.map(p => p.price);
      cluster.avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      cluster.priceStdDev = this.calculateStdDev(prices);

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Detect anomalies within a cluster
   */
  private detectClusterAnomalies(cluster: ProductCluster): PriceAnomaly[] {
    const anomalies: PriceAnomaly[] = [];

    for (const product of cluster.products) {
      // Calculate z-score
      const zScore = Math.abs((product.price - cluster.avgPrice) / Math.max(cluster.priceStdDev, 1));

      // Anomaly if z-score > threshold
      if (zScore > 2.5) {
        const deviation = ((product.price - cluster.avgPrice) / cluster.avgPrice) * 100;
        const anomalyType = product.price > cluster.avgPrice ? 'overpriced' : 'underpriced';

        anomalies.push({
          productId: product.id,
          product,
          anomalyScore: Math.min(1, zScore / 5), // Normalize to 0-1
          anomalyType,
          currentPrice: product.price,
          expectedPrice: cluster.avgPrice,
          deviation,
          confidence: Math.min(0.95, 0.5 + (zScore / 10)),
          explanation: `Price is ${Math.abs(deviation).toFixed(1)}% ${anomalyType.includes('over') ? 'above' : 'below'} similar products`,
          clusterInfo: {
            clusterId: cluster.id,
            clusterSize: cluster.products.length,
            avgClusterPrice: cluster.avgPrice,
            distanceFromCenter: zScore
          }
        });
      }
    }

    return anomalies;
  }

  /**
   * Analyze price trends from similar products
   */
  private async analyzePriceTrends(similarProducts: SearchResult<ProductDocument>[]): Promise<PriceTrend> {
    const trends: number[] = [];

    for (const result of similarProducts) {
      const trend = this.getRecentPriceChange(result.document);
      trends.push(trend);
    }

    const avgTrend = trends.length > 0
      ? trends.reduce((a, b) => a + b, 0) / trends.length
      : 0;

    const trendDirection = avgTrend > 1 ? 'increasing' : avgTrend < -1 ? 'decreasing' : 'stable';

    return {
      direction: trendDirection,
      averageChange: avgTrend,
      volatility: this.calculateStdDev(trends),
      samples: trends.length
    };
  }

  /**
   * Calculate factors that influence price prediction
   */
  private calculatePredictionFactors(
    product: ProductDocument,
    similarProducts: SearchResult<ProductDocument>[],
    trends: PriceTrend
  ): Array<{ factor: string; impact: number; weight: number }> {
    const factors: Array<{ factor: string; impact: number; weight: number }> = [];

    // Market trend factor
    factors.push({
      factor: 'Market Trend',
      impact: trends.averageChange / 100, // Normalize to -1 to 1
      weight: 0.3
    });

    // Category average factor
    const categoryStats = this.vectorizer.getCategoryStats(product.category);
    if (categoryStats) {
      const categoryImpact = ((categoryStats.mean - product.price) / product.price) * 0.1;
      factors.push({
        factor: 'Category Average',
        impact: Math.max(-1, Math.min(1, categoryImpact)),
        weight: 0.2
      });
    }

    // Competitor pricing factor
    if (similarProducts.length > 0) {
      const avgCompetitorPrice = similarProducts.reduce((sum, r) => sum + r.document.price, 0) / similarProducts.length;
      const competitorImpact = ((avgCompetitorPrice - product.price) / product.price) * 0.15;
      factors.push({
        factor: 'Competitor Pricing',
        impact: Math.max(-1, Math.min(1, competitorImpact)),
        weight: 0.25
      });
    }

    // Volatility factor
    factors.push({
      factor: 'Price Volatility',
      impact: trends.volatility > 10 ? 0.1 : -0.05,
      weight: 0.15
    });

    // Seasonal factor (simplified)
    const seasonalImpact = this.calculateSeasonalImpact(product);
    factors.push({
      factor: 'Seasonal Adjustment',
      impact: seasonalImpact,
      weight: 0.1
    });

    return factors;
  }

  /**
   * Compute price prediction based on factors
   */
  private computePricePrediction(
    product: ProductDocument,
    factors: Array<{ factor: string; impact: number; weight: number }>,
    timeframe: number
  ): { predictedPrice: number; confidence: number } {
    // Weighted average of all factors
    let totalImpact = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      totalImpact += factor.impact * factor.weight;
      totalWeight += factor.weight;
    }

    const avgImpact = totalWeight > 0 ? totalImpact / totalWeight : 0;

    // Scale impact by timeframe (longer timeframe = more change)
    const scaledImpact = avgImpact * (timeframe / 30);

    // Calculate predicted price
    const predictedPrice = product.price * (1 + scaledImpact);

    // Calculate confidence based on factor agreement
    const factorVariance = this.calculateFactorVariance(factors);
    const confidence = Math.max(0.3, Math.min(0.95, 1 - factorVariance));

    return {
      predictedPrice: Math.max(0, predictedPrice),
      confidence
    };
  }

  /**
   * Estimate price elasticity for a product
   */
  private async estimatePriceElasticity(productId: string): Promise<number> {
    const priceData = this.priceDataCache.get(productId);

    if (!priceData?.priceHistory || priceData.priceHistory.length < 2) {
      return this.config.priceElasticityDefault;
    }

    // Simplified elasticity calculation
    // In practice, you'd use regression on price vs. volume data
    const product = await this.getProduct(productId);
    if (!product) return this.config.priceElasticityDefault;

    // Use category-based elasticity estimates
    const categoryElasticity: Record<string, number> = {
      'electronics': -1.8,
      'luxury': -0.8,
      'essentials': -0.5,
      'clothing': -1.5,
      'books': -1.2
    };

    const category = product.category.toLowerCase();
    for (const [key, elasticity] of Object.entries(categoryElasticity)) {
      if (category.includes(key)) {
        return elasticity;
      }
    }

    return this.config.priceElasticityDefault;
  }

  /**
   * Calculate optimal price using multiple factors
   */
  private calculateOptimalPrice(
    product: ProductDocument,
    competitive: CompetitivePricing,
    priceChange: PriceChangePrognosis,
    elasticity: number
  ): { optimalPrice: number; reasoning: string; confidence: number } {
    const factors: number[] = [];
    const reasons: string[] = [];

    // Factor 1: Competitive position
    if (competitive.competitivePosition === 'follower') {
      const targetPrice = competitive.priceRange.average * 0.98;
      factors.push(targetPrice);
      reasons.push('Price below market average to be competitive');
    } else if (competitive.competitivePosition === 'premium') {
      const targetPrice = competitive.priceRange.average * 1.1;
      factors.push(targetPrice);
      reasons.push('Premium positioning justified');
    } else {
      factors.push(competitive.priceRange.median);
      reasons.push('Align with market median');
    }

    // Factor 2: Predicted price trend
    if (Math.abs(priceChange.priceChangePercent) > 2) {
      const trendAdjustedPrice = product.price + (priceChange.priceChange * 0.5);
      factors.push(trendAdjustedPrice);
      reasons.push(`Market trending ${priceChange.direction}`);
    }

    // Factor 3: Profit maximization (using elasticity)
    const profitMaxPrice = this.calculateProfitMaximizingPrice(
      product.price,
      elasticity,
      competitive.priceRange
    );
    factors.push(profitMaxPrice);
    reasons.push('Profit maximization based on elasticity');

    // Calculate weighted average
    const optimalPrice = factors.reduce((a, b) => a + b, 0) / factors.length;

    // Confidence based on factor agreement
    const variance = this.calculateStdDev(factors);
    const confidence = Math.max(0.4, Math.min(0.9, 1 - (variance / product.price)));

    return {
      optimalPrice,
      reasoning: reasons.join('; '),
      confidence
    };
  }

  /**
   * Calculate profit-maximizing price
   */
  private calculateProfitMaximizingPrice(
    currentPrice: number,
    elasticity: number,
    priceRange: { min: number; max: number; average: number }
  ): number {
    // Profit maximization: P* = MC / (1 + 1/E)
    // Simplified: assume MC ≈ 50% of current price
    const estimatedMC = currentPrice * 0.5;
    const profitMaxPrice = estimatedMC / (1 + 1 / Math.abs(elasticity));

    // Constrain to reasonable range
    return Math.max(priceRange.min * 0.9, Math.min(priceRange.max * 1.1, profitMaxPrice));
  }

  /**
   * Calculate expected impact of price change
   */
  private calculatePriceImpact(
    currentPrice: number,
    newPrice: number,
    elasticity: number
  ): {
    revenueChange: number;
    volumeChange: number;
    marginChange: number;
    profitChange: number;
  } {
    const priceChangePercent = ((newPrice - currentPrice) / currentPrice) * 100;
    const volumeChange = elasticity * priceChangePercent;
    const revenueChange = priceChangePercent + volumeChange;
    const marginChange = priceChangePercent * 0.8; // Simplified
    const profitChange = revenueChange + marginChange;

    return {
      revenueChange,
      volumeChange,
      marginChange,
      profitChange
    };
  }

  /**
   * Generate price scenarios
   */
  private generatePriceScenarios(
    product: ProductDocument,
    competitive: CompetitivePricing,
    elasticity: number,
    constraints: { minPrice: number; maxPrice: number }
  ): Array<{
    price: number;
    expectedRevenue: number;
    expectedVolume: number;
    expectedProfit: number;
    probability: number;
  }> {
    const scenarios: any[] = [];
    const baseVolume = 100; // Normalized base volume
    const baseRevenue = product.price * baseVolume;

    // Current price scenario
    scenarios.push({
      price: product.price,
      expectedRevenue: baseRevenue,
      expectedVolume: baseVolume,
      expectedProfit: baseRevenue * 0.2, // Assume 20% margin
      probability: 1.0
    });

    // Price reduction scenario (-10%)
    const lowerPrice = product.price * 0.9;
    if (lowerPrice >= constraints.minPrice) {
      const volumeIncrease = Math.abs(elasticity) * 10;
      const newVolume = baseVolume * (1 + volumeIncrease / 100);
      scenarios.push({
        price: lowerPrice,
        expectedRevenue: lowerPrice * newVolume,
        expectedVolume: newVolume,
        expectedProfit: lowerPrice * newVolume * 0.18,
        probability: 0.7
      });
    }

    // Price increase scenario (+10%)
    const higherPrice = product.price * 1.1;
    if (higherPrice <= constraints.maxPrice) {
      const volumeDecrease = Math.abs(elasticity) * 10;
      const newVolume = baseVolume * (1 - volumeDecrease / 100);
      scenarios.push({
        price: higherPrice,
        expectedRevenue: higherPrice * newVolume,
        expectedVolume: newVolume,
        expectedProfit: higherPrice * newVolume * 0.22,
        probability: 0.6
      });
    }

    // Market median scenario
    if (competitive.priceRange.median !== product.price) {
      const medianPrice = competitive.priceRange.median;
      const priceChange = ((medianPrice - product.price) / product.price) * 100;
      const volumeChange = Math.abs(elasticity) * Math.abs(priceChange);
      const newVolume = baseVolume * (1 + (priceChange > 0 ? -volumeChange : volumeChange) / 100);
      scenarios.push({
        price: medianPrice,
        expectedRevenue: medianPrice * newVolume,
        expectedVolume: newVolume,
        expectedProfit: medianPrice * newVolume * 0.2,
        probability: 0.8
      });
    }

    return scenarios;
  }

  /**
   * Determine competitive position based on price
   */
  private determineCompetitivePosition(
    price: number,
    priceRange: { min: number; max: number; average: number },
    percentile: number
  ): 'leader' | 'competitive' | 'follower' | 'premium' | 'discount' {
    if (percentile < 25) return 'discount';
    if (percentile > 75) return 'premium';
    if (price < priceRange.average * 0.95) return 'competitive';
    if (price > priceRange.average * 1.05) return 'leader';
    return 'competitive';
  }

  /**
   * Generate competitive recommendations
   */
  private generateCompetitiveRecommendations(
    product: ProductDocument,
    position: string,
    priceRange: { min: number; max: number; average: number; median: number },
    percentile: number
  ): string[] {
    const recommendations: string[] = [];

    if (position === 'premium' && percentile > 90) {
      recommendations.push('Consider justifying premium pricing with additional value propositions');
      recommendations.push('Monitor competitor reactions to high pricing');
    } else if (position === 'discount' && percentile < 10) {
      recommendations.push('Low pricing may signal low quality - consider repositioning');
      recommendations.push('Verify if margins are sustainable at current price');
    } else if (position === 'competitive') {
      recommendations.push('Well-positioned in the market');
      recommendations.push('Monitor for price wars in the category');
    }

    const priceVsAvg = ((product.price - priceRange.average) / priceRange.average) * 100;
    if (Math.abs(priceVsAvg) > 15) {
      recommendations.push(`Price is ${Math.abs(priceVsAvg).toFixed(1)}% ${priceVsAvg > 0 ? 'above' : 'below'} market average`);
    }

    return recommendations;
  }

  /**
   * Get recent price change for a product
   */
  private getRecentPriceChange(product: ProductDocument): number {
    const priceData = this.priceDataCache.get(product.id);
    if (!priceData?.priceHistory || priceData.priceHistory.length < 2) {
      return 0;
    }

    const recent = priceData.priceHistory.slice(-7); // Last 7 data points
    if (recent.length < 2) return 0;

    const oldPrice = recent[0].price;
    const newPrice = recent[recent.length - 1].price;

    return ((newPrice - oldPrice) / oldPrice) * 100;
  }

  /**
   * Calculate seasonal impact
   */
  private calculateSeasonalImpact(product: ProductDocument): number {
    const month = new Date().getMonth();
    const category = product.category.toLowerCase();

    // Simplified seasonal factors
    if (category.includes('electronics')) {
      return month === 10 || month === 11 ? 0.1 : 0; // Holiday season
    } else if (category.includes('clothing')) {
      return month === 5 || month === 11 ? 0.08 : 0; // Summer and winter sales
    }

    return 0;
  }

  /**
   * Calculate variance in prediction factors
   */
  private calculateFactorVariance(factors: Array<{ impact: number; weight: number }>): number {
    const impacts = factors.map(f => f.impact);
    return this.calculateStdDev(impacts);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  /**
   * Calculate median of an array
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Get product by ID
   */
  private async getProduct(productId: string): Promise<ProductDocument | null> {
    // Check cache first
    if (this.productCache.has(productId)) {
      return this.productCache.get(productId)!;
    }

    // In a real implementation, query from database
    return null;
  }

  /**
   * Add product to cache
   */
  addProduct(product: ProductDocument, priceData?: PriceData): void {
    this.productCache.set(product.id, product);
    if (priceData) {
      this.priceDataCache.set(product.id, priceData);
    }
  }

  /**
   * Add multiple products to cache
   */
  addProducts(products: ProductDocument[], priceDataMap?: Map<string, PriceData>): void {
    for (const product of products) {
      this.productCache.set(product.id, product);
      if (priceDataMap?.has(product.id)) {
        this.priceDataCache.set(product.id, priceDataMap.get(product.id)!);
      }
    }
  }
}

// Helper interfaces
interface ProductCluster {
  id: number;
  products: ProductDocument[];
  centerVector: number[];
  avgPrice: number;
  priceStdDev: number;
}

interface PriceTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  averageChange: number;
  volatility: number;
  samples: number;
}
