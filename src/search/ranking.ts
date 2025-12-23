/**
 * RankingService - Score and rank search results
 */

import { ProductDocument } from '../database/collections';

export interface ScoredProduct {
  product: ProductDocument;
  score: number;
  scores: ScoreBreakdown;
}

export interface ScoreBreakdown {
  vectorSimilarity: number;
  keywordMatch: number;
  recency: number;
  popularity: number;
  rating: number;
  priceScore: number;
  personalization: number;
  total: number;
}

export interface RankingWeights {
  vectorSimilarity?: number;
  keywordMatch?: number;
  recency?: number;
  popularity?: number;
  rating?: number;
  priceScore?: number;
  personalization?: number;
}

export interface RankingConfig {
  weights?: RankingWeights;
  enableRecencyBoost?: boolean;
  enablePopularityBoost?: boolean;
  enableRatingBoost?: boolean;
  enablePriceScore?: boolean;
  enablePersonalization?: boolean;
  abTestVariant?: string;
}

export interface UserContext {
  userId?: string;
  previousPurchases?: string[];
  viewedProducts?: string[];
  preferredCategories?: string[];
  preferredBrands?: string[];
  priceRange?: { min: number; max: number };
}

/**
 * RankingService - Advanced ranking with multiple signals
 */
export class RankingService {
  private config: RankingConfig;
  private defaultWeights: RankingWeights = {
    vectorSimilarity: 0.40,
    keywordMatch: 0.20,
    recency: 0.05,
    popularity: 0.10,
    rating: 0.15,
    priceScore: 0.05,
    personalization: 0.05
  };

  // A/B test variants with different weight configurations
  private abTestVariants: Record<string, RankingWeights> = {
    control: this.defaultWeights,
    semantic_heavy: {
      vectorSimilarity: 0.60,
      keywordMatch: 0.10,
      recency: 0.05,
      popularity: 0.10,
      rating: 0.10,
      priceScore: 0.03,
      personalization: 0.02
    },
    engagement_focused: {
      vectorSimilarity: 0.25,
      keywordMatch: 0.15,
      recency: 0.10,
      popularity: 0.25,
      rating: 0.15,
      priceScore: 0.05,
      personalization: 0.05
    },
    personalized: {
      vectorSimilarity: 0.30,
      keywordMatch: 0.15,
      recency: 0.05,
      popularity: 0.10,
      rating: 0.10,
      priceScore: 0.10,
      personalization: 0.20
    }
  };

  constructor(config: RankingConfig = {}) {
    this.config = {
      enableRecencyBoost: true,
      enablePopularityBoost: true,
      enableRatingBoost: true,
      enablePriceScore: true,
      enablePersonalization: false,
      ...config
    };

    // Apply A/B test variant weights if specified
    if (config.abTestVariant && this.abTestVariants[config.abTestVariant]) {
      this.config.weights = this.abTestVariants[config.abTestVariant];
    } else {
      this.config.weights = {
        ...this.defaultWeights,
        ...config.weights
      };
    }
  }

  /**
   * Score and rank products
   */
  rankProducts(
    products: ProductDocument[],
    vectorScores: Map<string, number>,
    query: string,
    userContext?: UserContext
  ): ScoredProduct[] {
    const scoredProducts: ScoredProduct[] = products.map(product => {
      const scores = this.calculateScores(product, vectorScores, query, userContext);
      return {
        product,
        score: scores.total,
        scores
      };
    });

    // Sort by total score descending
    return scoredProducts.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate all scoring components
   */
  private calculateScores(
    product: ProductDocument,
    vectorScores: Map<string, number>,
    query: string,
    userContext?: UserContext
  ): ScoreBreakdown {
    const weights = this.config.weights!;

    // Vector similarity score (from semantic search)
    const vectorSimilarity = vectorScores.get(product.id) || 0;

    // Keyword match score
    const keywordMatch = this.calculateKeywordMatch(product, query);

    // Recency score
    const recency = this.config.enableRecencyBoost
      ? this.calculateRecencyScore(product)
      : 0;

    // Popularity score
    const popularity = this.config.enablePopularityBoost
      ? this.calculatePopularityScore(product)
      : 0;

    // Rating score
    const rating = this.config.enableRatingBoost
      ? this.calculateRatingScore(product)
      : 0;

    // Price score (favor mid-range prices)
    const priceScore = this.config.enablePriceScore
      ? this.calculatePriceScore(product)
      : 0;

    // Personalization score
    const personalization = this.config.enablePersonalization && userContext
      ? this.calculatePersonalizationScore(product, userContext)
      : 0;

    // Calculate weighted total
    const total =
      vectorSimilarity * weights.vectorSimilarity! +
      keywordMatch * weights.keywordMatch! +
      recency * weights.recency! +
      popularity * weights.popularity! +
      rating * weights.rating! +
      priceScore * weights.priceScore! +
      personalization * weights.personalization!;

    return {
      vectorSimilarity,
      keywordMatch,
      recency,
      popularity,
      rating,
      priceScore,
      personalization,
      total
    };
  }

  /**
   * Calculate keyword match score (0-1)
   */
  private calculateKeywordMatch(product: ProductDocument, query: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const productText = `${product.name} ${product.description} ${product.category}`.toLowerCase();

    let matches = 0;
    for (const term of queryTerms) {
      if (term.length < 2) continue;

      // Exact match in name (highest weight)
      if (product.name.toLowerCase().includes(term)) {
        matches += 3;
      }
      // Match in description
      else if (product.description.toLowerCase().includes(term)) {
        matches += 2;
      }
      // Match in category
      else if (product.category.toLowerCase().includes(term)) {
        matches += 1;
      }
    }

    // Normalize by number of terms
    const maxPossibleScore = queryTerms.length * 3;
    return maxPossibleScore > 0 ? Math.min(matches / maxPossibleScore, 1) : 0;
  }

  /**
   * Calculate recency score (0-1)
   * More recent products get higher scores
   */
  private calculateRecencyScore(product: ProductDocument): number {
    const createdAt = product.metadata?.createdAt;
    if (!createdAt) return 0.5; // Neutral score if no date

    const now = Date.now();
    const productDate = new Date(createdAt).getTime();
    const ageInDays = (now - productDate) / (1000 * 60 * 60 * 24);

    // Decay function: newer products score higher
    // Products less than 30 days old get max score
    if (ageInDays < 30) return 1.0;
    // Linear decay over 365 days
    if (ageInDays < 365) return 1.0 - (ageInDays - 30) / 335;
    // Old products get minimum score
    return 0.1;
  }

  /**
   * Calculate popularity score (0-1)
   * Based on views, sales, clicks, etc.
   */
  private calculatePopularityScore(product: ProductDocument): number {
    const views = product.metadata?.views || 0;
    const sales = product.metadata?.sales || 0;
    const clicks = product.metadata?.clicks || 0;

    // Weighted popularity
    const popularityScore = (views * 0.3 + sales * 0.5 + clicks * 0.2);

    // Normalize using log scale to prevent outliers from dominating
    return Math.min(Math.log10(popularityScore + 1) / 4, 1);
  }

  /**
   * Calculate rating score (0-1)
   * Higher ratings get higher scores
   */
  private calculateRatingScore(product: ProductDocument): number {
    const rating = product.metadata?.rating || 0;
    const reviewCount = product.metadata?.reviewCount || 0;

    // Normalize rating (0-5 to 0-1)
    let score = rating / 5;

    // Apply confidence boost based on number of reviews
    // Products with more reviews get a slight boost
    if (reviewCount < 5) {
      score *= 0.7; // Penalty for low review count
    } else if (reviewCount < 20) {
      score *= 0.85;
    } else if (reviewCount >= 50) {
      score *= 1.1; // Boost for high review count
      score = Math.min(score, 1); // Cap at 1
    }

    return score;
  }

  /**
   * Calculate price score (0-1)
   * Mid-range prices score higher (avoiding very cheap and very expensive)
   */
  private calculatePriceScore(product: ProductDocument): number {
    const price = product.price;

    // Assume sweet spot is between $20 and $200
    if (price >= 20 && price <= 200) {
      return 1.0;
    }

    // Very cheap products (potential quality concerns)
    if (price < 10) {
      return 0.5;
    }

    // Expensive products
    if (price > 500) {
      return 0.6;
    }

    // Linear interpolation for other prices
    if (price < 20) {
      return 0.5 + (price - 10) / 20;
    }

    if (price > 200) {
      return 1.0 - Math.min((price - 200) / 500, 0.4);
    }

    return 0.8;
  }

  /**
   * Calculate personalization score based on user context (0-1)
   */
  private calculatePersonalizationScore(
    product: ProductDocument,
    userContext: UserContext
  ): number {
    let score = 0;
    let factors = 0;

    // Check if product is in user's preferred categories
    if (userContext.preferredCategories && userContext.preferredCategories.length > 0) {
      factors++;
      if (userContext.preferredCategories.includes(product.category)) {
        score += 1;
      }
    }

    // Check if product is from user's preferred brands
    if (userContext.preferredBrands && userContext.preferredBrands.length > 0) {
      factors++;
      const productBrand = product.metadata?.brand;
      if (productBrand && userContext.preferredBrands.includes(productBrand)) {
        score += 1;
      }
    }

    // Check if price is in user's preferred range
    if (userContext.priceRange) {
      factors++;
      const { min, max } = userContext.priceRange;
      if (product.price >= min && product.price <= max) {
        score += 1;
      }
    }

    // Check if user has viewed similar products
    if (userContext.viewedProducts && userContext.viewedProducts.length > 0) {
      factors++;
      if (userContext.viewedProducts.includes(product.id)) {
        score += 0.5; // Partial score for previously viewed
      }
    }

    // Check if product is related to previous purchases
    if (userContext.previousPurchases && userContext.previousPurchases.length > 0) {
      factors++;
      // This would ideally check for related products
      // For now, just check category
      if (userContext.preferredCategories?.includes(product.category)) {
        score += 0.8;
      }
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Apply diversity to results
   * Ensures variety in categories and brands
   */
  diversifyResults(
    scoredProducts: ScoredProduct[],
    maxPerCategory: number = 3,
    maxPerBrand: number = 2
  ): ScoredProduct[] {
    const diversified: ScoredProduct[] = [];
    const categoryCounts = new Map<string, number>();
    const brandCounts = new Map<string, number>();

    for (const item of scoredProducts) {
      const category = item.product.category;
      const brand = item.product.metadata?.brand || 'unknown';

      const categoryCount = categoryCounts.get(category) || 0;
      const brandCount = brandCounts.get(brand) || 0;

      // Skip if category or brand limit reached
      if (categoryCount >= maxPerCategory || brandCount >= maxPerBrand) {
        continue;
      }

      diversified.push(item);
      categoryCounts.set(category, categoryCount + 1);
      brandCounts.set(brand, brandCount + 1);
    }

    return diversified;
  }

  /**
   * Get current ranking weights
   */
  getWeights(): RankingWeights {
    return { ...this.config.weights };
  }

  /**
   * Update ranking weights
   */
  updateWeights(weights: Partial<RankingWeights>): void {
    this.config.weights = {
      ...this.config.weights,
      ...weights
    };
  }

  /**
   * Set A/B test variant
   */
  setABTestVariant(variant: string): void {
    if (this.abTestVariants[variant]) {
      this.config.weights = this.abTestVariants[variant];
      this.config.abTestVariant = variant;
    }
  }

  /**
   * Get available A/B test variants
   */
  getABTestVariants(): string[] {
    return Object.keys(this.abTestVariants);
  }

  /**
   * Add custom A/B test variant
   */
  addABTestVariant(name: string, weights: RankingWeights): void {
    this.abTestVariants[name] = weights;
  }

  /**
   * Create RankingService instance
   */
  static create(config?: RankingConfig): RankingService {
    return new RankingService(config);
  }
}
