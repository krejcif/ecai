/**
 * AI-Powered Recommendation Engine using RuVector
 * Provides personalized product recommendations based on vector similarity
 */

import { ProductDocument } from '../database/collections';
import {
  calculateCosineSimilarity,
  calculateAverageVector,
  rankBySimilarity,
  selectDiverseItems
} from './similarity';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface RecommendationOptions {
  limit?: number;
  threshold?: number;
  diversify?: boolean;
  diversityLambda?: number;
  excludeIds?: string[];
  categories?: string[];
  priceRange?: { min?: number; max?: number };
}

export interface ProductRecommendation {
  product: ProductDocument;
  score: number;
  reason: string;
  confidence: number;
}

export interface TrendingProductOptions {
  limit?: number;
  timeWindow?: 'day' | 'week' | 'month';
  minPopularity?: number;
}

export interface CrossSellOptions {
  limit?: number;
  minConfidence?: number;
  excludeCategories?: string[];
}

/**
 * AI-Powered Recommendation Engine
 */
export class RecommendationEngine {
  private databasePath: string;
  private productCache: Map<string, ProductDocument> = new Map();
  private categoryVectorCache: Map<string, number[]> = new Map();
  private interactionHistory: Map<string, { productId: string; timestamp: number; weight: number }[]> = new Map();

  constructor(databasePath: string = '.ruvector/products') {
    this.databasePath = databasePath;
  }

  /**
   * Get product recommendations based on a specific product
   * Uses vector similarity to find related products
   *
   * @param productId The ID of the product to base recommendations on
   * @param limit Maximum number of recommendations to return
   * @param options Additional filtering and ranking options
   * @returns Array of recommended products with scores
   */
  async getProductRecommendations(
    productId: string,
    limit: number = 10,
    options: RecommendationOptions = {}
  ): Promise<ProductRecommendation[]> {
    // Get the source product
    const sourceProduct = await this.getProduct(productId);
    if (!sourceProduct || !sourceProduct.vector) {
      throw new Error(`Product ${productId} not found or has no vector embedding`);
    }

    // Search for similar products using ruvector
    const searchResults = await this.searchSimilarProducts(
      sourceProduct.vector,
      (limit * 3) // Get more to allow for filtering
    );

    // Filter and process results
    let recommendations = searchResults
      .filter(item => {
        // Exclude the source product itself
        if (item.id === productId) return false;

        // Exclude specified IDs
        if (options.excludeIds?.includes(item.id)) return false;

        // Apply category filter
        if (options.categories && options.categories.length > 0) {
          if (!options.categories.includes(item.category)) return false;
        }

        // Apply price range filter
        if (options.priceRange) {
          if (options.priceRange.min !== undefined && item.price < options.priceRange.min) return false;
          if (options.priceRange.max !== undefined && item.price > options.priceRange.max) return false;
        }

        // Apply threshold
        if (options.threshold !== undefined && item.score < options.threshold) return false;

        return true;
      })
      .map(item => ({
        product: item,
        score: item.score,
        reason: this.generateRecommendationReason(sourceProduct, item, 'similar'),
        confidence: this.calculateConfidence(item.score, 'similar')
      }));

    // Apply diversity if requested
    if (options.diversify && recommendations.length > limit) {
      const diverseItems = selectDiverseItems(
        recommendations.map(r => ({
          ...r.product,
          score: r.score
        })),
        limit,
        options.diversityLambda || 0.5
      );

      recommendations = diverseItems.map(item => ({
        product: item,
        score: item.score,
        reason: this.generateRecommendationReason(sourceProduct, item, 'similar'),
        confidence: this.calculateConfidence(item.score, 'similar')
      }));
    } else {
      recommendations = recommendations.slice(0, limit);
    }

    return recommendations;
  }

  /**
   * Get personalized recommendations based on user's product history
   * Creates an aggregate user preference vector from their history
   *
   * @param userHistory Array of product IDs the user has viewed/purchased
   * @param limit Maximum number of recommendations to return
   * @param options Additional filtering and ranking options
   * @returns Array of personalized product recommendations
   */
  async getPersonalizedRecommendations(
    userHistory: string[],
    limit: number = 10,
    options: RecommendationOptions = {}
  ): Promise<ProductRecommendation[]> {
    if (!userHistory || userHistory.length === 0) {
      throw new Error('User history must contain at least one product ID');
    }

    // Get all products from user history
    const historyProducts = await Promise.all(
      userHistory.map(id => this.getProduct(id))
    );

    const validProducts = historyProducts.filter(
      (p): p is ProductDocument => p !== null && p.vector !== undefined
    );

    if (validProducts.length === 0) {
      throw new Error('No valid products found in user history');
    }

    // Calculate user preference vector as average of history vectors
    const vectors = validProducts.map(p => p.vector!);
    const userPreferenceVector = calculateAverageVector(vectors);

    // Search for products similar to user preference
    const searchResults = await this.searchSimilarProducts(
      userPreferenceVector,
      limit * 3
    );

    // Filter out products already in user history
    const historyIds = new Set(userHistory);

    let recommendations = searchResults
      .filter(item => {
        // Exclude products already in history
        if (historyIds.has(item.id)) return false;

        // Exclude specified IDs
        if (options.excludeIds?.includes(item.id)) return false;

        // Apply category filter
        if (options.categories && options.categories.length > 0) {
          if (!options.categories.includes(item.category)) return false;
        }

        // Apply price range filter
        if (options.priceRange) {
          if (options.priceRange.min !== undefined && item.price < options.priceRange.min) return false;
          if (options.priceRange.max !== undefined && item.price > options.priceRange.max) return false;
        }

        // Apply threshold
        if (options.threshold !== undefined && item.score < options.threshold) return false;

        return true;
      })
      .map(item => ({
        product: item,
        score: this.boostScoreByUserPreference(item, validProducts),
        reason: this.generateRecommendationReason(null, item, 'personalized'),
        confidence: this.calculateConfidence(item.score, 'personalized')
      }));

    // Sort by boosted score
    recommendations.sort((a, b) => b.score - a.score);

    // Apply diversity if requested
    if (options.diversify && recommendations.length > limit) {
      const diverseItems = selectDiverseItems(
        recommendations.map(r => ({
          ...r.product,
          score: r.score
        })),
        limit,
        options.diversityLambda || 0.5
      );

      recommendations = diverseItems.map(item => ({
        product: item,
        score: item.score,
        reason: this.generateRecommendationReason(null, item, 'personalized'),
        confidence: this.calculateConfidence(item.score, 'personalized')
      }));
    } else {
      recommendations = recommendations.slice(0, limit);
    }

    return recommendations;
  }

  /**
   * Get cross-sell recommendations for items in cart
   * Finds products that are frequently bought together
   *
   * @param cartItems Array of product IDs currently in cart
   * @param options Cross-sell specific options
   * @returns Array of cross-sell product recommendations
   */
  async getCrossSellRecommendations(
    cartItems: string[],
    options: CrossSellOptions = {}
  ): Promise<ProductRecommendation[]> {
    const limit = options.limit || 5;

    if (!cartItems || cartItems.length === 0) {
      return [];
    }

    // Get all cart products
    const cartProducts = await Promise.all(
      cartItems.map(id => this.getProduct(id))
    );

    const validCartProducts = cartProducts.filter(
      (p): p is ProductDocument => p !== null && p.vector !== undefined
    );

    if (validCartProducts.length === 0) {
      return [];
    }

    // Collect recommendations from each cart item
    const allRecommendations: Map<string, { product: ProductDocument; scores: number[]; categories: Set<string> }> = new Map();

    for (const cartProduct of validCartProducts) {
      // Get complementary products (from different categories)
      const similar = await this.searchSimilarProducts(cartProduct.vector!, limit * 2);

      for (const product of similar) {
        if (cartItems.includes(product.id)) continue;

        // Exclude same category if specified
        if (options.excludeCategories?.includes(product.category)) continue;

        // Prefer products from different categories (complementary)
        const isDifferentCategory = product.category !== cartProduct.category;
        const adjustedScore = isDifferentCategory ? product.score * 1.2 : product.score * 0.8;

        if (!allRecommendations.has(product.id)) {
          allRecommendations.set(product.id, {
            product,
            scores: [adjustedScore],
            categories: new Set([cartProduct.category])
          });
        } else {
          const existing = allRecommendations.get(product.id)!;
          existing.scores.push(adjustedScore);
          existing.categories.add(cartProduct.category);
        }
      }
    }

    // Calculate aggregate scores
    let recommendations = Array.from(allRecommendations.values())
      .map(({ product, scores, categories }) => {
        // Higher score if recommended by multiple cart items
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const multiItemBoost = Math.min(scores.length * 0.1, 0.5);
        const diversityBoost = categories.size > 1 ? 0.2 : 0;
        const finalScore = avgScore + multiItemBoost + diversityBoost;

        return {
          product,
          score: finalScore,
          reason: this.generateRecommendationReason(null, product, 'cross-sell', scores.length),
          confidence: this.calculateConfidence(finalScore, 'cross-sell', scores.length)
        };
      });

    // Apply confidence threshold
    if (options.minConfidence) {
      recommendations = recommendations.filter(r => r.confidence >= options.minConfidence);
    }

    // Sort by score and return top results
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.slice(0, limit);
  }

  /**
   * Get trending products in a category
   * Returns popular items based on various signals
   *
   * @param category Product category to get trends from
   * @param limit Maximum number of trending products to return
   * @param options Trending-specific options
   * @returns Array of trending product recommendations
   */
  async getTrendingProducts(
    category: string,
    limit: number = 10,
    options: TrendingProductOptions = {}
  ): Promise<ProductRecommendation[]> {
    // Get or compute category vector
    let categoryVector = this.categoryVectorCache.get(category);

    if (!categoryVector) {
      // Get all products in category
      const categoryProducts = Array.from(this.productCache.values())
        .filter(p => p.category === category && p.vector);

      if (categoryProducts.length === 0) {
        return [];
      }

      // Calculate category centroid
      const vectors = categoryProducts.map(p => p.vector!);
      categoryVector = calculateAverageVector(vectors);
      this.categoryVectorCache.set(category, categoryVector);
    }

    // Search for products in this category
    const searchResults = await this.searchSimilarProducts(categoryVector, limit * 2);

    // Filter to category and calculate trending score
    let trendingProducts = searchResults
      .filter(product => product.category === category)
      .map(product => {
        // Trending score factors:
        // 1. Popularity signals from metadata
        const popularity = this.calculatePopularity(product);

        // 2. Recency (if product has creation date)
        const recency = this.calculateRecency(product);

        // 3. Vector similarity to category centroid
        const categoryRelevance = product.score;

        // Combine factors
        const trendingScore = (
          categoryRelevance * 0.4 +
          popularity * 0.4 +
          recency * 0.2
        );

        return {
          product,
          score: trendingScore,
          reason: this.generateRecommendationReason(null, product, 'trending'),
          confidence: this.calculateConfidence(trendingScore, 'trending')
        };
      });

    // Apply minimum popularity filter
    if (options.minPopularity) {
      trendingProducts = trendingProducts.filter(
        p => this.calculatePopularity(p.product) >= options.minPopularity
      );
    }

    // Sort by trending score
    trendingProducts.sort((a, b) => b.score - a.score);

    return trendingProducts.slice(0, limit);
  }

  /**
   * Search for similar products using ruvector CLI
   * @private
   */
  private async searchSimilarProducts(
    vector: number[],
    limit: number
  ): Promise<Array<ProductDocument & { score: number }>> {
    try {
      // Create temporary file with query vector
      const tmpFile = path.join('/tmp', `query-${Date.now()}.json`);
      await fs.writeFile(tmpFile, JSON.stringify({ vector }));

      // Execute ruvector search
      const { stdout } = await execAsync(
        `npx ruvector search "${this.databasePath}" --query-file "${tmpFile}" --limit ${limit} --format json`
      );

      // Clean up temp file
      await fs.unlink(tmpFile).catch(() => {});

      // Parse results
      const results = JSON.parse(stdout);

      if (!results || !Array.isArray(results.results)) {
        return [];
      }

      return results.results.map((item: any) => ({
        id: item.id || item.document?.id,
        name: item.document?.name || item.name,
        description: item.document?.description || item.description,
        category: item.document?.category || item.category,
        price: item.document?.price || item.price,
        source: item.document?.source || item.source,
        vector: item.document?.vector || item.vector,
        metadata: item.document?.metadata || item.metadata,
        score: item.score || item.similarity || 0
      }));
    } catch (error) {
      console.error('Error searching with ruvector:', error);
      // Fallback to in-memory search if ruvector fails
      return this.fallbackSearch(vector, limit);
    }
  }

  /**
   * Fallback in-memory search when ruvector is not available
   * @private
   */
  private fallbackSearch(
    queryVector: number[],
    limit: number
  ): Array<ProductDocument & { score: number }> {
    const candidates = Array.from(this.productCache.values())
      .filter(p => p.vector && p.vector.length === queryVector.length);

    const ranked = rankBySimilarity(
      queryVector,
      candidates,
      { limit, metric: 'cosine' }
    );

    return ranked;
  }

  /**
   * Get product by ID (with caching)
   * @private
   */
  private async getProduct(productId: string): Promise<ProductDocument | null> {
    // Check cache first
    if (this.productCache.has(productId)) {
      return this.productCache.get(productId)!;
    }

    // In a real implementation, this would query the database
    // For now, return null if not in cache
    return null;
  }

  /**
   * Load products into cache
   */
  async cacheProducts(products: ProductDocument[]): Promise<void> {
    for (const product of products) {
      this.productCache.set(product.id, product);
    }
  }

  /**
   * Boost score based on user preference patterns
   * @private
   */
  private boostScoreByUserPreference(
    product: ProductDocument,
    historyProducts: ProductDocument[]
  ): number {
    let boost = product.score || 0;

    // Boost if category matches user's preferred categories
    const categoryCount = historyProducts.filter(p => p.category === product.category).length;
    const categoryBoost = (categoryCount / historyProducts.length) * 0.2;

    // Boost if price is in user's typical range
    const prices = historyProducts.map(p => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const priceDeviation = Math.abs(product.price - avgPrice) / avgPrice;
    const priceBoost = Math.max(0, 0.1 - priceDeviation * 0.1);

    return boost + categoryBoost + priceBoost;
  }

  /**
   * Calculate popularity score for a product
   * @private
   */
  private calculatePopularity(product: ProductDocument): number {
    const metadata = product.metadata || {};

    // Combine various popularity signals
    const viewCount = metadata.viewCount || 0;
    const purchaseCount = metadata.purchaseCount || 0;
    const rating = metadata.rating || 0;
    const reviewCount = metadata.reviewCount || 0;

    // Normalize and combine
    const normalizedViews = Math.min(viewCount / 10000, 1);
    const normalizedPurchases = Math.min(purchaseCount / 1000, 1);
    const normalizedRating = rating / 5;
    const normalizedReviews = Math.min(reviewCount / 500, 1);

    return (
      normalizedViews * 0.2 +
      normalizedPurchases * 0.4 +
      normalizedRating * 0.2 +
      normalizedReviews * 0.2
    );
  }

  /**
   * Calculate recency score for a product
   * @private
   */
  private calculateRecency(product: ProductDocument): number {
    const metadata = product.metadata || {};
    const createdAt = metadata.createdAt;

    if (!createdAt) return 0.5; // Neutral score if no date

    const daysSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: newer = higher score
    return Math.exp(-daysSinceCreation / 90); // 90-day half-life
  }

  /**
   * Generate human-readable recommendation reason
   * @private
   */
  private generateRecommendationReason(
    sourceProduct: ProductDocument | null,
    targetProduct: ProductDocument,
    type: 'similar' | 'personalized' | 'cross-sell' | 'trending',
    matchCount?: number
  ): string {
    switch (type) {
      case 'similar':
        if (sourceProduct) {
          if (sourceProduct.category === targetProduct.category) {
            return `Similar to "${sourceProduct.name}" in ${targetProduct.category}`;
          }
          return `Customers who viewed "${sourceProduct.name}" also liked this`;
        }
        return 'Similar to your interests';

      case 'personalized':
        return `Recommended based on your browsing history`;

      case 'cross-sell':
        const itemText = matchCount && matchCount > 1 ? `${matchCount} items` : 'an item';
        return `Frequently bought with ${itemText} in your cart`;

      case 'trending':
        return `Trending in ${targetProduct.category}`;

      default:
        return 'Recommended for you';
    }
  }

  /**
   * Calculate confidence score for recommendation
   * @private
   */
  private calculateConfidence(
    score: number,
    type: 'similar' | 'personalized' | 'cross-sell' | 'trending',
    matchCount?: number
  ): number {
    let confidence = score;

    // Adjust based on recommendation type
    switch (type) {
      case 'similar':
        // Direct similarity is highly confident
        confidence = Math.min(score * 1.1, 1.0);
        break;

      case 'personalized':
        // Personalized is moderately confident
        confidence = Math.min(score * 1.0, 0.95);
        break;

      case 'cross-sell':
        // Cross-sell confidence increases with match count
        const matchBoost = matchCount ? Math.min(matchCount * 0.05, 0.2) : 0;
        confidence = Math.min(score + matchBoost, 0.9);
        break;

      case 'trending':
        // Trending is based on aggregates, moderate confidence
        confidence = Math.min(score * 0.9, 0.85);
        break;
    }

    return Math.max(0, Math.min(confidence, 1.0));
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.productCache.clear();
    this.categoryVectorCache.clear();
    this.interactionHistory.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      products: this.productCache.size,
      categories: this.categoryVectorCache.size,
      interactions: Array.from(this.interactionHistory.values()).reduce(
        (sum, history) => sum + history.length,
        0
      )
    };
  }

  /**
   * Create a new RecommendationEngine instance
   */
  static create(databasePath?: string): RecommendationEngine {
    return new RecommendationEngine(databasePath);
  }
}
