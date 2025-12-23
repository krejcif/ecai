/**
 * FilterBuilder - Build and compose filters for product search
 */

import { ProductDocument } from '../database/collections';

export interface PriceRange {
  min?: number;
  max?: number;
}

export interface RatingFilter {
  min?: number;
  max?: number;
}

export interface FilterCriteria {
  priceRange?: PriceRange;
  categories?: string[];
  brands?: string[];
  rating?: RatingFilter;
  availability?: boolean;
  customAttributes?: Record<string, any>;
  tags?: string[];
  inStock?: boolean;
}

export interface FilterOptions {
  strict?: boolean; // If true, all criteria must match; if false, any criteria can match
  caseSensitive?: boolean;
}

export class FilterBuilder {
  private criteria: FilterCriteria = {};
  private options: FilterOptions = {
    strict: true,
    caseSensitive: false
  };

  /**
   * Set price range filter
   */
  withPriceRange(min?: number, max?: number): this {
    this.criteria.priceRange = { min, max };
    return this;
  }

  /**
   * Filter by categories
   */
  withCategories(...categories: string[]): this {
    this.criteria.categories = categories;
    return this;
  }

  /**
   * Filter by brands
   */
  withBrands(...brands: string[]): this {
    this.criteria.brands = brands;
    return this;
  }

  /**
   * Filter by rating range
   */
  withRating(min?: number, max?: number): this {
    this.criteria.rating = { min, max };
    return this;
  }

  /**
   * Filter by availability
   */
  withAvailability(available: boolean): this {
    this.criteria.availability = available;
    return this;
  }

  /**
   * Filter by stock status
   */
  withInStock(inStock: boolean): this {
    this.criteria.inStock = inStock;
    return this;
  }

  /**
   * Add custom attribute filters
   */
  withCustomAttribute(key: string, value: any): this {
    if (!this.criteria.customAttributes) {
      this.criteria.customAttributes = {};
    }
    this.criteria.customAttributes[key] = value;
    return this;
  }

  /**
   * Filter by tags
   */
  withTags(...tags: string[]): this {
    this.criteria.tags = tags;
    return this;
  }

  /**
   * Set filter options
   */
  withOptions(options: FilterOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Build the filter function
   */
  build(): (product: ProductDocument) => boolean {
    const criteria = this.criteria;
    const options = this.options;

    return (product: ProductDocument): boolean => {
      const checks: boolean[] = [];

      // Price range check
      if (criteria.priceRange) {
        const { min, max } = criteria.priceRange;
        let priceCheck = true;
        if (min !== undefined && product.price < min) {
          priceCheck = false;
        }
        if (max !== undefined && product.price > max) {
          priceCheck = false;
        }
        checks.push(priceCheck);
      }

      // Category check
      if (criteria.categories && criteria.categories.length > 0) {
        const categoryCheck = criteria.categories.some(cat => {
          if (options.caseSensitive) {
            return product.category === cat;
          }
          return product.category.toLowerCase() === cat.toLowerCase();
        });
        checks.push(categoryCheck);
      }

      // Brand check
      if (criteria.brands && criteria.brands.length > 0) {
        const brand = product.metadata?.brand || '';
        const brandCheck = criteria.brands.some(b => {
          if (options.caseSensitive) {
            return brand === b;
          }
          return brand.toLowerCase() === b.toLowerCase();
        });
        checks.push(brandCheck);
      }

      // Rating check
      if (criteria.rating) {
        const { min, max } = criteria.rating;
        const rating = product.metadata?.rating || 0;
        let ratingCheck = true;
        if (min !== undefined && rating < min) {
          ratingCheck = false;
        }
        if (max !== undefined && rating > max) {
          ratingCheck = false;
        }
        checks.push(ratingCheck);
      }

      // Availability check
      if (criteria.availability !== undefined) {
        const available = product.metadata?.available ?? true;
        checks.push(available === criteria.availability);
      }

      // In stock check
      if (criteria.inStock !== undefined) {
        const inStock = product.metadata?.inStock ?? true;
        checks.push(inStock === criteria.inStock);
      }

      // Tags check
      if (criteria.tags && criteria.tags.length > 0) {
        const productTags = product.metadata?.tags || [];
        const tagsCheck = criteria.tags.some(tag =>
          productTags.includes(tag)
        );
        checks.push(tagsCheck);
      }

      // Custom attributes check
      if (criteria.customAttributes) {
        for (const [key, value] of Object.entries(criteria.customAttributes)) {
          const productValue = product.metadata?.[key];
          checks.push(this.matchesValue(productValue, value));
        }
      }

      // Apply strict/loose matching
      if (checks.length === 0) {
        return true; // No filters applied
      }

      return options.strict
        ? checks.every(check => check)
        : checks.some(check => check);
    };
  }

  /**
   * Get current filter criteria
   */
  getCriteria(): FilterCriteria {
    return { ...this.criteria };
  }

  /**
   * Reset all filters
   */
  reset(): this {
    this.criteria = {};
    return this;
  }

  /**
   * Helper method to match values (handles arrays, objects, primitives)
   */
  private matchesValue(productValue: any, filterValue: any): boolean {
    if (productValue === undefined || productValue === null) {
      return false;
    }

    if (Array.isArray(filterValue)) {
      return filterValue.some(fv => this.matchesValue(productValue, fv));
    }

    if (Array.isArray(productValue)) {
      return productValue.some(pv => this.matchesValue(pv, filterValue));
    }

    if (typeof filterValue === 'object' && filterValue !== null) {
      // Deep comparison for objects
      return JSON.stringify(productValue) === JSON.stringify(filterValue);
    }

    return productValue === filterValue;
  }

  /**
   * Create a new FilterBuilder instance
   */
  static create(): FilterBuilder {
    return new FilterBuilder();
  }

  /**
   * Combine multiple filters with AND logic
   */
  static combineAnd(...filters: ((product: ProductDocument) => boolean)[]): (product: ProductDocument) => boolean {
    return (product: ProductDocument) => {
      return filters.every(filter => filter(product));
    };
  }

  /**
   * Combine multiple filters with OR logic
   */
  static combineOr(...filters: ((product: ProductDocument) => boolean)[]): (product: ProductDocument) => boolean {
    return (product: ProductDocument) => {
      return filters.some(filter => filter(product));
    };
  }
}

/**
 * Facet for aggregating filter options
 */
export interface FacetCount {
  value: string;
  count: number;
}

export interface Facets {
  categories: FacetCount[];
  brands: FacetCount[];
  priceRanges: FacetCount[];
  ratings: FacetCount[];
}

/**
 * FacetBuilder - Build facets from search results
 */
export class FacetBuilder {
  /**
   * Build facets from products
   */
  static buildFacets(products: ProductDocument[]): Facets {
    const categories = new Map<string, number>();
    const brands = new Map<string, number>();
    const priceRanges = new Map<string, number>();
    const ratings = new Map<string, number>();

    for (const product of products) {
      // Category facets
      const category = product.category;
      categories.set(category, (categories.get(category) || 0) + 1);

      // Brand facets
      const brand = product.metadata?.brand || 'Unknown';
      brands.set(brand, (brands.get(brand) || 0) + 1);

      // Price range facets
      const priceRange = this.getPriceRange(product.price);
      priceRanges.set(priceRange, (priceRanges.get(priceRange) || 0) + 1);

      // Rating facets
      const rating = product.metadata?.rating || 0;
      const ratingRange = this.getRatingRange(rating);
      ratings.set(ratingRange, (ratings.get(ratingRange) || 0) + 1);
    }

    return {
      categories: this.mapToFacetCounts(categories),
      brands: this.mapToFacetCounts(brands),
      priceRanges: this.mapToFacetCounts(priceRanges),
      ratings: this.mapToFacetCounts(ratings)
    };
  }

  /**
   * Get price range bucket
   */
  private static getPriceRange(price: number): string {
    if (price < 25) return '$0-$25';
    if (price < 50) return '$25-$50';
    if (price < 100) return '$50-$100';
    if (price < 200) return '$100-$200';
    if (price < 500) return '$200-$500';
    return '$500+';
  }

  /**
   * Get rating range bucket
   */
  private static getRatingRange(rating: number): string {
    if (rating >= 4.5) return '4.5+';
    if (rating >= 4.0) return '4.0+';
    if (rating >= 3.0) return '3.0+';
    if (rating >= 2.0) return '2.0+';
    return 'Under 2.0';
  }

  /**
   * Convert map to facet counts array, sorted by count descending
   */
  private static mapToFacetCounts(map: Map<string, number>): FacetCount[] {
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }
}
