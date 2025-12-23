/**
 * Product Matching & Deduplication Module
 *
 * This module provides comprehensive product matching, deduplication,
 * and catalog merging capabilities for e-commerce applications.
 */

// Similarity Scorer
export {
  SimilarityScorer,
  type FieldWeight,
  type SimilarityScore,
  type ScoringConfig
} from './similarity-scorer';

// Product Matcher
export {
  ProductMatcher,
  type MatchResult,
  type VariationInfo,
  type BatchMatchOptions,
  type MatchingOptions
} from './product-matcher';

// Deduplication Service
export {
  DeduplicationService,
  type DuplicateGroup,
  type MergeHistory,
  type ConflictResolution,
  type MergeStrategy,
  type DeduplicationOptions,
  type FieldQuality,
  type DeduplicationStats
} from './deduplication';

// Catalog Merger
export {
  CatalogMerger,
  type Catalog,
  type MergedCatalog,
  type MergeSummary,
  type SourceInfo,
  type ConflictRule,
  type MergeOptions
} from './catalog-merger';

/**
 * Create a default product matching pipeline
 */
export function createMatchingPipeline(config?: {
  threshold?: number;
  sourcePriority?: string[];
}) {
  const scorer = new SimilarityScorer(SimilarityScorer.getDefaultProductConfig());
  const matcher = new ProductMatcher();
  const deduplicator = new DeduplicationService();
  const catalogMerger = new CatalogMerger();

  return {
    scorer,
    matcher,
    deduplicator,
    catalogMerger,
    config: {
      threshold: config?.threshold || 0.7,
      sourcePriority: config?.sourcePriority || []
    }
  };
}

// Re-export commonly used types from product matcher
import { ProductMatcher } from './product-matcher';
import { SimilarityScorer } from './similarity-scorer';
import { DeduplicationService } from './deduplication';
import { CatalogMerger } from './catalog-merger';
