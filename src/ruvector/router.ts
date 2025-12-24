/**
 * Semantic Router - Intelligent query routing using vector similarity
 *
 * Routes user queries to the appropriate handler based on semantic understanding
 * rather than exact keyword matching.
 */

import { EmbeddingService } from '../database/embeddings';
import * as fs from 'fs';
import * as path from 'path';

export interface Route {
  name: string;
  utterances: string[];
  handler: RouteHandler;
  metadata?: Record<string, any>;
}

export interface RouteMatch {
  route: Route;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  matchedUtterance?: string;
}

export type RouteHandler = (query: string, params?: any) => Promise<any>;

export interface RouterConfig {
  embeddingService?: EmbeddingService;
  confidenceThreshold?: number;
  fallbackRoute?: Route;
  enableCache?: boolean;
}

/**
 * SemanticRouter - Routes queries to appropriate handlers using vector similarity
 */
export class SemanticRouter {
  private routes: Map<string, Route>;
  private routeVectors: Map<string, number[][]>; // route name -> utterance vectors
  private embeddingService: EmbeddingService;
  private config: Required<Omit<RouterConfig, 'fallbackRoute'>> & { fallbackRoute?: Route };
  private queryCache: Map<string, RouteMatch>;

  constructor(config: RouterConfig = {}) {
    this.routes = new Map();
    this.routeVectors = new Map();
    this.embeddingService = config.embeddingService || new EmbeddingService();
    this.config = {
      confidenceThreshold: config.confidenceThreshold ?? 0.6,
      enableCache: config.enableCache ?? true,
      fallbackRoute: config.fallbackRoute,
    };
    this.queryCache = new Map();
  }

  /**
   * Define a new route with example utterances
   */
  async defineRoute(
    name: string,
    utterances: string[],
    handler: RouteHandler,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (utterances.length === 0) {
      throw new Error(`Route ${name} must have at least one utterance`);
    }

    const route: Route = {
      name,
      utterances,
      handler,
      metadata,
    };

    // Generate embeddings for all utterances
    const vectors: number[][] = [];
    for (const utterance of utterances) {
      const vector = await this.embeddingService.embed(utterance);
      vectors.push(vector);
    }

    this.routes.set(name, route);
    this.routeVectors.set(name, vectors);

    console.log(`✓ Route '${name}' defined with ${utterances.length} utterances`);
  }

  /**
   * Route a query to the best matching handler
   */
  async route(query: string, params?: any): Promise<any> {
    const match = await this.findBestMatch(query);

    if (!match) {
      if (this.config.fallbackRoute) {
        console.log(`No match found, using fallback route`);
        return this.config.fallbackRoute.handler(query, params);
      }
      throw new Error(`No matching route found for query: "${query}"`);
    }

    console.log(`Routing to '${match.route.name}' (confidence: ${match.confidence}, score: ${match.score.toFixed(3)})`);

    // Execute the matched handler
    return match.route.handler(query, params);
  }

  /**
   * Find best matching route for a query
   */
  async findBestMatch(query: string): Promise<RouteMatch | null> {
    // Check cache first
    if (this.config.enableCache && this.queryCache.has(query)) {
      return this.queryCache.get(query)!;
    }

    // Generate embedding for the query
    const queryVector = await this.embeddingService.embed(query);

    let bestMatch: RouteMatch | null = null;
    let bestScore = -1;

    // Compare with all routes
    for (const [routeName, route] of this.routes) {
      const utteranceVectors = this.routeVectors.get(routeName)!;

      // Calculate similarity with each utterance
      for (let i = 0; i < utteranceVectors.length; i++) {
        const score = this.cosineSimilarity(queryVector, utteranceVectors[i]);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            route,
            score,
            confidence: this.getConfidence(score),
            matchedUtterance: route.utterances[i],
          };
        }
      }
    }

    // Check if score meets threshold
    if (bestMatch && bestScore >= this.config.confidenceThreshold) {
      // Cache the result
      if (this.config.enableCache) {
        this.queryCache.set(query, bestMatch);
      }
      return bestMatch;
    }

    return null;
  }

  /**
   * Get all possible matches for a query (for debugging)
   */
  async getAllMatches(query: string): Promise<RouteMatch[]> {
    const queryVector = await this.embeddingService.embed(query);
    const matches: RouteMatch[] = [];

    for (const [routeName, route] of this.routes) {
      const utteranceVectors = this.routeVectors.get(routeName)!;

      let bestScore = -1;
      let bestUtteranceIdx = 0;

      // Find best matching utterance for this route
      for (let i = 0; i < utteranceVectors.length; i++) {
        const score = this.cosineSimilarity(queryVector, utteranceVectors[i]);
        if (score > bestScore) {
          bestScore = score;
          bestUtteranceIdx = i;
        }
      }

      matches.push({
        route,
        score: bestScore,
        confidence: this.getConfidence(bestScore),
        matchedUtterance: route.utterances[bestUtteranceIdx],
      });
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Remove a route
   */
  removeRoute(name: string): void {
    this.routes.delete(name);
    this.routeVectors.delete(name);
    this.clearCache();
  }

  /**
   * Clear the query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get all defined routes
   */
  getRoutes(): Route[] {
    return Array.from(this.routes.values());
  }

  /**
   * Export routes to JSON file
   */
  async exportRoutes(filepath: string): Promise<void> {
    const routes = this.getRoutes().map(r => ({
      name: r.name,
      utterances: r.utterances,
      metadata: r.metadata,
    }));

    fs.writeFileSync(filepath, JSON.stringify(routes, null, 2));
    console.log(`Exported ${routes.length} routes to ${filepath}`);
  }

  /**
   * Import routes from JSON file (handlers must be added separately)
   */
  async importRoutes(
    filepath: string,
    handlers: Record<string, RouteHandler>
  ): Promise<void> {
    const content = fs.readFileSync(filepath, 'utf-8');
    const routes = JSON.parse(content);

    for (const route of routes) {
      const handler = handlers[route.name];
      if (!handler) {
        console.warn(`No handler found for route '${route.name}', skipping`);
        continue;
      }

      await this.defineRoute(
        route.name,
        route.utterances,
        handler,
        route.metadata
      );
    }
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

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Get confidence level from score
   */
  private getConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Create a router with default ecommerce routes
   */
  static async createEcommerceRouter(
    handlers: Record<string, RouteHandler>,
    config?: RouterConfig
  ): Promise<SemanticRouter> {
    const router = new SemanticRouter(config);

    // Define product search routes
    if (handlers.product_search) {
      await router.defineRoute(
        'product_search',
        [
          'find products',
          'search for items',
          'look for products',
          'show me products',
          'what products do you have',
          'I need to find',
          'looking for',
          'search',
          'find',
        ],
        handlers.product_search,
        { category: 'search' }
      );
    }

    // Define price check routes
    if (handlers.price_check) {
      await router.defineRoute(
        'price_check',
        [
          'what is the price',
          'how much does it cost',
          'price of',
          'check price',
          'cost of',
          'pricing for',
          'is it expensive',
          'price comparison',
          'compare prices',
        ],
        handlers.price_check,
        { category: 'pricing' }
      );
    }

    // Define recommendation routes
    if (handlers.recommendation) {
      await router.defineRoute(
        'recommendation',
        [
          'recommend me something',
          'what should I buy',
          'suggest products',
          'recommend products',
          'what do you recommend',
          'similar to',
          'alternatives to',
          'products like',
          'I might like',
        ],
        handlers.recommendation,
        { category: 'recommendations' }
      );
    }

    // Define trend analysis routes
    if (handlers.trend_analysis) {
      await router.defineRoute(
        'trend_analysis',
        [
          'what is trending',
          'show me trends',
          'popular products',
          'trending items',
          'what is hot',
          'emerging trends',
          'market trends',
          'demand forecast',
          'seasonal trends',
        ],
        handlers.trend_analysis,
        { category: 'trends' }
      );
    }

    // Define category browse routes
    if (handlers.category_browse) {
      await router.defineRoute(
        'category_browse',
        [
          'show categories',
          'browse categories',
          'what categories',
          'explore products',
          'browse',
          'categories available',
          'product categories',
          'shop by category',
        ],
        handlers.category_browse,
        { category: 'navigation' }
      );
    }

    return router;
  }

  /**
   * Get router statistics
   */
  getStats() {
    const totalUtterances = Array.from(this.routes.values())
      .reduce((sum, route) => sum + route.utterances.length, 0);

    return {
      totalRoutes: this.routes.size,
      totalUtterances,
      cacheSize: this.queryCache.size,
      avgUtterancesPerRoute: totalUtterances / this.routes.size || 0,
      routes: Array.from(this.routes.entries()).map(([name, route]) => ({
        name,
        utterances: route.utterances.length,
        hasMetadata: !!route.metadata,
      })),
    };
  }
}
