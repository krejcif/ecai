/**
 * Product matching across different data sources
 */

import { SimilarityScorer, ScoringConfig, SimilarityScore } from './similarity-scorer';
import { ProductDocument } from '../database/collections';

export interface MatchResult {
  product1: ProductDocument;
  product2: ProductDocument;
  score: SimilarityScore;
  isMatch: boolean;
  matchType: 'exact' | 'high_confidence' | 'probable' | 'possible';
  variations?: VariationInfo;
}

export interface VariationInfo {
  type: 'size' | 'color' | 'pack' | 'bundle' | 'edition' | 'other';
  detected: boolean;
  attributes: Record<string, any>;
}

export interface BatchMatchOptions {
  batchSize?: number;
  parallelism?: number;
  progressCallback?: (processed: number, total: number) => void;
}

export interface MatchingOptions {
  threshold?: number;
  includeVariations?: boolean;
  maxMatches?: number;
  sources?: string[];
}

/**
 * Extract variation indicators from product name/description
 */
function extractVariations(product: ProductDocument): VariationInfo {
  const text = `${product.name} ${product.description || ''}`.toLowerCase();

  // Size patterns
  const sizePatterns = [
    /\b(\d+(?:\.\d+)?)\s*(oz|ml|l|g|kg|lb|fl oz|gallon|qt)\b/i,
    /\b(small|medium|large|xl|xxl|s|m|l)\b/i,
    /\b(\d+(?:\.\d+)?)\s*(inch|in|ft|cm|mm)\b/i
  ];

  // Color patterns
  const colorPatterns = [
    /\b(red|blue|green|yellow|black|white|purple|orange|pink|brown|gray|grey|silver|gold)\b/i,
    /color:\s*([a-z]+)/i
  ];

  // Pack patterns
  const packPatterns = [
    /\b(\d+)\s*pack\b/i,
    /\b(\d+)\s*count\b/i,
    /\bpack of (\d+)\b/i,
    /\b(\d+)\s*ct\b/i
  ];

  // Bundle patterns
  const bundlePatterns = [
    /\bbundle\b/i,
    /\bset of\b/i,
    /\bcombo\b/i,
    /\bkit\b/i
  ];

  // Edition patterns
  const editionPatterns = [
    /\b(deluxe|premium|standard|basic|professional|pro|lite)\b/i,
    /\bedition:\s*([a-z]+)/i
  ];

  const attributes: Record<string, any> = {};
  let type: VariationInfo['type'] = 'other';
  let detected = false;

  // Check for sizes
  for (const pattern of sizePatterns) {
    const match = text.match(pattern);
    if (match) {
      attributes.size = match[0];
      type = 'size';
      detected = true;
      break;
    }
  }

  // Check for colors
  for (const pattern of colorPatterns) {
    const match = text.match(pattern);
    if (match) {
      attributes.color = match[1];
      type = 'color';
      detected = true;
      break;
    }
  }

  // Check for packs
  for (const pattern of packPatterns) {
    const match = text.match(pattern);
    if (match) {
      attributes.pack = parseInt(match[1]);
      type = 'pack';
      detected = true;
      break;
    }
  }

  // Check for bundles
  for (const pattern of bundlePatterns) {
    const match = text.match(pattern);
    if (match) {
      attributes.bundle = true;
      type = 'bundle';
      detected = true;
      break;
    }
  }

  // Check for editions
  for (const pattern of editionPatterns) {
    const match = text.match(pattern);
    if (match) {
      attributes.edition = match[1];
      type = 'edition';
      detected = true;
      break;
    }
  }

  return {
    type,
    detected,
    attributes
  };
}

/**
 * Normalize product name for variation matching
 */
function normalizeProductName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove size indicators
  normalized = normalized.replace(/\b\d+(?:\.\d+)?\s*(oz|ml|l|g|kg|lb|fl oz|gallon|qt|inch|in|ft|cm|mm)\b/gi, '');

  // Remove color indicators
  normalized = normalized.replace(/\b(red|blue|green|yellow|black|white|purple|orange|pink|brown|gray|grey|silver|gold)\b/gi, '');

  // Remove pack indicators
  normalized = normalized.replace(/\b\d+\s*(pack|count|ct)\b/gi, '');
  normalized = normalized.replace(/\bpack of \d+\b/gi, '');

  // Remove edition indicators
  normalized = normalized.replace(/\b(deluxe|premium|standard|basic|professional|pro|lite)\b/gi, '');

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Check if two products are variations of the same base product
 */
function areVariations(product1: ProductDocument, product2: ProductDocument): boolean {
  const norm1 = normalizeProductName(product1.name);
  const norm2 = normalizeProductName(product2.name);

  // If normalized names are very similar, they're likely variations
  const similarity = SimilarityScorer.fuzzyMatch(norm1, norm2);
  return similarity >= 0.85;
}

export class ProductMatcher {
  private scorer: SimilarityScorer;
  private config: ScoringConfig;

  constructor(config?: ScoringConfig) {
    this.config = config || SimilarityScorer.getDefaultProductConfig();
    this.scorer = new SimilarityScorer(this.config);
  }

  /**
   * Match a single product against a candidate
   */
  matchProduct(
    product: ProductDocument,
    candidate: ProductDocument,
    options: MatchingOptions = {}
  ): MatchResult | null {
    const threshold = options.threshold || this.config.threshold || 0.7;

    // Quick filter by source if specified
    if (options.sources && options.sources.length > 0) {
      if (!options.sources.includes(candidate.source)) {
        return null;
      }
    }

    // Check for exact identifier matches first (UPC, EAN, etc.)
    const exactMatch = this.checkExactMatch(product, candidate);
    if (exactMatch) {
      const score: SimilarityScore = {
        overall: 1.0,
        fieldScores: { identifier: 1.0 },
        confidence: 1.0
      };

      return {
        product1: product,
        product2: candidate,
        score,
        isMatch: true,
        matchType: 'exact'
      };
    }

    // Calculate similarity score
    const score = this.scorer.calculateSimilarity(product, candidate);

    // Determine if it's a match
    const isMatch = score.overall >= threshold;

    if (!isMatch) {
      return null;
    }

    // Determine match type based on confidence and score
    let matchType: MatchResult['matchType'];
    if (score.overall >= 0.95) {
      matchType = 'high_confidence';
    } else if (score.overall >= 0.85) {
      matchType = 'probable';
    } else {
      matchType = 'possible';
    }

    // Check for product variations
    let variations: VariationInfo | undefined;
    if (options.includeVariations && areVariations(product, candidate)) {
      variations = {
        type: 'other',
        detected: true,
        attributes: {
          variation1: extractVariations(product),
          variation2: extractVariations(candidate)
        }
      };
    }

    return {
      product1: product,
      product2: candidate,
      score,
      isMatch,
      matchType,
      variations
    };
  }

  /**
   * Find all matches for a product in a list of candidates
   */
  findMatches(
    product: ProductDocument,
    candidates: ProductDocument[],
    options: MatchingOptions = {}
  ): MatchResult[] {
    const matches: MatchResult[] = [];

    for (const candidate of candidates) {
      // Skip matching against itself
      if (product.id === candidate.id) {
        continue;
      }

      const match = this.matchProduct(product, candidate, options);
      if (match) {
        matches.push(match);
      }

      // Stop if we've reached max matches
      if (options.maxMatches && matches.length >= options.maxMatches) {
        break;
      }
    }

    // Sort by score (descending)
    matches.sort((a, b) => b.score.overall - a.score.overall);

    return matches;
  }

  /**
   * Match products across two datasets
   */
  matchDatasets(
    dataset1: ProductDocument[],
    dataset2: ProductDocument[],
    options: MatchingOptions = {}
  ): Map<string, MatchResult[]> {
    const matchMap = new Map<string, MatchResult[]>();

    for (const product of dataset1) {
      const matches = this.findMatches(product, dataset2, options);
      if (matches.length > 0) {
        matchMap.set(product.id, matches);
      }
    }

    return matchMap;
  }

  /**
   * Batch match products with progress tracking
   */
  async batchMatch(
    products: ProductDocument[],
    candidates: ProductDocument[],
    options: MatchingOptions & BatchMatchOptions = {}
  ): Promise<Map<string, MatchResult[]>> {
    const batchSize = options.batchSize || 100;
    const matchMap = new Map<string, MatchResult[]>();

    let processed = 0;
    const total = products.length;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      // Process batch
      for (const product of batch) {
        const matches = this.findMatches(product, candidates, options);
        if (matches.length > 0) {
          matchMap.set(product.id, matches);
        }

        processed++;
        if (options.progressCallback) {
          options.progressCallback(processed, total);
        }
      }

      // Yield to event loop to avoid blocking
      await new Promise(resolve => setImmediate(resolve));
    }

    return matchMap;
  }

  /**
   * Match products using vector similarity
   */
  matchByVector(
    product: ProductDocument,
    candidates: ProductDocument[],
    threshold: number = 0.8
  ): MatchResult[] {
    if (!product.vector) {
      return [];
    }

    const matches: MatchResult[] = [];

    for (const candidate of candidates) {
      if (product.id === candidate.id || !candidate.vector) {
        continue;
      }

      const vectorScore = SimilarityScorer.vectorSimilarity(product.vector, candidate.vector);

      if (vectorScore >= threshold) {
        const score: SimilarityScore = {
          overall: vectorScore,
          fieldScores: { vector: vectorScore },
          confidence: vectorScore
        };

        matches.push({
          product1: product,
          product2: candidate,
          score,
          isMatch: true,
          matchType: vectorScore >= 0.95 ? 'high_confidence' : 'probable'
        });
      }
    }

    // Sort by vector score
    matches.sort((a, b) => b.score.overall - a.score.overall);

    return matches;
  }

  /**
   * Check for exact identifier match (UPC, EAN, SKU, etc.)
   */
  private checkExactMatch(product: ProductDocument, candidate: ProductDocument): boolean {
    const identifierFields = ['upc', 'ean', 'isbn', 'sku', 'asin'];

    for (const field of identifierFields) {
      const value1 = (product.metadata?.[field] as string) || (product as any)[field];
      const value2 = (candidate.metadata?.[field] as string) || (candidate as any)[field];

      if (value1 && value2) {
        if (field === 'upc' || field === 'ean') {
          if (SimilarityScorer.matchProductCode(value1, value2)) {
            return true;
          }
        } else {
          if (value1.toLowerCase() === value2.toLowerCase()) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get match statistics for a set of match results
   */
  getMatchStatistics(matches: MatchResult[]): {
    total: number;
    exact: number;
    highConfidence: number;
    probable: number;
    possible: number;
    averageScore: number;
    averageConfidence: number;
  } {
    const stats = {
      total: matches.length,
      exact: 0,
      highConfidence: 0,
      probable: 0,
      possible: 0,
      averageScore: 0,
      averageConfidence: 0
    };

    if (matches.length === 0) return stats;

    let totalScore = 0;
    let totalConfidence = 0;

    for (const match of matches) {
      totalScore += match.score.overall;
      totalConfidence += match.score.confidence;

      switch (match.matchType) {
        case 'exact':
          stats.exact++;
          break;
        case 'high_confidence':
          stats.highConfidence++;
          break;
        case 'probable':
          stats.probable++;
          break;
        case 'possible':
          stats.possible++;
          break;
      }
    }

    stats.averageScore = totalScore / matches.length;
    stats.averageConfidence = totalConfidence / matches.length;

    return stats;
  }
}
