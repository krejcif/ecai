/**
 * SemanticSearchEngine - Main search engine combining vector and keyword search
 */

import { ProductDocument } from '../database/collections';
import { FilterBuilder, FilterCriteria, Facets, FacetBuilder } from './filters';
import { QueryParser, ParsedQuery } from './query-parser';
import { RankingService, ScoredProduct, UserContext, RankingConfig } from './ranking';

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: FilterCriteria;
  userContext?: UserContext;
  enableFacets?: boolean;
  enableSuggestions?: boolean;
  hybridSearchRatio?: number; // 0 = pure keyword, 1 = pure vector, 0.5 = balanced
  diversify?: boolean;
}

export interface SearchResult {
  products: ScoredProduct[];
  total: number;
  query: ParsedQuery;
  facets?: Facets;
  suggestions?: string[];
  timing: SearchTiming;
}

export interface SearchTiming {
  parsing: number;
  vectorSearch: number;
  filtering: number;
  ranking: number;
  total: number;
}

export interface VectorStore {
  search(vector: number[], limit: number): Promise<Array<{ id: string; score: number; document: ProductDocument }>>;
  searchByText?(text: string, limit: number): Promise<Array<{ id: string; score: number; document: ProductDocument }>>;
}

export interface SearchEngineConfig {
  vectorStore: VectorStore;
  rankingConfig?: RankingConfig;
  defaultLimit?: number;
  enableQueryParsing?: boolean;
  enableHybridSearch?: boolean;
}

/**
 * SemanticSearchEngine - Advanced product search with vector + keyword hybrid approach
 */
export class SemanticSearchEngine {
  private vectorStore: VectorStore;
  private queryParser: QueryParser;
  private rankingService: RankingService;
  private config: SearchEngineConfig;
  private productCache: Map<string, ProductDocument> = new Map();

  constructor(config: SearchEngineConfig) {
    this.config = {
      defaultLimit: 20,
      enableQueryParsing: true,
      enableHybridSearch: true,
      ...config
    };

    this.vectorStore = config.vectorStore;
    this.queryParser = QueryParser.create();
    this.rankingService = RankingService.create(config.rankingConfig);
  }

  /**
   * Main search method
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();
    const timing: SearchTiming = {
      parsing: 0,
      vectorSearch: 0,
      filtering: 0,
      ranking: 0,
      total: 0
    };

    // Parse query
    const parseStart = Date.now();
    const parsedQuery = this.config.enableQueryParsing
      ? this.queryParser.parse(query)
      : {
          cleanedQuery: query,
          originalQuery: query,
          entities: {},
          filters: {},
          searchTerms: query.split(/\s+/),
          operators: {}
        };
    timing.parsing = Date.now() - parseStart;

    // Combine parsed filters with explicit filters
    const combinedFilters: FilterCriteria = {
      ...parsedQuery.filters,
      ...options.filters
    };

    // Perform vector search
    const vectorStart = Date.now();
    const searchQuery = parsedQuery.cleanedQuery || parsedQuery.originalQuery;
    const limit = options.limit || this.config.defaultLimit || 20;

    let vectorResults: Array<{ id: string; score: number; document: ProductDocument }> = [];

    // Use searchByText if available (embedding will be handled by vector store)
    if (this.vectorStore.searchByText) {
      vectorResults = await this.vectorStore.searchByText(searchQuery, limit * 3);
    } else {
      // Fallback: would need to generate embeddings here
      // For now, return empty results
      console.warn('Vector store does not support text search. Implement embedding generation.');
    }

    timing.vectorSearch = Date.now() - vectorStart;

    // Extract products and scores
    const products = vectorResults.map(r => r.document);
    const vectorScores = new Map(vectorResults.map(r => [r.id, r.score]));

    // Apply filters
    const filterStart = Date.now();
    const filteredProducts = this.applyFilters(products, combinedFilters);
    timing.filtering = Date.now() - filterStart;

    // Rank results
    const rankStart = Date.now();
    const rankedProducts = this.rankingService.rankProducts(
      filteredProducts,
      vectorScores,
      searchQuery,
      options.userContext
    );
    timing.ranking = Date.now() - rankStart;

    // Apply diversity if requested
    let finalResults = rankedProducts;
    if (options.diversify) {
      finalResults = this.rankingService.diversifyResults(rankedProducts);
    }

    // Pagination
    const offset = options.offset || 0;
    const paginatedResults = finalResults.slice(offset, offset + limit);

    // Generate facets if requested
    let facets: Facets | undefined;
    if (options.enableFacets) {
      facets = FacetBuilder.buildFacets(filteredProducts);
    }

    // Generate suggestions if requested
    let suggestions: string[] | undefined;
    if (options.enableSuggestions) {
      suggestions = this.queryParser.generateSuggestions(query);
    }

    timing.total = Date.now() - startTime;

    return {
      products: paginatedResults,
      total: finalResults.length,
      query: parsedQuery,
      facets,
      suggestions,
      timing
    };
  }

  /**
   * Multi-field search across name, description, category, brand
   */
  async multiFieldSearch(
    query: string,
    fields: Array<'name' | 'description' | 'category' | 'brand'>,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    // Enhance the query by specifying which fields to search
    // This could be implemented by weighting different fields differently
    const enhancedQuery = fields.map(field => `${field}:${query}`).join(' ');

    return this.search(enhancedQuery, options);
  }

  /**
   * Autocomplete/suggestions
   */
  async autocomplete(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    // Generate suggestions based on partial query
    const suggestions = this.queryParser.generateSuggestions(partialQuery, limit);

    // Could also search for products and extract popular search terms
    // For now, return parser suggestions
    return suggestions;
  }

  /**
   * Search similar products
   */
  async findSimilar(
    productId: string,
    limit: number = 10
  ): Promise<ProductDocument[]> {
    const product = this.productCache.get(productId);
    if (!product || !product.vector) {
      throw new Error(`Product ${productId} not found or has no vector`);
    }

    const results = await this.vectorStore.search(product.vector, limit + 1);

    // Filter out the source product and return similar ones
    return results
      .filter(r => r.id !== productId)
      .slice(0, limit)
      .map(r => r.document);
  }

  /**
   * Hybrid search combining vector and keyword approaches
   */
  async hybridSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const ratio = options.hybridSearchRatio ?? 0.5; // Default balanced

    // Perform both vector and keyword search
    const [vectorResults, keywordResults] = await Promise.all([
      this.search(query, { ...options, hybridSearchRatio: 1.0 }),
      this.keywordSearch(query, options)
    ]);

    // Merge results with weighted scores
    const mergedScores = new Map<string, ScoredProduct>();

    // Add vector results
    for (const item of vectorResults.products) {
      const weightedScore = item.score * ratio;
      mergedScores.set(item.product.id, {
        ...item,
        score: weightedScore,
        scores: {
          ...item.scores,
          total: weightedScore
        }
      });
    }

    // Add keyword results
    for (const item of keywordResults.products) {
      const weightedScore = item.score * (1 - ratio);
      const existing = mergedScores.get(item.product.id);

      if (existing) {
        // Combine scores
        existing.score += weightedScore;
        existing.scores.total += weightedScore;
      } else {
        mergedScores.set(item.product.id, {
          ...item,
          score: weightedScore,
          scores: {
            ...item.scores,
            total: weightedScore
          }
        });
      }
    }

    // Sort by combined score
    const products = Array.from(mergedScores.values())
      .sort((a, b) => b.score - a.score);

    const limit = options.limit || this.config.defaultLimit || 20;
    const offset = options.offset || 0;

    return {
      ...vectorResults,
      products: products.slice(offset, offset + limit),
      total: products.length
    };
  }

  /**
   * Pure keyword search (fallback)
   */
  async keywordSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();
    const parsedQuery = this.queryParser.parse(query);

    // For keyword search, we would need access to all products
    // This is a simplified implementation
    const allProducts = Array.from(this.productCache.values());

    const queryLower = query.toLowerCase();
    const matchedProducts = allProducts.filter(product => {
      const searchText = `${product.name} ${product.description} ${product.category}`.toLowerCase();
      return searchText.includes(queryLower);
    });

    // Create mock vector scores based on keyword matching
    const vectorScores = new Map<string, number>();
    for (const product of matchedProducts) {
      const score = this.calculateKeywordScore(product, query);
      vectorScores.set(product.id, score);
    }

    // Apply filters
    const combinedFilters: FilterCriteria = {
      ...parsedQuery.filters,
      ...options.filters
    };
    const filteredProducts = this.applyFilters(matchedProducts, combinedFilters);

    // Rank results
    const rankedProducts = this.rankingService.rankProducts(
      filteredProducts,
      vectorScores,
      query,
      options.userContext
    );

    const limit = options.limit || this.config.defaultLimit || 20;
    const offset = options.offset || 0;

    return {
      products: rankedProducts.slice(offset, offset + limit),
      total: rankedProducts.length,
      query: parsedQuery,
      timing: {
        parsing: 0,
        vectorSearch: 0,
        filtering: 0,
        ranking: 0,
        total: Date.now() - startTime
      }
    };
  }

  /**
   * Apply filters to products
   */
  private applyFilters(
    products: ProductDocument[],
    filters: FilterCriteria
  ): ProductDocument[] {
    if (Object.keys(filters).length === 0) {
      return products;
    }

    const filterFn = FilterBuilder.create()
      .withPriceRange(filters.priceRange?.min, filters.priceRange?.max)
      .withCategories(...(filters.categories || []))
      .withBrands(...(filters.brands || []))
      .withRating(filters.rating?.min, filters.rating?.max)
      .build();

    return products.filter(filterFn);
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordScore(product: ProductDocument, query: string): number {
    const queryLower = query.toLowerCase();
    const nameLower = product.name.toLowerCase();
    const descLower = product.description.toLowerCase();

    let score = 0;

    // Exact match in name
    if (nameLower === queryLower) {
      score = 1.0;
    }
    // Name contains query
    else if (nameLower.includes(queryLower)) {
      score = 0.8;
    }
    // Description contains query
    else if (descLower.includes(queryLower)) {
      score = 0.5;
    }
    // Partial word matches
    else {
      const queryWords = queryLower.split(/\s+/);
      const nameWords = nameLower.split(/\s+/);
      const matches = queryWords.filter(qw => nameWords.some(nw => nw.includes(qw)));
      score = matches.length / queryWords.length * 0.3;
    }

    return score;
  }

  /**
   * Cache products for faster access
   */
  cacheProducts(products: ProductDocument[]): void {
    for (const product of products) {
      this.productCache.set(product.id, product);
    }
  }

  /**
   * Clear product cache
   */
  clearCache(): void {
    this.productCache.clear();
  }

  /**
   * Add custom brand to query parser
   */
  addBrand(brand: string): void {
    this.queryParser.addBrands(brand);
  }

  /**
   * Add custom category to query parser
   */
  addCategory(category: string, keywords: string[]): void {
    this.queryParser.addCategory(category, keywords);
  }

  /**
   * Get current ranking weights
   */
  getRankingWeights() {
    return this.rankingService.getWeights();
  }

  /**
   * Update ranking weights
   */
  updateRankingWeights(weights: any): void {
    this.rankingService.updateWeights(weights);
  }

  /**
   * Set A/B test variant
   */
  setABTestVariant(variant: string): void {
    this.rankingService.setABTestVariant(variant);
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(results: SearchResult): SearchAnalytics {
    return {
      totalResults: results.total,
      avgScore: this.calculateAverageScore(results.products),
      scoreDistribution: this.getScoreDistribution(results.products),
      categoryDistribution: this.getCategoryDistribution(results.products),
      priceRange: this.getPriceRange(results.products),
      timing: results.timing
    };
  }

  /**
   * Calculate average score
   */
  private calculateAverageScore(products: ScoredProduct[]): number {
    if (products.length === 0) return 0;
    const sum = products.reduce((acc, p) => acc + p.score, 0);
    return sum / products.length;
  }

  /**
   * Get score distribution
   */
  private getScoreDistribution(products: ScoredProduct[]): Record<string, number> {
    const distribution: Record<string, number> = {
      'high (0.8-1.0)': 0,
      'medium (0.5-0.8)': 0,
      'low (0-0.5)': 0
    };

    for (const product of products) {
      if (product.score >= 0.8) {
        distribution['high (0.8-1.0)']++;
      } else if (product.score >= 0.5) {
        distribution['medium (0.5-0.8)']++;
      } else {
        distribution['low (0-0.5)']++;
      }
    }

    return distribution;
  }

  /**
   * Get category distribution
   */
  private getCategoryDistribution(products: ScoredProduct[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const product of products) {
      const category = product.product.category;
      distribution[category] = (distribution[category] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Get price range from results
   */
  private getPriceRange(products: ScoredProduct[]): { min: number; max: number; avg: number } {
    if (products.length === 0) {
      return { min: 0, max: 0, avg: 0 };
    }

    const prices = products.map(p => p.product.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length
    };
  }

  /**
   * Create a SemanticSearchEngine instance
   */
  static create(config: SearchEngineConfig): SemanticSearchEngine {
    return new SemanticSearchEngine(config);
  }
}

export interface SearchAnalytics {
  totalResults: number;
  avgScore: number;
  scoreDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  priceRange: { min: number; max: number; avg: number };
  timing: SearchTiming;
}
