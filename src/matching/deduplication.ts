/**
 * Product deduplication service
 */

import { ProductDocument } from '../database/collections';
import { ProductMatcher, MatchResult, MatchingOptions } from './product-matcher';
import { ScoringConfig } from './similarity-scorer';

export interface DuplicateGroup {
  id: string;
  products: ProductDocument[];
  masterProduct?: ProductDocument;
  confidence: number;
  mergedProduct?: ProductDocument;
}

export interface MergeHistory {
  mergeId: string;
  timestamp: string;
  sourceProducts: string[];
  mergedProduct: ProductDocument;
  strategy: MergeStrategy;
  conflicts: ConflictResolution[];
}

export interface ConflictResolution {
  field: string;
  values: Array<{ source: string; value: any }>;
  chosen: { source: string; value: any };
  reason: string;
}

export type MergeStrategy = 'best_source' | 'most_complete' | 'newest' | 'manual';

export interface DeduplicationOptions {
  threshold?: number;
  strategy?: MergeStrategy;
  preserveSources?: boolean;
  sourcePriority?: string[];
}

export interface FieldQuality {
  completeness: number;
  recency: number;
  sourceReliability: number;
}

/**
 * Calculate data quality score for a field value
 */
function calculateFieldQuality(
  value: any,
  source: string,
  sourcePriority: string[] = []
): FieldQuality {
  let completeness = 0;
  let recency = 1.0; // Assume recent if no timestamp
  let sourceReliability = 0.5;

  // Completeness score
  if (value !== undefined && value !== null) {
    if (typeof value === 'string') {
      completeness = value.trim().length > 0 ? 1 : 0;
      // Longer descriptions generally better
      if (value.length > 100) {
        completeness = Math.min(1, completeness * 1.2);
      }
    } else if (Array.isArray(value)) {
      completeness = value.length > 0 ? 1 : 0;
    } else if (typeof value === 'object') {
      completeness = Object.keys(value).length > 0 ? 1 : 0;
    } else {
      completeness = 1;
    }
  }

  // Source reliability based on priority
  if (sourcePriority.length > 0) {
    const index = sourcePriority.indexOf(source);
    if (index !== -1) {
      sourceReliability = 1 - (index / sourcePriority.length);
    }
  }

  return {
    completeness,
    recency,
    sourceReliability
  };
}

/**
 * Select best value from multiple sources
 */
function selectBestValue(
  field: string,
  values: Array<{ source: string; value: any }>,
  sourcePriority: string[] = []
): { source: string; value: any; reason: string } {
  if (values.length === 0) {
    return { source: '', value: undefined, reason: 'no values' };
  }

  if (values.length === 1) {
    return { ...values[0], reason: 'only value' };
  }

  // Remove undefined/null values
  const validValues = values.filter(v => v.value !== undefined && v.value !== null);

  if (validValues.length === 0) {
    return { source: '', value: undefined, reason: 'no valid values' };
  }

  if (validValues.length === 1) {
    return { ...validValues[0], reason: 'only valid value' };
  }

  // Check if all values are the same
  const firstValue = JSON.stringify(validValues[0].value);
  const allSame = validValues.every(v => JSON.stringify(v.value) === firstValue);

  if (allSame) {
    return { ...validValues[0], reason: 'all values identical' };
  }

  // Calculate quality scores for each value
  const scored = validValues.map(v => {
    const quality = calculateFieldQuality(v.value, v.source, sourcePriority);
    const totalScore = quality.completeness * 0.5 +
                       quality.recency * 0.2 +
                       quality.sourceReliability * 0.3;

    return { ...v, score: totalScore, quality };
  });

  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score);

  return {
    source: scored[0].source,
    value: scored[0].value,
    reason: `highest quality score (${scored[0].score.toFixed(2)})`
  };
}

/**
 * Merge metadata objects
 */
function mergeMetadata(...metadataObjects: Array<Record<string, any> | undefined>): Record<string, any> {
  const merged: Record<string, any> = {};

  for (const metadata of metadataObjects) {
    if (!metadata) continue;

    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        // For arrays, concatenate and deduplicate
        if (Array.isArray(value) && Array.isArray(merged[key])) {
          merged[key] = [...new Set([...merged[key], ...value])];
        }
        // For objects, deep merge
        else if (typeof value === 'object' && !Array.isArray(value) && typeof merged[key] === 'object' && !Array.isArray(merged[key])) {
          merged[key] = { ...merged[key], ...value };
        }
        // Otherwise, keep first non-null value
        else if (!(key in merged)) {
          merged[key] = value;
        }
      }
    }
  }

  return merged;
}

export class DeduplicationService {
  private matcher: ProductMatcher;
  private mergeHistory: Map<string, MergeHistory>;

  constructor(config?: ScoringConfig) {
    this.matcher = new ProductMatcher(config);
    this.mergeHistory = new Map();
  }

  /**
   * Find duplicate groups in a product list
   */
  findDuplicates(
    products: ProductDocument[],
    options: DeduplicationOptions = {}
  ): DuplicateGroup[] {
    const threshold = options.threshold || 0.85;
    const duplicateGroups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Skip if already in a group
      if (processed.has(product.id)) continue;

      // Find matches for this product
      const candidates = products.slice(i + 1);
      const matches = this.matcher.findMatches(product, candidates, {
        threshold,
        includeVariations: false
      });

      if (matches.length > 0) {
        // Create duplicate group
        const groupProducts = [product, ...matches.map(m => m.product2)];
        const avgConfidence = matches.reduce((sum, m) => sum + m.score.confidence, 0) / matches.length;

        const group: DuplicateGroup = {
          id: `dup_${Date.now()}_${i}`,
          products: groupProducts,
          confidence: avgConfidence
        };

        duplicateGroups.push(group);

        // Mark all products in group as processed
        groupProducts.forEach(p => processed.add(p.id));
      }
    }

    return duplicateGroups;
  }

  /**
   * Merge duplicate products into a single master record
   */
  mergeProducts(
    products: ProductDocument[],
    options: DeduplicationOptions = {}
  ): ProductDocument {
    if (products.length === 0) {
      throw new Error('Cannot merge empty product list');
    }

    if (products.length === 1) {
      return products[0];
    }

    const strategy = options.strategy || 'most_complete';
    const sourcePriority = options.sourcePriority || [];
    const conflicts: ConflictResolution[] = [];

    // Collect all field values from all products
    const fieldValues = new Map<string, Array<{ source: string; value: any }>>();

    for (const product of products) {
      // Core fields
      const fields = ['name', 'description', 'category', 'price', 'vector'];

      for (const field of fields) {
        if (!fieldValues.has(field)) {
          fieldValues.set(field, []);
        }

        const value = (product as any)[field];
        if (value !== undefined) {
          fieldValues.get(field)!.push({ source: product.source, value });
        }
      }
    }

    // Select best value for each field
    const mergedData: Partial<ProductDocument> = {
      id: products[0].id, // Keep first product's ID
      metadata: {}
    };

    for (const [field, values] of fieldValues.entries()) {
      const best = selectBestValue(field, values, sourcePriority);

      // Track conflict if values differ
      if (values.length > 1 && !values.every(v => JSON.stringify(v.value) === JSON.stringify(best.value))) {
        conflicts.push({
          field,
          values,
          chosen: best,
          reason: best.reason
        });
      }

      // Set the merged value
      (mergedData as any)[field] = best.value;
    }

    // Merge metadata
    mergedData.metadata = mergeMetadata(...products.map(p => p.metadata));

    // Add source tracking if requested
    if (options.preserveSources) {
      mergedData.metadata!.sources = products.map(p => ({
        id: p.id,
        source: p.source,
        originalData: p
      }));
    }

    // Add merge info
    mergedData.metadata!.mergeInfo = {
      mergeCount: products.length,
      sources: [...new Set(products.map(p => p.source))],
      strategy
    };

    const mergedProduct = mergedData as ProductDocument;

    // Record merge history
    const history: MergeHistory = {
      mergeId: `merge_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sourceProducts: products.map(p => p.id),
      mergedProduct,
      strategy,
      conflicts
    };

    this.mergeHistory.set(history.mergeId, history);

    return mergedProduct;
  }

  /**
   * Process duplicate groups and merge them
   */
  deduplicateProducts(
    products: ProductDocument[],
    options: DeduplicationOptions = {}
  ): {
    deduplicated: ProductDocument[];
    duplicateGroups: DuplicateGroup[];
    stats: DeduplicationStats;
  } {
    // Find duplicates
    const duplicateGroups = this.findDuplicates(products, options);

    // Track which products have been merged
    const mergedIds = new Set<string>();
    const deduplicated: ProductDocument[] = [];

    // Merge each duplicate group
    for (const group of duplicateGroups) {
      const merged = this.mergeProducts(group.products, options);
      group.mergedProduct = merged;
      group.masterProduct = merged;

      deduplicated.push(merged);

      // Track merged product IDs
      group.products.forEach(p => mergedIds.add(p.id));
    }

    // Add products that weren't duplicates
    for (const product of products) {
      if (!mergedIds.has(product.id)) {
        deduplicated.push(product);
      }
    }

    // Calculate statistics
    const stats: DeduplicationStats = {
      originalCount: products.length,
      deduplicatedCount: deduplicated.length,
      duplicatesFound: duplicateGroups.length,
      productsMerged: mergedIds.size,
      reductionPercentage: ((mergedIds.size - duplicateGroups.length) / products.length) * 100
    };

    return {
      deduplicated,
      duplicateGroups,
      stats
    };
  }

  /**
   * Get merge history for a product
   */
  getMergeHistory(mergeId: string): MergeHistory | undefined {
    return this.mergeHistory.get(mergeId);
  }

  /**
   * Get all merge history
   */
  getAllMergeHistory(): MergeHistory[] {
    return Array.from(this.mergeHistory.values());
  }

  /**
   * Clear merge history
   */
  clearHistory(): void {
    this.mergeHistory.clear();
  }

  /**
   * Identify best master product in a group (highest quality)
   */
  selectMasterProduct(products: ProductDocument[], sourcePriority: string[] = []): ProductDocument {
    if (products.length === 0) {
      throw new Error('Cannot select master from empty product list');
    }

    if (products.length === 1) {
      return products[0];
    }

    // Score each product based on data completeness and source priority
    const scored = products.map(product => {
      let score = 0;

      // Completeness score
      const fields = ['name', 'description', 'category', 'price', 'vector'];
      const completedFields = fields.filter(f => {
        const value = (product as any)[f];
        return value !== undefined && value !== null && value !== '';
      });
      score += (completedFields.length / fields.length) * 0.5;

      // Metadata completeness
      const metadataSize = product.metadata ? Object.keys(product.metadata).length : 0;
      score += Math.min(metadataSize / 10, 0.3);

      // Source priority
      const sourceIndex = sourcePriority.indexOf(product.source);
      if (sourceIndex !== -1) {
        score += (1 - sourceIndex / sourcePriority.length) * 0.2;
      }

      return { product, score };
    });

    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);

    return scored[0].product;
  }
}

export interface DeduplicationStats {
  originalCount: number;
  deduplicatedCount: number;
  duplicatesFound: number;
  productsMerged: number;
  reductionPercentage: number;
}
