/**
 * Search Module Exports
 *
 * This module provides a comprehensive semantic search engine for e-commerce products
 * combining vector similarity search, keyword matching, and advanced ranking algorithms.
 */

// Main Search Engine
export {
  SemanticSearchEngine,
  type SearchOptions,
  type SearchResult,
  type SearchTiming,
  type VectorStore,
  type SearchEngineConfig,
  type SearchAnalytics
} from './search-engine';

// Query Parser
export {
  QueryParser,
  type ParsedQuery,
  type QueryEntities,
  type QueryOperators,
  type ParserConfig
} from './query-parser';

// Ranking Service
export {
  RankingService,
  type ScoredProduct,
  type ScoreBreakdown,
  type RankingWeights,
  type RankingConfig,
  type UserContext
} from './ranking';

// Filters
export {
  FilterBuilder,
  FacetBuilder,
  type FilterCriteria,
  type PriceRange,
  type RatingFilter,
  type FilterOptions,
  type Facets,
  type FacetCount
} from './filters';

/**
 * Example Usage:
 *
 * ```typescript
 * import { SemanticSearchEngine, FilterBuilder } from './search';
 *
 * // Initialize search engine
 * const searchEngine = SemanticSearchEngine.create({
 *   vectorStore: myVectorStore,
 *   rankingConfig: {
 *     weights: {
 *       vectorSimilarity: 0.5,
 *       keywordMatch: 0.3,
 *       rating: 0.2
 *     }
 *   }
 * });
 *
 * // Perform search
 * const results = await searchEngine.search('red nike shoes under $100', {
 *   limit: 20,
 *   enableFacets: true,
 *   enableSuggestions: true
 * });
 *
 * // Access results
 * console.log(`Found ${results.total} products`);
 * console.log(`Top result: ${results.products[0].product.name}`);
 * console.log(`Score: ${results.products[0].score}`);
 * console.log(`Facets:`, results.facets);
 * console.log(`Suggestions:`, results.suggestions);
 *
 * // Apply custom filters
 * const filter = FilterBuilder.create()
 *   .withPriceRange(50, 150)
 *   .withCategories('electronics', 'computers')
 *   .withRating(4.0)
 *   .build();
 *
 * const filteredResults = await searchEngine.search('laptop', {
 *   filters: filter
 * });
 * ```
 */
