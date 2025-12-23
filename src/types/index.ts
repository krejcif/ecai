/**
 * Shared TypeScript types for the E-Commerce Intelligence Platform
 */

// ===== Product Types =====

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  url: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
  specifications?: Record<string, string>;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductMetadata {
  source: string;
  sourceId: string;
  scrapedAt: Date;
  lastUpdatedAt: Date;
  quality: 'high' | 'medium' | 'low';
}

export interface ProductSearchResult {
  product: Product;
  score: number;
  matchReason?: string;
}

// ===== Review Types =====

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title?: string;
  content: string;
  verified: boolean;
  helpful?: number;
  createdAt: Date;
  sentiment?: SentimentAnalysis;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  aspects?: AspectSentiment[];
}

export interface AspectSentiment {
  aspect: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  mentions: number;
}

export interface ReviewSummary {
  productId: string;
  totalReviews: number;
  averageRating: number;
  sentiment: SentimentAnalysis;
  topPositives: string[];
  topNegatives: string[];
  aspects: AspectSentiment[];
}

// ===== Supplier Types =====

export interface Supplier {
  id: string;
  name: string;
  website: string;
  email?: string;
  phone?: string;
  location?: Location;
  reliability: number; // 0-100
  rating: number;
  totalProducts: number;
  categories: string[];
  verified: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  country: string;
  region?: string;
  city?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface SupplierMetrics {
  supplierId: string;
  responseTime: number; // in hours
  fulfillmentRate: number; // 0-100
  qualityScore: number; // 0-100
  priceCompetitiveness: number; // 0-100
  lastUpdated: Date;
}

// ===== API Types =====

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface ResponseMetadata {
  timestamp: Date;
  requestId: string;
  duration?: number;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ===== Request Types =====

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  pagination?: PaginationParams;
  sort?: SortParams;
}

export interface SearchFilters {
  category?: string[];
  brand?: string[];
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  inStock?: boolean;
  tags?: string[];
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

export interface AnalysisRequest {
  productId?: string;
  productIds?: string[];
  includeReviews?: boolean;
  includeSentiment?: boolean;
  includeCompetitors?: boolean;
}

// ===== Analysis Types =====

export interface ProductAnalysis {
  product: Product;
  competitors: CompetitorAnalysis[];
  marketPosition: MarketPosition;
  priceAnalysis: PriceAnalysis;
  sentiment?: ReviewSummary;
  recommendations: Recommendation[];
}

export interface CompetitorAnalysis {
  product: Product;
  similarity: number;
  priceDifference: number;
  priceDifferencePercent: number;
  strengths: string[];
  weaknesses: string[];
}

export interface MarketPosition {
  category: string;
  rank: number;
  totalProducts: number;
  percentile: number;
  competitiveness: 'high' | 'medium' | 'low';
}

export interface PriceAnalysis {
  current: number;
  average: number;
  median: number;
  min: number;
  max: number;
  recommendation: 'increase' | 'decrease' | 'maintain';
  optimalPrice?: number;
}

export interface Recommendation {
  type: 'pricing' | 'marketing' | 'inventory' | 'quality' | 'other';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact?: string;
  actionable: boolean;
}

// ===== Search & Matching Types =====

export interface SearchIndex {
  id: string;
  type: 'product' | 'supplier' | 'review';
  fields: string[];
  weights: Record<string, number>;
  lastBuilt: Date;
}

export interface MatchResult {
  id: string;
  score: number;
  type: 'exact' | 'fuzzy' | 'semantic';
  matched_fields: string[];
}

// ===== Intelligence Types =====

export interface MarketTrend {
  category: string;
  trend: 'rising' | 'falling' | 'stable';
  changePercent: number;
  period: string;
  insights: string[];
}

export interface CompetitorInsight {
  competitorId: string;
  competitorName: string;
  strategies: string[];
  strengths: string[];
  weaknesses: string[];
  marketShare?: number;
}

// ===== Configuration Types =====

export interface DatabaseConfig {
  path: string;
  backup?: boolean;
  backupPath?: string;
}

export interface ApiConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  rateLimit: RateLimitConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file?: string;
  console: boolean;
  structured: boolean;
  colorize?: boolean;
}

export interface CacheConfig {
  maxSize: number;
  ttl: number; // in seconds
  enabled: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  circuitBreaker: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number; // in ms
}

// ===== Utility Types =====

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  expiresAt: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
  hitRate: number;
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime?: number;
  nextRetryTime?: number;
}

// ===== Validation Types =====

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ===== Type Guards =====

export function isProduct(obj: unknown): obj is Product {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'price' in obj
  );
}

export function isReview(obj: unknown): obj is Review {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'productId' in obj &&
    'rating' in obj
  );
}

export function isSupplier(obj: unknown): obj is Supplier {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'website' in obj
  );
}

export function isApiResponse<T>(obj: unknown): obj is ApiResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    typeof (obj as ApiResponse).success === 'boolean'
  );
}
