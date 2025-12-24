/**
 * RuVector AI Recommendation Engine
 * High-performance vector-based product recommendations
 */

export {
  RecommendationEngine,
  type RecommendationOptions,
  type ProductRecommendation,
  type TrendingProductOptions,
  type CrossSellOptions
} from './recommendations';

export {
  calculateCosineSimilarity,
  calculateEuclideanDistance,
  calculateDotProduct,
  calculateManhattanDistance,
  rankBySimilarity,
  calculateAverageVector,
  normalizeVector,
  calculateWeightedSimilarity,
  selectDiverseItems,
  type SimilarityResult
} from './similarity';

export {
  ProductCategorizer,
  type Product as CategorizationProduct,
  type CategorizationResult,
  type MiscategorizedProduct,
  type CategoryEmbedding,
  type ProductCategorizerConfig
} from './categorization';

export {
  CategoryIndex,
  type Category,
  type CategoryVector,
  type CategoryMatch,
  type CategoryIndexConfig
} from './category-index';

// Trend Clustering and Analysis
export {
  TrendVectorizer,
  type TrendSignals,
  type TrendVectorData,
  type VectorizedTrend,
  type VectorizationOptions,
} from './trend-vectors';

export {
  TrendClusterer,
  type ProductTrendData,
  type TrendCluster,
  type EmergingTrend,
  type TrendVelocity,
  type RelatedTrend,
  type ClusteringOptions,
} from './trend-cluster';

// Price Intelligence System
export {
  PriceVectorizer,
  type PriceVectorConfig,
  type PriceData,
  type PriceFeatures
} from './price-vectors';

export {
  PriceIntelligence,
  type PriceIntelligenceConfig,
  type PriceAnomaly,
  type PriceChangePrognosis,
  type CompetitivePricing,
  type PriceOptimization
} from './price-intelligence';

// Semantic Search API
export {
  SemanticSearchEngine,
  type SearchOptions,
  type HybridSearchOptions,
  type SearchResult
} from './search';

export {
  ProductIndexer,
  type IndexOptions,
  type IndexResult,
  type BulkIndexResult,
  type Product
} from './indexer';

// ============================================================================
// Database & Core Infrastructure Exports
// ============================================================================

export {
  VectorStore,
  EmbeddingService,
  createVectorDatabase,
  CollectionName,
  COLLECTION_CONFIGS,
} from '../database/index.js';

export type {
  VectorStoreConfig,
  InsertOptions,
  SearchOptions as VectorSearchOptions,
  SearchResult as VectorSearchResult,
  EmbeddingOptions,
  EmbeddingResult,
  BaseDocument,
  ProductDocument,
  ReviewDocument,
  SupplierDocument,
  TrendDocument,
  CollectionDocument,
  CollectionConfig,
} from '../database/index.js';

// ============================================================================
// Intelligence Modules Exports
// ============================================================================

// Pricing Intelligence
export {
  PriceTracker,
  PriceAnalyzer,
  PricePredictor,
  PriceAlertService,
  createPriceIntelligence,
} from '../intelligence/pricing/index.js';

export type {
  PricePoint,
  PriceHistory,
  PriceVelocity,
  PriceIntelligenceSystem,
} from '../intelligence/pricing/index.js';

// Trend Analysis
export {
  TrendDetector,
  DemandForecaster,
  MarketSignalService,
  CategoryAnalyzer,
} from '../intelligence/trends/index.js';

// Sentiment Analysis
export {
  SentimentAnalyzer,
  ReviewProcessor,
  AspectExtractor,
  InsightGenerator,
} from '../intelligence/sentiment/index.js';

// ============================================================================
// Matching & Deduplication Exports
// ============================================================================

export {
  SimilarityScorer,
  ProductMatcher,
  DeduplicationService,
  CatalogMerger,
  createMatchingPipeline,
} from '../matching/index.js';

// ============================================================================
// Demo Functions Exports
// ============================================================================

export {
  demo_search,
  demo_recommendations,
  demo_categorization,
  demo_pricing,
  demo_sentiment,
  runAllDemos,
} from './demo.js';

// ============================================================================
// Unified RuVector Client
// ============================================================================

/**
 * Unified client for RuVector-powered EcommerceIQ
 * Provides access to all core features through a single interface
 */
export class RuVectorClient {
  public vectorStore: any;
  public embeddings: any;
  public search?: any;
  public pricing?: any;
  public trends?: any;
  public sentiment?: any;
  public matching?: any;
  public recommendations?: any;

  constructor(config?: {
    dataPath?: string;
    embeddingModel?: string;
    maxRetries?: number;
  }) {
    // Initialize core services
    const { createVectorDatabase } = require('../database/index.js');
    const { vectorStore, embeddingService } = createVectorDatabase(config);
    this.vectorStore = vectorStore;
    this.embeddings = embeddingService;
  }

  /**
   * Initialize all services
   */
  async initializeAll(config?: any) {
    // Initialize search
    const { SemanticSearchEngine: SearchEngine } = require('./search.js');
    this.search = new SearchEngine();

    // Initialize recommendations
    const { RecommendationEngine } = require('./recommendations.js');
    this.recommendations = new RecommendationEngine();

    // Initialize pricing intelligence
    const { createPriceIntelligence } = require('../intelligence/pricing/index.js');
    this.pricing = createPriceIntelligence(this.embeddings, config?.pricing);

    // Initialize trend analysis
    const { TrendDetector, DemandForecaster, MarketSignalService, CategoryAnalyzer } = require('../intelligence/trends/index.js');
    this.trends = {
      detector: new TrendDetector(config?.trends?.detector),
      forecaster: new DemandForecaster(config?.trends?.forecaster),
      signals: new MarketSignalService(config?.trends?.signals),
      categoryAnalyzer: new CategoryAnalyzer(config?.trends?.categoryAnalyzer),
    };

    // Initialize sentiment analysis
    const { SentimentAnalyzer, ReviewProcessor, AspectExtractor, InsightGenerator } = require('../intelligence/sentiment/index.js');
    this.sentiment = {
      analyzer: new SentimentAnalyzer(config?.sentiment?.analyzer),
      processor: new ReviewProcessor(config?.sentiment?.processor),
      aspects: new AspectExtractor(config?.sentiment?.aspects),
      insights: new InsightGenerator(config?.sentiment?.insights),
    };

    // Initialize matching
    const { createMatchingPipeline } = require('../matching/index.js');
    this.matching = createMatchingPipeline(config?.matching);

    return this;
  }
}

/**
 * Create a fully initialized RuVector client
 */
export async function createRuVectorClient(config?: {
  dataPath?: string;
  embeddingModel?: string;
  maxRetries?: number;
  [key: string]: any;
}): Promise<RuVectorClient> {
  const client = new RuVectorClient({
    dataPath: config?.dataPath,
    embeddingModel: config?.embeddingModel,
    maxRetries: config?.maxRetries,
  });

  await client.initializeAll(config);

  return client;
}
