/**
 * Catalog merger for combining multiple product catalogs
 */

import { ProductDocument } from '../database/collections';
import { ProductMatcher, MatchResult } from './product-matcher';
import { DeduplicationService, DeduplicationOptions, MergeStrategy } from './deduplication';
import { ScoringConfig } from './similarity-scorer';

export interface Catalog {
  id: string;
  name: string;
  source: string;
  products: ProductDocument[];
  metadata?: Record<string, any>;
}

export interface MergedCatalog {
  id: string;
  name: string;
  sources: string[];
  products: ProductDocument[];
  mergeSummary: MergeSummary;
  sourceAttribution: Map<string, SourceInfo>;
}

export interface MergeSummary {
  totalProducts: number;
  uniqueProducts: number;
  mergedProducts: number;
  conflicts: number;
  timestamp: string;
  catalogs: Array<{
    source: string;
    productCount: number;
    contribution: number; // percentage
  }>;
}

export interface SourceInfo {
  source: string;
  originalId: string;
  contributedFields: string[];
  quality: number;
}

export interface ConflictRule {
  field: string;
  resolution: 'prefer_source' | 'newest' | 'longest' | 'highest_value' | 'manual';
  preferredSource?: string;
}

export interface MergeOptions {
  deduplicationThreshold?: number;
  strategy?: MergeStrategy;
  sourcePriority?: string[];
  conflictRules?: ConflictRule[];
  preserveAllSources?: boolean;
  includeSourceAttribution?: boolean;
}

/**
 * Resolve field conflict based on rules
 */
function resolveConflict(
  field: string,
  values: Array<{ source: string; value: any; timestamp?: string }>,
  rules: ConflictRule[]
): { source: string; value: any; reason: string } {
  if (values.length === 0) {
    return { source: '', value: undefined, reason: 'no values' };
  }

  if (values.length === 1) {
    return { ...values[0], reason: 'only value' };
  }

  // Find applicable rule
  const rule = rules.find(r => r.field === field || r.field === '*');

  if (!rule) {
    // Default: return first value
    return { ...values[0], reason: 'default (first value)' };
  }

  switch (rule.resolution) {
    case 'prefer_source':
      if (rule.preferredSource) {
        const preferred = values.find(v => v.source === rule.preferredSource);
        if (preferred) {
          return { ...preferred, reason: `preferred source: ${rule.preferredSource}` };
        }
      }
      return { ...values[0], reason: 'preferred source not found, using first' };

    case 'newest':
      const sorted = [...values].sort((a, b) => {
        const timeA = a.timestamp || '0';
        const timeB = b.timestamp || '0';
        return timeB.localeCompare(timeA);
      });
      return { ...sorted[0], reason: 'newest value' };

    case 'longest':
      if (values.every(v => typeof v.value === 'string')) {
        const longest = [...values].sort((a, b) => b.value.length - a.value.length)[0];
        return { ...longest, reason: 'longest value' };
      }
      return { ...values[0], reason: 'not all strings, using first' };

    case 'highest_value':
      if (values.every(v => typeof v.value === 'number')) {
        const highest = [...values].sort((a, b) => b.value - a.value)[0];
        return { ...highest, reason: 'highest value' };
      }
      return { ...values[0], reason: 'not all numbers, using first' };

    case 'manual':
      return { ...values[0], reason: 'manual resolution required, using first' };

    default:
      return { ...values[0], reason: 'unknown rule, using first' };
  }
}

/**
 * Calculate source contribution percentage
 */
function calculateContribution(
  products: ProductDocument[],
  mergedProducts: ProductDocument[],
  source: string
): number {
  let contribution = 0;

  for (const merged of mergedProducts) {
    const sources = merged.metadata?.sources as Array<{ source: string }> | undefined;
    if (sources) {
      const hasContribution = sources.some(s => s.source === source);
      if (hasContribution) {
        contribution += 1 / sources.length; // Weighted by number of sources
      }
    }
  }

  return (contribution / mergedProducts.length) * 100;
}

/**
 * Extract source attribution from merged product
 */
function extractSourceAttribution(product: ProductDocument): Map<string, SourceInfo> {
  const attribution = new Map<string, SourceInfo>();

  const sources = product.metadata?.sources as Array<{
    id: string;
    source: string;
    originalData: ProductDocument;
  }> | undefined;

  if (!sources) {
    // Single source product
    attribution.set(product.id, {
      source: product.source,
      originalId: product.id,
      contributedFields: Object.keys(product).filter(k => k !== 'metadata'),
      quality: 1.0
    });
    return attribution;
  }

  // Multi-source merged product
  for (const sourceInfo of sources) {
    const contributedFields: string[] = [];

    // Check which fields came from this source
    for (const field of Object.keys(sourceInfo.originalData)) {
      if (field === 'metadata' || field === 'id') continue;

      const mergedValue = (product as any)[field];
      const sourceValue = (sourceInfo.originalData as any)[field];

      if (JSON.stringify(mergedValue) === JSON.stringify(sourceValue)) {
        contributedFields.push(field);
      }
    }

    attribution.set(sourceInfo.id, {
      source: sourceInfo.source,
      originalId: sourceInfo.id,
      contributedFields,
      quality: contributedFields.length / Object.keys(sourceInfo.originalData).length
    });
  }

  return attribution;
}

export class CatalogMerger {
  private matcher: ProductMatcher;
  private deduplicator: DeduplicationService;

  constructor(config?: ScoringConfig) {
    this.matcher = new ProductMatcher(config);
    this.deduplicator = new DeduplicationService(config);
  }

  /**
   * Merge multiple catalogs into a unified catalog
   */
  mergeCatalogs(
    catalogs: Catalog[],
    options: MergeOptions = {}
  ): MergedCatalog {
    if (catalogs.length === 0) {
      throw new Error('Cannot merge empty catalog list');
    }

    const sourcePriority = options.sourcePriority || catalogs.map(c => c.source);
    const conflictRules = options.conflictRules || [];

    // Combine all products from all catalogs
    const allProducts: ProductDocument[] = [];
    const catalogStats = new Map<string, { count: number; products: ProductDocument[] }>();

    for (const catalog of catalogs) {
      allProducts.push(...catalog.products);
      catalogStats.set(catalog.source, {
        count: catalog.products.length,
        products: catalog.products
      });
    }

    // Deduplicate products
    const dedupOptions: DeduplicationOptions = {
      threshold: options.deduplicationThreshold || 0.85,
      strategy: options.strategy || 'most_complete',
      sourcePriority,
      preserveSources: options.preserveAllSources !== false
    };

    const { deduplicated, duplicateGroups, stats } = this.deduplicator.deduplicateProducts(
      allProducts,
      dedupOptions
    );

    // Apply conflict resolution rules
    const resolvedProducts = deduplicated.map(product => {
      const sources = product.metadata?.sources as Array<{
        source: string;
        originalData: ProductDocument;
      }> | undefined;

      if (!sources || sources.length <= 1) {
        return product; // No conflicts to resolve
      }

      const resolved = { ...product };

      // Check each field for conflicts
      const fields = ['name', 'description', 'category', 'price'];
      for (const field of fields) {
        const values = sources.map(s => ({
          source: s.source,
          value: (s.originalData as any)[field],
          timestamp: s.originalData.metadata?.timestamp as string | undefined
        }));

        // Check if there's a conflict (different values)
        const uniqueValues = new Set(values.map(v => JSON.stringify(v.value)));
        if (uniqueValues.size > 1) {
          const resolution = resolveConflict(field, values, conflictRules);
          (resolved as any)[field] = resolution.value;

          // Track conflict resolution
          if (!resolved.metadata!.conflictResolutions) {
            resolved.metadata!.conflictResolutions = [];
          }
          (resolved.metadata!.conflictResolutions as any[]).push({
            field,
            resolution: resolution.reason,
            source: resolution.source
          });
        }
      }

      return resolved;
    });

    // Generate source attribution
    const sourceAttribution = new Map<string, SourceInfo>();
    if (options.includeSourceAttribution !== false) {
      for (const product of resolvedProducts) {
        const attribution = extractSourceAttribution(product);
        for (const [id, info] of attribution) {
          sourceAttribution.set(id, info);
        }
      }
    }

    // Calculate contributions
    const catalogContributions = catalogs.map(catalog => {
      const contribution = calculateContribution(
        catalogStats.get(catalog.source)!.products,
        resolvedProducts,
        catalog.source
      );

      return {
        source: catalog.source,
        productCount: catalogStats.get(catalog.source)!.count,
        contribution
      };
    });

    // Count conflicts
    const conflictCount = resolvedProducts.reduce((count, product) => {
      const resolutions = product.metadata?.conflictResolutions as any[] | undefined;
      return count + (resolutions?.length || 0);
    }, 0);

    // Create merged catalog
    const mergedCatalog: MergedCatalog = {
      id: `merged_${Date.now()}`,
      name: `Merged Catalog (${catalogs.map(c => c.name).join(', ')})`,
      sources: catalogs.map(c => c.source),
      products: resolvedProducts,
      mergeSummary: {
        totalProducts: allProducts.length,
        uniqueProducts: resolvedProducts.length,
        mergedProducts: stats.productsMerged,
        conflicts: conflictCount,
        timestamp: new Date().toISOString(),
        catalogs: catalogContributions
      },
      sourceAttribution
    };

    return mergedCatalog;
  }

  /**
   * Merge two catalogs
   */
  mergeTwoCatalogs(
    catalog1: Catalog,
    catalog2: Catalog,
    options: MergeOptions = {}
  ): MergedCatalog {
    return this.mergeCatalogs([catalog1, catalog2], options);
  }

  /**
   * Get unified view of a product across all sources
   */
  getUnifiedProductView(
    productId: string,
    catalogs: Catalog[]
  ): {
    product: ProductDocument | null;
    sources: Array<{ catalog: string; product: ProductDocument }>;
    variations: ProductDocument[];
  } {
    const sources: Array<{ catalog: string; product: ProductDocument }> = [];
    const variations: ProductDocument[] = [];

    // Find product in each catalog
    for (const catalog of catalogs) {
      const product = catalog.products.find(p => p.id === productId);
      if (product) {
        sources.push({ catalog: catalog.source, product });
      }
    }

    if (sources.length === 0) {
      return { product: null, sources: [], variations: [] };
    }

    // Merge all found products
    const merged = this.deduplicator.mergeProducts(
      sources.map(s => s.product),
      { strategy: 'most_complete' }
    );

    // Find variations across all catalogs
    const allProducts = catalogs.flatMap(c => c.products);
    const matches = this.matcher.findMatches(merged, allProducts, {
      threshold: 0.75,
      includeVariations: true,
      maxMatches: 20
    });

    for (const match of matches) {
      if (match.variations?.detected) {
        variations.push(match.product2);
      }
    }

    return {
      product: merged,
      sources,
      variations
    };
  }

  /**
   * Get catalog merge statistics
   */
  getCatalogStats(catalog: Catalog): {
    totalProducts: number;
    categories: Map<string, number>;
    sources: Map<string, number>;
    priceRange: { min: number; max: number; avg: number };
    completeness: number;
  } {
    const categories = new Map<string, number>();
    const sources = new Map<string, number>();
    let totalPrice = 0;
    let priceCount = 0;
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let totalCompleteness = 0;

    for (const product of catalog.products) {
      // Categories
      if (product.category) {
        categories.set(product.category, (categories.get(product.category) || 0) + 1);
      }

      // Sources
      sources.set(product.source, (sources.get(product.source) || 0) + 1);

      // Prices
      if (product.price !== undefined && product.price > 0) {
        totalPrice += product.price;
        priceCount++;
        minPrice = Math.min(minPrice, product.price);
        maxPrice = Math.max(maxPrice, product.price);
      }

      // Completeness
      const fields = ['name', 'description', 'category', 'price'];
      const completed = fields.filter(f => {
        const value = (product as any)[f];
        return value !== undefined && value !== null && value !== '';
      });
      totalCompleteness += completed.length / fields.length;
    }

    return {
      totalProducts: catalog.products.length,
      categories,
      sources,
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === -Infinity ? 0 : maxPrice,
        avg: priceCount > 0 ? totalPrice / priceCount : 0
      },
      completeness: catalog.products.length > 0 ? totalCompleteness / catalog.products.length : 0
    };
  }

  /**
   * Export merged catalog to a specific format
   */
  exportCatalog(
    catalog: MergedCatalog,
    format: 'json' | 'csv' | 'summary' = 'json'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(catalog, null, 2);

      case 'csv':
        const headers = ['id', 'name', 'category', 'price', 'source', 'sources'];
        const rows = catalog.products.map(p => {
          const sources = (p.metadata?.sources as any[])?.map(s => s.source).join('; ') || p.source;
          return [
            p.id,
            p.name,
            p.category,
            p.price,
            p.source,
            sources
          ].map(v => `"${v}"`).join(',');
        });
        return [headers.join(','), ...rows].join('\n');

      case 'summary':
        const summary = {
          name: catalog.name,
          sources: catalog.sources,
          summary: catalog.mergeSummary,
          topCategories: this.getTopCategories(catalog.products, 10),
          priceStats: this.getPriceStatistics(catalog.products)
        };
        return JSON.stringify(summary, null, 2);

      default:
        return JSON.stringify(catalog, null, 2);
    }
  }

  /**
   * Get top categories by product count
   */
  private getTopCategories(products: ProductDocument[], limit: number = 10): Array<{ category: string; count: number }> {
    const categories = new Map<string, number>();

    for (const product of products) {
      if (product.category) {
        categories.set(product.category, (categories.get(product.category) || 0) + 1);
      }
    }

    return Array.from(categories.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get price statistics
   */
  private getPriceStatistics(products: ProductDocument[]): {
    min: number;
    max: number;
    avg: number;
    median: number;
    count: number;
  } {
    const prices = products
      .map(p => p.price)
      .filter(p => p !== undefined && p > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, count: 0 };
    }

    const sum = prices.reduce((a, b) => a + b, 0);
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];

    return {
      min: prices[0],
      max: prices[prices.length - 1],
      avg: sum / prices.length,
      median,
      count: prices.length
    };
  }
}
