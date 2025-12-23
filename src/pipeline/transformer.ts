/**
 * DataTransformer - Normalizes and validates data from different sources
 * Transforms raw data into standardized schemas for database storage
 */

import { z } from 'zod';
import {
  ProductDocument,
  ReviewDocument,
  SupplierDocument,
  TrendDocument,
  CollectionDocument,
} from '../database/collections';

// ============================================================================
// Transformation Schemas
// ============================================================================

export const RawProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  source: z.string(),
  brand: z.string().optional(),
  imageUrl: z.string().url().optional(),
  rating: z.number().min(0).max(5).optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional(),
});

export const RawReviewSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  text: z.string().min(1),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  rating: z.number().min(0).max(5),
  date: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const RawSupplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  location: z.string().min(1),
  riskScore: z.number().min(0).max(100).optional().default(50),
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const RawTrendSchema = z.object({
  id: z.string().optional(),
  keyword: z.string().min(1),
  volume: z.number().nonnegative(),
  growth: z.number(),
  timestamp: z.string(),
  category: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type RawProduct = z.infer<typeof RawProductSchema>;
export type RawReview = z.infer<typeof RawReviewSchema>;
export type RawSupplier = z.infer<typeof RawSupplierSchema>;
export type RawTrend = z.infer<typeof RawTrendSchema>;

export type RawData = RawProduct | RawReview | RawSupplier | RawTrend;

// ============================================================================
// Transformation Result
// ============================================================================

export interface TransformationResult<T = CollectionDocument> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: string[];
  source: string;
  transformedAt: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface EnrichmentContext {
  source: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type EnrichmentHook<T = any> = (
  data: T,
  context: EnrichmentContext
) => Promise<T> | T;

// ============================================================================
// DataTransformer Class
// ============================================================================

export class DataTransformer {
  private enrichmentHooks: Map<string, EnrichmentHook[]> = new Map();
  private transformStats = {
    total: 0,
    successful: 0,
    failed: 0,
    byType: new Map<string, { success: number; failed: number }>(),
  };

  /**
   * Register an enrichment hook for a specific data type
   */
  registerEnrichmentHook(type: string, hook: EnrichmentHook): void {
    const hooks = this.enrichmentHooks.get(type) || [];
    hooks.push(hook);
    this.enrichmentHooks.set(type, hooks);
  }

  /**
   * Transform raw product data to ProductDocument
   */
  async transformProduct(
    rawData: unknown,
    source: string
  ): Promise<TransformationResult<ProductDocument>> {
    this.transformStats.total++;

    try {
      // Validate input
      const validated = RawProductSchema.parse(rawData);

      // Generate ID if not provided
      const id = validated.id || this.generateId(validated.name, source);

      // Create base document
      let product: ProductDocument = {
        id,
        name: this.sanitizeText(validated.name),
        description: this.sanitizeText(validated.description),
        category: this.normalizeCategory(validated.category),
        price: validated.price,
        source,
        metadata: {
          ...validated.metadata,
          brand: validated.brand,
          imageUrl: validated.imageUrl,
          rating: validated.rating,
          tags: validated.tags,
          transformedAt: new Date().toISOString(),
        },
      };

      // Apply enrichment hooks
      product = await this.applyEnrichmentHooks('product', product, { source, timestamp: new Date() });

      this.transformStats.successful++;
      this.updateTypeStats('product', true);

      return {
        success: true,
        data: product,
        source,
        transformedAt: new Date(),
      };
    } catch (error) {
      this.transformStats.failed++;
      this.updateTypeStats('product', false);

      const errors = this.parseZodError(error);
      return {
        success: false,
        errors,
        source,
        transformedAt: new Date(),
      };
    }
  }

  /**
   * Transform raw review data to ReviewDocument
   */
  async transformReview(
    rawData: unknown,
    source: string
  ): Promise<TransformationResult<ReviewDocument>> {
    this.transformStats.total++;

    try {
      const validated = RawReviewSchema.parse(rawData);

      const id = validated.id || this.generateId(validated.productId + validated.text.substring(0, 50), source);

      // Infer sentiment from rating if not provided
      let sentiment = validated.sentiment;
      if (!sentiment) {
        if (validated.rating >= 4) sentiment = 'positive';
        else if (validated.rating <= 2) sentiment = 'negative';
        else sentiment = 'neutral';
      }

      let review: ReviewDocument = {
        id,
        productId: validated.productId,
        text: this.sanitizeText(validated.text),
        sentiment,
        rating: validated.rating,
        date: validated.date,
        metadata: validated.metadata,
      };

      review = await this.applyEnrichmentHooks('review', review, { source, timestamp: new Date() });

      this.transformStats.successful++;
      this.updateTypeStats('review', true);

      return {
        success: true,
        data: review,
        source,
        transformedAt: new Date(),
      };
    } catch (error) {
      this.transformStats.failed++;
      this.updateTypeStats('review', false);

      return {
        success: false,
        errors: this.parseZodError(error),
        source,
        transformedAt: new Date(),
      };
    }
  }

  /**
   * Transform raw supplier data to SupplierDocument
   */
  async transformSupplier(
    rawData: unknown,
    source: string
  ): Promise<TransformationResult<SupplierDocument>> {
    this.transformStats.total++;

    try {
      const validated = RawSupplierSchema.parse(rawData);

      const id = validated.id || this.generateId(validated.name + validated.location, source);

      let supplier: SupplierDocument = {
        id,
        name: this.sanitizeText(validated.name),
        location: validated.location,
        riskScore: validated.riskScore,
        description: validated.description ? this.sanitizeText(validated.description) : undefined,
        capabilities: validated.capabilities,
        metadata: validated.metadata,
      };

      supplier = await this.applyEnrichmentHooks('supplier', supplier, { source, timestamp: new Date() });

      this.transformStats.successful++;
      this.updateTypeStats('supplier', true);

      return {
        success: true,
        data: supplier,
        source,
        transformedAt: new Date(),
      };
    } catch (error) {
      this.transformStats.failed++;
      this.updateTypeStats('supplier', false);

      return {
        success: false,
        errors: this.parseZodError(error),
        source,
        transformedAt: new Date(),
      };
    }
  }

  /**
   * Transform raw trend data to TrendDocument
   */
  async transformTrend(
    rawData: unknown,
    source: string
  ): Promise<TransformationResult<TrendDocument>> {
    this.transformStats.total++;

    try {
      const validated = RawTrendSchema.parse(rawData);

      const id = validated.id || this.generateId(validated.keyword + validated.timestamp, source);

      let trend: TrendDocument = {
        id,
        keyword: validated.keyword,
        volume: validated.volume,
        growth: validated.growth,
        timestamp: validated.timestamp,
        category: validated.category,
        metadata: validated.metadata,
      };

      trend = await this.applyEnrichmentHooks('trend', trend, { source, timestamp: new Date() });

      this.transformStats.successful++;
      this.updateTypeStats('trend', true);

      return {
        success: true,
        data: trend,
        source,
        transformedAt: new Date(),
      };
    } catch (error) {
      this.transformStats.failed++;
      this.updateTypeStats('trend', false);

      return {
        success: false,
        errors: this.parseZodError(error),
        source,
        transformedAt: new Date(),
      };
    }
  }

  /**
   * Batch transform multiple records
   */
  async transformBatch<T extends CollectionDocument>(
    records: unknown[],
    type: 'product' | 'review' | 'supplier' | 'trend',
    source: string
  ): Promise<TransformationResult<T>[]> {
    const transformFn = this.getTransformFunction(type);
    const results: TransformationResult<T>[] = [];

    for (const record of records) {
      const result = await transformFn.call(this, record, source);
      results.push(result as TransformationResult<T>);
    }

    return results;
  }

  /**
   * Apply all registered enrichment hooks for a type
   */
  private async applyEnrichmentHooks<T>(
    type: string,
    data: T,
    context: EnrichmentContext
  ): Promise<T> {
    const hooks = this.enrichmentHooks.get(type) || [];
    let enriched = data;

    for (const hook of hooks) {
      try {
        enriched = await hook(enriched, context);
      } catch (error) {
        console.warn(`Enrichment hook failed for ${type}:`, error);
        // Continue with other hooks even if one fails
      }
    }

    return enriched;
  }

  /**
   * Get the appropriate transform function for a type
   */
  private getTransformFunction(type: string): Function {
    switch (type) {
      case 'product':
        return this.transformProduct;
      case 'review':
        return this.transformReview;
      case 'supplier':
        return this.transformSupplier;
      case 'trend':
        return this.transformTrend;
      default:
        throw new Error(`Unknown transformation type: ${type}`);
    }
  }

  /**
   * Generate a deterministic ID from content
   */
  private generateId(content: string, source: string): string {
    const hash = this.simpleHash(content + source);
    return `${source}-${hash}`;
  }

  /**
   * Simple hash function for ID generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Sanitize text by trimming and removing control characters
   */
  private sanitizeText(text: string): string {
    return text
      .trim()
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Normalize category names
   */
  private normalizeCategory(category: string): string {
    return category
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  /**
   * Parse Zod validation errors
   */
  private parseZodError(error: unknown): ValidationError[] {
    if (error instanceof z.ZodError) {
      return error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.code,
      }));
    }

    return [
      {
        field: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown validation error',
      },
    ];
  }

  /**
   * Update statistics for a specific type
   */
  private updateTypeStats(type: string, success: boolean): void {
    const stats = this.transformStats.byType.get(type) || { success: 0, failed: 0 };
    if (success) {
      stats.success++;
    } else {
      stats.failed++;
    }
    this.transformStats.byType.set(type, stats);
  }

  /**
   * Get transformation statistics
   */
  getStats() {
    return {
      ...this.transformStats,
      byType: Object.fromEntries(this.transformStats.byType),
      successRate:
        this.transformStats.total > 0
          ? (this.transformStats.successful / this.transformStats.total) * 100
          : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.transformStats = {
      total: 0,
      successful: 0,
      failed: 0,
      byType: new Map(),
    };
  }
}
