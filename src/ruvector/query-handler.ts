/**
 * Query Handler - Integrates semantic router with intelligence modules
 *
 * Handles user queries by routing them to appropriate intelligence modules
 * and returning formatted responses.
 */

import { SemanticRouter, Route, RouteHandler } from './router';
import { SemanticSearchEngine, SearchOptions } from '../search/search-engine';
import { VectorStore } from '../database/vector-store';
import { ProductDocument } from '../database/collections';
import { EmbeddingService } from '../database/embeddings';

// Intelligence modules (imported as needed)
import { TrendDetector, DemandForecaster, CategoryAnalyzer } from '../intelligence/trends';
import { PriceAnalyzer, PriceTracker } from '../intelligence/pricing';
import { ProductMatcher } from '../matching';

export interface QueryHandlerConfig {
  vectorStore: VectorStore;
  searchEngine?: SemanticSearchEngine;
  embeddingService?: EmbeddingService;
  enableAnalytics?: boolean;
  defaultLimit?: number;
}

export interface QueryResult {
  intent: string;
  query: string;
  data: any;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  executionTime: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsData {
  queryCount: number;
  intentDistribution: Record<string, number>;
  avgConfidence: number;
  avgExecutionTime: number;
  lastQueries: Array<{
    query: string;
    intent: string;
    timestamp: number;
  }>;
}

/**
 * QueryHandler - Main class for handling intelligent queries
 */
export class QueryHandler {
  private router: SemanticRouter;
  private searchEngine: SemanticSearchEngine;
  private vectorStore: VectorStore;
  private embeddingService: EmbeddingService;
  private config: Required<QueryHandlerConfig>;
  private analytics: AnalyticsData;

  // Intelligence modules
  private trendDetector?: TrendDetector;
  private demandForecaster?: DemandForecaster;
  private categoryAnalyzer?: CategoryAnalyzer;
  private priceAnalyzer?: PriceAnalyzer;
  private priceTracker?: PriceTracker;
  private productMatcher?: ProductMatcher;

  constructor(config: QueryHandlerConfig) {
    this.vectorStore = config.vectorStore;
    this.embeddingService = config.embeddingService || new EmbeddingService();

    this.config = {
      searchEngine: config.searchEngine,
      embeddingService: this.embeddingService,
      enableAnalytics: config.enableAnalytics ?? true,
      defaultLimit: config.defaultLimit ?? 10,
      vectorStore: config.vectorStore,
    };

    // Initialize search engine if not provided
    this.searchEngine = this.config.searchEngine || new SemanticSearchEngine({
      vectorStore: {
        search: async (vector: number[], limit: number) => {
          return this.vectorStore.search('products', vector, { limit });
        },
        searchByText: async (text: string, limit: number) => {
          const vector = await this.embeddingService.embed(text);
          return this.vectorStore.search('products', vector, { limit });
        },
      },
    });

    // Initialize router with handlers
    this.router = new SemanticRouter({
      embeddingService: this.embeddingService,
      confidenceThreshold: 0.6,
      enableCache: true,
    });

    // Initialize analytics
    this.analytics = {
      queryCount: 0,
      intentDistribution: {},
      avgConfidence: 0,
      avgExecutionTime: 0,
      lastQueries: [],
    };

    // Initialize intelligence modules lazily
  }

  /**
   * Initialize the router with all handlers
   */
  async initialize(): Promise<void> {
    const handlers: Record<string, RouteHandler> = {
      product_search: this.handleProductSearch.bind(this),
      price_check: this.handlePriceCheck.bind(this),
      recommendation: this.handleRecommendation.bind(this),
      trend_analysis: this.handleTrendAnalysis.bind(this),
      category_browse: this.handleCategoryBrowse.bind(this),
    };

    // Create router with ecommerce routes
    const tempRouter = await SemanticRouter.createEcommerceRouter(handlers, {
      embeddingService: this.embeddingService,
      confidenceThreshold: 0.6,
    });

    // Copy routes to our router
    for (const route of tempRouter.getRoutes()) {
      await this.router.defineRoute(
        route.name,
        route.utterances,
        route.handler,
        route.metadata
      );
    }

    console.log('✓ QueryHandler initialized with', this.router.getRoutes().length, 'routes');
  }

  /**
   * Handle a user query
   */
  async handleQuery(query: string, options?: any): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      // Find best matching route
      const match = await this.router.findBestMatch(query);

      if (!match) {
        // Fallback to basic search
        return this.handleProductSearch(query, options);
      }

      // Execute the matched handler
      const data = await match.route.handler(query, options);

      const executionTime = Date.now() - startTime;

      // Update analytics
      if (this.config.enableAnalytics) {
        this.updateAnalytics(query, match.route.name, match.confidence, executionTime);
      }

      return {
        intent: match.route.name,
        query,
        data,
        confidence: match.confidence,
        score: match.score,
        executionTime,
        metadata: match.route.metadata,
      };
    } catch (error: any) {
      console.error('Error handling query:', error);
      throw new Error(`Failed to handle query: ${error.message}`);
    }
  }

  /**
   * Get all possible route matches for a query (for debugging)
   */
  async analyzeQuery(query: string): Promise<any> {
    const matches = await this.router.getAllMatches(query);
    return {
      query,
      matches: matches.map(m => ({
        intent: m.route.name,
        score: m.score,
        confidence: m.confidence,
        matchedUtterance: m.matchedUtterance,
        metadata: m.route.metadata,
      })),
      topMatch: matches[0] ? {
        intent: matches[0].route.name,
        confidence: matches[0].confidence,
      } : null,
    };
  }

  /**
   * Handler: Product Search
   */
  private async handleProductSearch(query: string, options?: any): Promise<any> {
    const searchOptions: SearchOptions = {
      limit: options?.limit || this.config.defaultLimit,
      offset: options?.offset || 0,
      filters: options?.filters,
      enableFacets: options?.enableFacets ?? true,
      enableSuggestions: options?.enableSuggestions ?? true,
      diversify: options?.diversify ?? false,
    };

    const results = await this.searchEngine.search(query, searchOptions);

    return {
      type: 'product_search',
      products: results.products.map(p => ({
        id: p.product.id,
        name: p.product.name,
        price: p.product.price,
        category: p.product.category,
        brand: p.product.brand,
        score: p.score,
        relevance: this.getRelevanceLabel(p.score),
      })),
      total: results.total,
      facets: results.facets,
      suggestions: results.suggestions,
      timing: results.timing,
    };
  }

  /**
   * Handler: Price Check
   */
  private async handlePriceCheck(query: string, options?: any): Promise<any> {
    // First, search for the product
    const searchResults = await this.searchEngine.search(query, { limit: 5 });

    if (searchResults.products.length === 0) {
      return {
        type: 'price_check',
        error: 'No products found',
        query,
      };
    }

    const topProduct = searchResults.products[0].product;

    // Initialize price analyzer if needed
    if (!this.priceAnalyzer) {
      this.priceAnalyzer = new PriceAnalyzer({
        vectorStore: this.vectorStore,
      });
    }

    // Get competitive analysis
    const analysis = await this.priceAnalyzer.analyzeCompetitivePricing(topProduct.id);

    return {
      type: 'price_check',
      product: {
        id: topProduct.id,
        name: topProduct.name,
        price: topProduct.price,
        category: topProduct.category,
      },
      currentPrice: topProduct.price,
      marketPosition: analysis.marketPosition,
      competitors: analysis.competitors.slice(0, 5),
      recommendedPriceRange: analysis.recommendedPriceRange,
      insights: this.generatePriceInsights(analysis),
    };
  }

  /**
   * Handler: Product Recommendations
   */
  private async handleRecommendation(query: string, options?: any): Promise<any> {
    // Search for the reference product or category
    const searchResults = await this.searchEngine.search(query, { limit: 1 });

    if (searchResults.products.length === 0) {
      return {
        type: 'recommendation',
        error: 'No reference product found',
        query,
      };
    }

    const referenceProduct = searchResults.products[0].product;

    // Find similar products
    const similarProducts = await this.searchEngine.findSimilar(
      referenceProduct.id,
      options?.limit || this.config.defaultLimit
    );

    // Initialize product matcher if needed
    if (!this.productMatcher) {
      this.productMatcher = new ProductMatcher({
        vectorStore: this.vectorStore,
        embeddingService: this.embeddingService,
      });
    }

    // Get detailed match information
    const recommendations = [];
    for (const product of similarProducts) {
      const matchResult = await this.productMatcher.findMatch(product);
      recommendations.push({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        brand: product.brand,
        similarity: matchResult.similarity,
        reason: this.generateRecommendationReason(product, referenceProduct, matchResult),
      });
    }

    return {
      type: 'recommendation',
      referenceProduct: {
        id: referenceProduct.id,
        name: referenceProduct.name,
        price: referenceProduct.price,
        category: referenceProduct.category,
      },
      recommendations,
      total: recommendations.length,
    };
  }

  /**
   * Handler: Trend Analysis
   */
  private async handleTrendAnalysis(query: string, options?: any): Promise<any> {
    // Initialize trend detector if needed
    if (!this.trendDetector) {
      this.trendDetector = new TrendDetector();
    }

    if (!this.demandForecaster) {
      this.demandForecaster = new DemandForecaster();
    }

    if (!this.categoryAnalyzer) {
      this.categoryAnalyzer = new CategoryAnalyzer({
        vectorStore: this.vectorStore,
      });
    }

    // Extract category from query if possible
    const searchResults = await this.searchEngine.search(query, { limit: 20 });

    if (searchResults.products.length === 0) {
      return {
        type: 'trend_analysis',
        error: 'No data available for trend analysis',
        query,
      };
    }

    // Get category from top results
    const categories = new Set(searchResults.products.map(p => p.product.category));
    const primaryCategory = Array.from(categories)[0];

    // Analyze category trends
    const categoryMetrics = await this.categoryAnalyzer.analyzeCategory(primaryCategory);

    // Detect trends in the data
    const productData = searchResults.products.map(p => ({
      timestamp: Date.now(),
      value: p.score,
      productId: p.product.id,
    }));

    const trends = this.trendDetector.detectTrends(productData);

    return {
      type: 'trend_analysis',
      category: primaryCategory,
      metrics: {
        totalProducts: categoryMetrics.productCount,
        averagePrice: categoryMetrics.averagePrice,
        priceRange: categoryMetrics.priceRange,
        topBrands: categoryMetrics.topBrands,
      },
      trends: {
        overall: trends.trend,
        strength: trends.strength,
        direction: trends.direction,
      },
      insights: this.generateTrendInsights(categoryMetrics, trends),
      topProducts: searchResults.products.slice(0, 5).map(p => ({
        id: p.product.id,
        name: p.product.name,
        price: p.product.price,
        score: p.score,
      })),
    };
  }

  /**
   * Handler: Category Browse
   */
  private async handleCategoryBrowse(query: string, options?: any): Promise<any> {
    // Initialize category analyzer if needed
    if (!this.categoryAnalyzer) {
      this.categoryAnalyzer = new CategoryAnalyzer({
        vectorStore: this.vectorStore,
      });
    }

    // Get all categories (simplified - in real app, would query database)
    const searchResults = await this.searchEngine.search('', {
      limit: 100,
      enableFacets: true,
    });

    const categories = searchResults.facets?.categories || {};
    const categoryList = Object.entries(categories).map(([name, count]) => ({
      name,
      productCount: count,
    }));

    // Get metrics for top categories
    const categoryMetrics = [];
    for (const category of categoryList.slice(0, 10)) {
      try {
        const metrics = await this.categoryAnalyzer.analyzeCategory(category.name);
        categoryMetrics.push({
          name: category.name,
          productCount: metrics.productCount,
          averagePrice: metrics.averagePrice,
          growth: metrics.growth,
          health: metrics.health,
        });
      } catch (error) {
        // Skip if analysis fails
        categoryMetrics.push({
          name: category.name,
          productCount: category.productCount,
        });
      }
    }

    return {
      type: 'category_browse',
      categories: categoryMetrics,
      total: categoryList.length,
      featured: categoryMetrics.slice(0, 3),
    };
  }

  /**
   * Get analytics data
   */
  getAnalytics(): AnalyticsData {
    return { ...this.analytics };
  }

  /**
   * Get router statistics
   */
  getRouterStats() {
    return this.router.getStats();
  }

  /**
   * Update analytics
   */
  private updateAnalytics(
    query: string,
    intent: string,
    confidence: 'high' | 'medium' | 'low',
    executionTime: number
  ): void {
    this.analytics.queryCount++;
    this.analytics.intentDistribution[intent] =
      (this.analytics.intentDistribution[intent] || 0) + 1;

    const confidenceValue = confidence === 'high' ? 1 : confidence === 'medium' ? 0.75 : 0.5;
    this.analytics.avgConfidence =
      (this.analytics.avgConfidence * (this.analytics.queryCount - 1) + confidenceValue) /
      this.analytics.queryCount;

    this.analytics.avgExecutionTime =
      (this.analytics.avgExecutionTime * (this.analytics.queryCount - 1) + executionTime) /
      this.analytics.queryCount;

    this.analytics.lastQueries.push({
      query,
      intent,
      timestamp: Date.now(),
    });

    // Keep only last 100 queries
    if (this.analytics.lastQueries.length > 100) {
      this.analytics.lastQueries.shift();
    }
  }

  /**
   * Generate price insights
   */
  private generatePriceInsights(analysis: any): string[] {
    const insights: string[] = [];
    const position = analysis.marketPosition;

    if (position.competitiveness === 'very-competitive') {
      insights.push('This product is priced very competitively in the market');
    } else if (position.competitiveness === 'expensive') {
      insights.push('This product is priced higher than most competitors');
    }

    if (position.position === 'budget') {
      insights.push('Positioned as a budget-friendly option');
    } else if (position.position === 'premium') {
      insights.push('Positioned as a premium product');
    }

    if (analysis.competitors.length > 0) {
      const avgCompPrice = analysis.competitors.reduce((sum: number, c: any) => sum + c.price, 0) / analysis.competitors.length;
      const diff = ((analysis.currentPrice - avgCompPrice) / avgCompPrice * 100).toFixed(1);
      insights.push(`${diff}% ${parseFloat(diff) > 0 ? 'above' : 'below'} average competitor price`);
    }

    return insights;
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(
    product: ProductDocument,
    reference: ProductDocument,
    matchResult: any
  ): string {
    if (product.category === reference.category && product.brand === reference.brand) {
      return 'Same brand and category';
    } else if (product.category === reference.category) {
      return 'Similar category';
    } else if (product.brand === reference.brand) {
      return 'Same brand';
    } else if (matchResult.similarity > 0.8) {
      return 'Highly similar product';
    } else {
      return 'Related product';
    }
  }

  /**
   * Generate trend insights
   */
  private generateTrendInsights(metrics: any, trends: any): string[] {
    const insights: string[] = [];

    if (trends.direction === 'increasing') {
      insights.push('Increasing demand detected');
    } else if (trends.direction === 'decreasing') {
      insights.push('Decreasing demand observed');
    }

    if (trends.strength > 0.7) {
      insights.push('Strong trend signal');
    } else if (trends.strength > 0.4) {
      insights.push('Moderate trend signal');
    }

    if (metrics.growth > 0.1) {
      insights.push(`Category growing at ${(metrics.growth * 100).toFixed(1)}%`);
    }

    return insights;
  }

  /**
   * Get relevance label from score
   */
  private getRelevanceLabel(score: number): string {
    if (score >= 0.9) return 'Excellent match';
    if (score >= 0.8) return 'Very good match';
    if (score >= 0.7) return 'Good match';
    if (score >= 0.6) return 'Moderate match';
    return 'Weak match';
  }

  /**
   * Create a QueryHandler instance
   */
  static async create(config: QueryHandlerConfig): Promise<QueryHandler> {
    const handler = new QueryHandler(config);
    await handler.initialize();
    return handler;
  }
}
