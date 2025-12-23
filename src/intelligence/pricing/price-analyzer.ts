/**
 * Price analysis system for market intelligence and competitive pricing
 */

import { ProductDocument } from '../../database/collections';
import { EmbeddingService } from '../../database/embeddings';

export interface MarketStatistics {
  category: string;
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
    p95: number;
  };
}

export interface PricePosition {
  productId: string;
  price: number;
  position: 'budget' | 'mid-range' | 'premium' | 'luxury';
  percentile: number; // 0-100
  relativeToMean: number; // Percentage difference from mean
  relativeToMedian: number; // Percentage difference from median
  competitiveness: 'very-competitive' | 'competitive' | 'average' | 'expensive' | 'very-expensive';
}

export interface CompetitiveAnalysis {
  productId: string;
  currentPrice: number;
  competitors: Array<{
    productId: string;
    name: string;
    price: number;
    similarity: number;
    priceDifference: number;
    priceDifferencePercent: number;
  }>;
  marketPosition: PricePosition;
  recommendedPriceRange: {
    min: number;
    optimal: number;
    max: number;
  };
}

export interface PriceRecommendation {
  productId: string;
  currentPrice: number;
  recommendedPrice: number;
  reason: string;
  expectedImpact: {
    revenueChange: number; // Percentage
    volumeChange: number; // Percentage
    marginChange: number; // Percentage
  };
  confidence: number; // 0-1
}

export interface ElasticityEstimate {
  productId: string;
  elasticity: number; // Price elasticity of demand
  category: 'elastic' | 'inelastic' | 'unitary';
  confidence: number; // 0-1
  basedOnSamples: number;
}

export interface PriceAnalyzerConfig {
  budgetThreshold?: number; // Percentile threshold for budget (default: 25)
  midRangeThreshold?: number; // Percentile threshold for mid-range (default: 75)
  premiumThreshold?: number; // Percentile threshold for premium (default: 90)
  similarityThreshold?: number; // Minimum similarity for competitors (default: 0.7)
  maxCompetitors?: number; // Maximum competitors to include (default: 10)
}

export class PriceAnalyzer {
  private embeddings: EmbeddingService;
  private products: Map<string, ProductDocument>;
  private config: Required<PriceAnalyzerConfig>;

  constructor(
    embeddings: EmbeddingService,
    config: PriceAnalyzerConfig = {}
  ) {
    this.embeddings = embeddings;
    this.products = new Map();
    this.config = {
      budgetThreshold: config.budgetThreshold ?? 25,
      midRangeThreshold: config.midRangeThreshold ?? 75,
      premiumThreshold: config.premiumThreshold ?? 90,
      similarityThreshold: config.similarityThreshold ?? 0.7,
      maxCompetitors: config.maxCompetitors ?? 10
    };
  }

  /**
   * Index products for analysis
   */
  indexProducts(products: ProductDocument[]): void {
    for (const product of products) {
      this.products.set(product.id, product);
    }
  }

  /**
   * Calculate market statistics for a category
   */
  calculateMarketStatistics(category?: string): MarketStatistics {
    let products = Array.from(this.products.values());

    if (category) {
      products = products.filter(p => p.category === category);
    }

    if (products.length === 0) {
      throw new Error('No products found for analysis');
    }

    const prices = products.map(p => p.price).sort((a, b) => a - b);
    const mean = this.calculateMean(prices);
    const stdDev = this.calculateStdDev(prices, mean);
    const median = this.calculatePercentile(prices, 50);

    return {
      category: category || 'all',
      mean,
      median,
      stdDev,
      min: prices[0],
      max: prices[prices.length - 1],
      count: prices.length,
      percentiles: {
        p25: this.calculatePercentile(prices, 25),
        p50: this.calculatePercentile(prices, 50),
        p75: this.calculatePercentile(prices, 75),
        p90: this.calculatePercentile(prices, 90),
        p95: this.calculatePercentile(prices, 95)
      }
    };
  }

  /**
   * Analyze price position of a product
   */
  analyzePricePosition(productId: string, category?: string): PricePosition {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const stats = this.calculateMarketStatistics(category || product.category);
    const percentile = this.calculatePricePercentile(product.price, category || product.category);
    const relativeToMean = ((product.price - stats.mean) / stats.mean) * 100;
    const relativeToMedian = ((product.price - stats.median) / stats.median) * 100;

    return {
      productId,
      price: product.price,
      position: this.determinePosition(percentile),
      percentile,
      relativeToMean,
      relativeToMedian,
      competitiveness: this.determineCompetitiveness(relativeToMedian)
    };
  }

  /**
   * Perform competitive analysis using vector similarity
   */
  async performCompetitiveAnalysis(
    productId: string,
    options?: { category?: string; maxCompetitors?: number }
  ): Promise<CompetitiveAnalysis> {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Get product embedding
    const productVector = product.vector || await this.embeddings.embedProduct(product);

    // Find similar products using cosine similarity
    const competitors = await this.findSimilarProducts(
      productVector,
      productId,
      options?.category || product.category,
      options?.maxCompetitors || this.config.maxCompetitors
    );

    // Analyze market position
    const marketPosition = this.analyzePricePosition(productId, product.category);

    // Calculate recommended price range
    const competitorPrices = competitors.map(c => c.price);
    const recommendedPriceRange = this.calculateRecommendedRange(
      product.price,
      competitorPrices,
      marketPosition
    );

    return {
      productId,
      currentPrice: product.price,
      competitors,
      marketPosition,
      recommendedPriceRange
    };
  }

  /**
   * Generate pricing recommendations
   */
  async generateRecommendations(
    productId: string,
    strategy: 'competitive' | 'premium' | 'budget' | 'market-based' = 'competitive'
  ): Promise<PriceRecommendation> {
    const analysis = await this.performCompetitiveAnalysis(productId);
    const product = this.products.get(productId)!;

    let recommendedPrice: number;
    let reason: string;

    switch (strategy) {
      case 'competitive':
        // Price slightly below average competitor
        const avgCompetitorPrice = this.calculateMean(analysis.competitors.map(c => c.price));
        recommendedPrice = avgCompetitorPrice * 0.95;
        reason = 'Competitive pricing: 5% below average competitor price';
        break;

      case 'premium':
        // Price at 75th percentile
        recommendedPrice = analysis.recommendedPriceRange.max;
        reason = 'Premium positioning: Price at upper range of market';
        break;

      case 'budget':
        // Price at 25th percentile
        recommendedPrice = analysis.recommendedPriceRange.min;
        reason = 'Budget positioning: Price at lower range of market';
        break;

      case 'market-based':
      default:
        // Use optimal price from recommended range
        recommendedPrice = analysis.recommendedPriceRange.optimal;
        reason = 'Market-based pricing: Optimal price based on market position and competitors';
        break;
    }

    // Estimate impact
    const elasticity = await this.estimateElasticity(productId);
    const priceChange = ((recommendedPrice - product.price) / product.price) * 100;
    const volumeChange = -elasticity.elasticity * priceChange;
    const revenueChange = priceChange + volumeChange;
    const marginChange = priceChange * 0.7; // Simplified assumption

    return {
      productId,
      currentPrice: product.price,
      recommendedPrice,
      reason,
      expectedImpact: {
        revenueChange,
        volumeChange,
        marginChange
      },
      confidence: elasticity.confidence
    };
  }

  /**
   * Estimate price elasticity of demand
   */
  async estimateElasticity(productId: string): Promise<ElasticityEstimate> {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Get similar products for elasticity estimation
    const productVector = product.vector || await this.embeddings.embedProduct(product);
    const similarProducts = await this.findSimilarProducts(
      productVector,
      productId,
      product.category,
      20
    );

    if (similarProducts.length < 3) {
      // Not enough data for reliable estimate
      return {
        productId,
        elasticity: -1.0, // Assume unit elastic
        category: 'unitary',
        confidence: 0.3,
        basedOnSamples: similarProducts.length
      };
    }

    // Estimate elasticity from price-similarity relationship
    // Products with higher prices should have lower similarity (demand)
    // This is a simplified proxy for elasticity
    const priceRange = Math.max(...similarProducts.map(p => p.price)) -
                       Math.min(...similarProducts.map(p => p.price));
    const avgPrice = this.calculateMean(similarProducts.map(p => p.price));

    // Estimate elasticity based on price variance
    // Higher price variance suggests more elastic demand
    const priceCV = priceRange / avgPrice; // Coefficient of variation
    const elasticity = -0.5 - (priceCV * 1.5); // Simplified model

    return {
      productId,
      elasticity,
      category: this.categorizeElasticity(elasticity),
      confidence: Math.min(0.5 + (similarProducts.length / 40), 0.9),
      basedOnSamples: similarProducts.length
    };
  }

  /**
   * Find similar products using vector similarity
   */
  private async findSimilarProducts(
    targetVector: number[],
    excludeId: string,
    category?: string,
    limit: number = 10
  ): Promise<Array<{
    productId: string;
    name: string;
    price: number;
    similarity: number;
    priceDifference: number;
    priceDifferencePercent: number;
  }>> {
    const targetProduct = this.products.get(excludeId);
    if (!targetProduct) {
      throw new Error(`Product ${excludeId} not found`);
    }

    let candidates = Array.from(this.products.values()).filter(
      p => p.id !== excludeId
    );

    if (category) {
      candidates = candidates.filter(p => p.category === category);
    }

    // Calculate similarities
    const similarities = await Promise.all(
      candidates.map(async product => {
        const vector = product.vector || await this.embeddings.embedProduct(product);
        const similarity = this.cosineSimilarity(targetVector, vector);

        return {
          productId: product.id,
          name: product.name,
          price: product.price,
          similarity,
          priceDifference: product.price - targetProduct.price,
          priceDifferencePercent: ((product.price - targetProduct.price) / targetProduct.price) * 100
        };
      })
    );

    // Filter by similarity threshold and sort
    return similarities
      .filter(s => s.similarity >= this.config.similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Calculate recommended price range
   */
  private calculateRecommendedRange(
    currentPrice: number,
    competitorPrices: number[],
    position: PricePosition
  ): { min: number; optimal: number; max: number } {
    if (competitorPrices.length === 0) {
      // No competitors, use current price with small variance
      return {
        min: currentPrice * 0.9,
        optimal: currentPrice,
        max: currentPrice * 1.1
      };
    }

    const sortedPrices = [...competitorPrices].sort((a, b) => a - b);
    const p25 = this.calculatePercentile(sortedPrices, 25);
    const median = this.calculatePercentile(sortedPrices, 50);
    const p75 = this.calculatePercentile(sortedPrices, 75);

    return {
      min: p25,
      optimal: median,
      max: p75
    };
  }

  /**
   * Calculate price percentile
   */
  private calculatePricePercentile(price: number, category?: string): number {
    let products = Array.from(this.products.values());

    if (category) {
      products = products.filter(p => p.category === category);
    }

    const prices = products.map(p => p.price).sort((a, b) => a - b);
    const index = prices.findIndex(p => p >= price);

    if (index === -1) {
      return 100;
    }

    return (index / prices.length) * 100;
  }

  /**
   * Determine price position category
   */
  private determinePosition(percentile: number): 'budget' | 'mid-range' | 'premium' | 'luxury' {
    if (percentile <= this.config.budgetThreshold) {
      return 'budget';
    } else if (percentile <= this.config.midRangeThreshold) {
      return 'mid-range';
    } else if (percentile <= this.config.premiumThreshold) {
      return 'premium';
    }
    return 'luxury';
  }

  /**
   * Determine competitiveness
   */
  private determineCompetitiveness(
    relativeToMedian: number
  ): 'very-competitive' | 'competitive' | 'average' | 'expensive' | 'very-expensive' {
    if (relativeToMedian <= -20) {
      return 'very-competitive';
    } else if (relativeToMedian <= -5) {
      return 'competitive';
    } else if (relativeToMedian <= 5) {
      return 'average';
    } else if (relativeToMedian <= 20) {
      return 'expensive';
    }
    return 'very-expensive';
  }

  /**
   * Categorize elasticity
   */
  private categorizeElasticity(elasticity: number): 'elastic' | 'inelastic' | 'unitary' {
    const absElasticity = Math.abs(elasticity);
    if (absElasticity > 1) {
      return 'elastic';
    } else if (absElasticity < 1) {
      return 'inelastic';
    }
    return 'unitary';
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedValues[lower];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
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
