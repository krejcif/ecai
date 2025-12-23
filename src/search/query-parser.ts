/**
 * QueryParser - Parse natural language queries and extract search intent
 */

import { FilterCriteria, PriceRange } from './filters';

export interface ParsedQuery {
  cleanedQuery: string;        // Query with entities removed
  originalQuery: string;        // Original query text
  entities: QueryEntities;      // Extracted entities
  filters: FilterCriteria;      // Auto-generated filters
  searchTerms: string[];        // Individual search terms
  operators: QueryOperators;    // Boolean operators
}

export interface QueryEntities {
  brands?: string[];
  categories?: string[];
  priceRange?: PriceRange;
  colors?: string[];
  sizes?: string[];
  materials?: string[];
  conditions?: string[];
}

export interface QueryOperators {
  and?: string[][];    // Terms that must all appear
  or?: string[][];     // Terms where any can appear
  not?: string[];      // Terms that must not appear
}

export interface ParserConfig {
  enableSynonyms?: boolean;
  enableSpellCheck?: boolean;
  caseSensitive?: boolean;
  minTermLength?: number;
}

/**
 * QueryParser - Extract entities and intent from natural language search queries
 */
export class QueryParser {
  private config: ParserConfig;

  // Synonyms for common terms
  private synonyms: Record<string, string[]> = {
    'phone': ['smartphone', 'mobile', 'cell phone', 'cellphone'],
    'laptop': ['notebook', 'computer', 'pc'],
    'cheap': ['affordable', 'budget', 'inexpensive', 'low cost'],
    'expensive': ['premium', 'luxury', 'high-end'],
    'new': ['latest', 'newest', 'recent', 'modern'],
    'old': ['vintage', 'classic', 'retro'],
    'big': ['large', 'huge', 'oversized'],
    'small': ['compact', 'mini', 'tiny'],
    'good': ['quality', 'excellent', 'great', 'best'],
    'fast': ['quick', 'rapid', 'speedy'],
    'slow': ['sluggish', 'delayed']
  };

  // Common brand names (can be expanded)
  private brandPatterns = [
    'apple', 'samsung', 'sony', 'lg', 'dell', 'hp', 'lenovo', 'asus',
    'microsoft', 'google', 'amazon', 'nike', 'adidas', 'puma',
    'canon', 'nikon', 'panasonic', 'philips', 'bosch'
  ];

  // Category patterns
  private categoryPatterns: Record<string, string[]> = {
    'electronics': ['phone', 'laptop', 'tablet', 'tv', 'camera', 'headphones', 'speaker'],
    'clothing': ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'coat', 'sweater'],
    'home': ['furniture', 'decor', 'kitchen', 'bedroom', 'living room'],
    'sports': ['equipment', 'gear', 'fitness', 'outdoor', 'athletic'],
    'books': ['novel', 'textbook', 'magazine', 'ebook', 'audiobook'],
    'toys': ['game', 'puzzle', 'action figure', 'doll', 'board game']
  };

  // Price-related patterns
  private pricePatterns = {
    under: /(?:under|less than|below|cheaper than|max)\s*\$?(\d+)/i,
    over: /(?:over|more than|above|minimum|min)\s*\$?(\d+)/i,
    range: /\$?(\d+)\s*(?:to|-)\s*\$?(\d+)/i,
    exact: /(?:around|about|approximately)\s*\$?(\d+)/i
  };

  // Color patterns
  private colorPatterns = [
    'red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey',
    'orange', 'purple', 'pink', 'brown', 'silver', 'gold'
  ];

  // Size patterns
  private sizePatterns = [
    'xs', 's', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large',
    'extra small', 'extra large'
  ];

  // Condition patterns
  private conditionPatterns = [
    'new', 'used', 'refurbished', 'renewed', 'open box', 'like new'
  ];

  constructor(config: ParserConfig = {}) {
    this.config = {
      enableSynonyms: true,
      enableSpellCheck: false,
      caseSensitive: false,
      minTermLength: 2,
      ...config
    };
  }

  /**
   * Parse a natural language query
   */
  parse(query: string): ParsedQuery {
    const originalQuery = query;
    let workingQuery = this.config.caseSensitive ? query : query.toLowerCase();

    const entities: QueryEntities = {};
    const filters: FilterCriteria = {};

    // Extract price information
    const priceRange = this.extractPriceRange(workingQuery);
    if (priceRange) {
      entities.priceRange = priceRange;
      filters.priceRange = priceRange;
      workingQuery = this.removePricePatterns(workingQuery);
    }

    // Extract brands
    const brands = this.extractBrands(workingQuery);
    if (brands.length > 0) {
      entities.brands = brands;
      filters.brands = brands;
      brands.forEach(brand => {
        workingQuery = workingQuery.replace(new RegExp(brand, 'gi'), '');
      });
    }

    // Extract categories
    const categories = this.extractCategories(workingQuery);
    if (categories.length > 0) {
      entities.categories = categories;
      filters.categories = categories;
    }

    // Extract colors
    const colors = this.extractColors(workingQuery);
    if (colors.length > 0) {
      entities.colors = colors;
      colors.forEach(color => {
        workingQuery = workingQuery.replace(new RegExp(color, 'gi'), '');
      });
    }

    // Extract sizes
    const sizes = this.extractSizes(workingQuery);
    if (sizes.length > 0) {
      entities.sizes = sizes;
      sizes.forEach(size => {
        workingQuery = workingQuery.replace(new RegExp(`\\b${size}\\b`, 'gi'), '');
      });
    }

    // Extract conditions
    const conditions = this.extractConditions(workingQuery);
    if (conditions.length > 0) {
      entities.conditions = conditions;
      conditions.forEach(condition => {
        workingQuery = workingQuery.replace(new RegExp(condition, 'gi'), '');
      });
    }

    // Extract boolean operators
    const operators = this.extractOperators(workingQuery);

    // Clean up the query
    const cleanedQuery = this.cleanQuery(workingQuery);

    // Extract search terms
    const searchTerms = this.extractSearchTerms(cleanedQuery);

    return {
      cleanedQuery,
      originalQuery,
      entities,
      filters,
      searchTerms,
      operators
    };
  }

  /**
   * Extract price range from query
   */
  private extractPriceRange(query: string): PriceRange | undefined {
    // Check for range pattern
    const rangeMatch = query.match(this.pricePatterns.range);
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1]),
        max: parseInt(rangeMatch[2])
      };
    }

    // Check for under pattern
    const underMatch = query.match(this.pricePatterns.under);
    if (underMatch) {
      return { max: parseInt(underMatch[1]) };
    }

    // Check for over pattern
    const overMatch = query.match(this.pricePatterns.over);
    if (overMatch) {
      return { min: parseInt(overMatch[1]) };
    }

    // Check for exact/around pattern
    const exactMatch = query.match(this.pricePatterns.exact);
    if (exactMatch) {
      const price = parseInt(exactMatch[1]);
      return {
        min: price * 0.8,
        max: price * 1.2
      };
    }

    return undefined;
  }

  /**
   * Remove price patterns from query
   */
  private removePricePatterns(query: string): string {
    let cleaned = query;
    cleaned = cleaned.replace(this.pricePatterns.range, '');
    cleaned = cleaned.replace(this.pricePatterns.under, '');
    cleaned = cleaned.replace(this.pricePatterns.over, '');
    cleaned = cleaned.replace(this.pricePatterns.exact, '');
    return cleaned;
  }

  /**
   * Extract brand names from query
   */
  private extractBrands(query: string): string[] {
    const brands: string[] = [];
    const lowerQuery = query.toLowerCase();

    for (const brand of this.brandPatterns) {
      if (lowerQuery.includes(brand)) {
        brands.push(brand);
      }
    }

    return brands;
  }

  /**
   * Extract categories from query
   */
  private extractCategories(query: string): string[] {
    const categories: string[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [category, keywords] of Object.entries(this.categoryPatterns)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          if (!categories.includes(category)) {
            categories.push(category);
          }
        }
      }
    }

    return categories;
  }

  /**
   * Extract colors from query
   */
  private extractColors(query: string): string[] {
    const colors: string[] = [];
    const lowerQuery = query.toLowerCase();

    for (const color of this.colorPatterns) {
      if (lowerQuery.includes(color)) {
        colors.push(color);
      }
    }

    return colors;
  }

  /**
   * Extract sizes from query
   */
  private extractSizes(query: string): string[] {
    const sizes: string[] = [];
    const lowerQuery = query.toLowerCase();

    for (const size of this.sizePatterns) {
      const pattern = new RegExp(`\\b${size}\\b`, 'i');
      if (pattern.test(lowerQuery)) {
        sizes.push(size);
      }
    }

    return sizes;
  }

  /**
   * Extract condition keywords
   */
  private extractConditions(query: string): string[] {
    const conditions: string[] = [];
    const lowerQuery = query.toLowerCase();

    for (const condition of this.conditionPatterns) {
      if (lowerQuery.includes(condition)) {
        conditions.push(condition);
      }
    }

    return conditions;
  }

  /**
   * Extract boolean operators (AND, OR, NOT)
   */
  private extractOperators(query: string): QueryOperators {
    const operators: QueryOperators = {};

    // Extract NOT terms
    const notPattern = /NOT\s+(\w+)/gi;
    const notMatches = query.match(notPattern);
    if (notMatches) {
      operators.not = notMatches.map(match =>
        match.replace(/NOT\s+/i, '').trim()
      );
    }

    // Extract AND groups
    const andPattern = /(\w+)\s+AND\s+(\w+)/gi;
    const andMatches = Array.from(query.matchAll(andPattern));
    if (andMatches.length > 0) {
      operators.and = andMatches.map(match => [match[1], match[2]]);
    }

    // Extract OR groups
    const orPattern = /(\w+)\s+OR\s+(\w+)/gi;
    const orMatches = Array.from(query.matchAll(orPattern));
    if (orMatches.length > 0) {
      operators.or = orMatches.map(match => [match[1], match[2]]);
    }

    return operators;
  }

  /**
   * Clean the query by removing extra spaces and special characters
   */
  private cleanQuery(query: string): string {
    let cleaned = query;

    // Remove special operators that were already processed
    cleaned = cleaned.replace(/\s+(AND|OR|NOT)\s+/gi, ' ');

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove common stop words (optional)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const words = cleaned.split(' ');
    cleaned = words
      .filter(word => !stopWords.includes(word.toLowerCase()))
      .join(' ');

    return cleaned;
  }

  /**
   * Extract individual search terms
   */
  private extractSearchTerms(query: string): string[] {
    const terms = query
      .split(/\s+/)
      .filter(term => term.length >= (this.config.minTermLength || 2))
      .map(term => term.trim());

    // Apply synonyms if enabled
    if (this.config.enableSynonyms) {
      return this.expandWithSynonyms(terms);
    }

    return terms;
  }

  /**
   * Expand terms with synonyms
   */
  private expandWithSynonyms(terms: string[]): string[] {
    const expanded = new Set<string>(terms);

    for (const term of terms) {
      const lowerTerm = term.toLowerCase();
      for (const [key, synonyms] of Object.entries(this.synonyms)) {
        if (lowerTerm === key || synonyms.includes(lowerTerm)) {
          expanded.add(key);
          synonyms.forEach(syn => expanded.add(syn));
        }
      }
    }

    return Array.from(expanded);
  }

  /**
   * Add custom brand patterns
   */
  addBrands(...brands: string[]): void {
    this.brandPatterns.push(...brands);
  }

  /**
   * Add custom synonyms
   */
  addSynonym(term: string, synonyms: string[]): void {
    this.synonyms[term] = synonyms;
  }

  /**
   * Add custom category patterns
   */
  addCategory(category: string, keywords: string[]): void {
    this.categoryPatterns[category] = keywords;
  }

  /**
   * Generate search suggestions based on query
   */
  generateSuggestions(query: string, maxSuggestions: number = 5): string[] {
    const parsed = this.parse(query);
    const suggestions: string[] = [];

    // Suggest based on extracted entities
    if (parsed.entities.brands && parsed.entities.brands.length > 0) {
      suggestions.push(`${parsed.entities.brands[0]} products`);
    }

    if (parsed.entities.categories && parsed.entities.categories.length > 0) {
      suggestions.push(`${parsed.entities.categories[0]}`);
    }

    if (parsed.entities.priceRange) {
      const { min, max } = parsed.entities.priceRange;
      if (min && max) {
        suggestions.push(`products between $${min} and $${max}`);
      } else if (max) {
        suggestions.push(`products under $${max}`);
      } else if (min) {
        suggestions.push(`products over $${min}`);
      }
    }

    // Add synonym suggestions
    for (const term of parsed.searchTerms) {
      const synonymList = this.synonyms[term.toLowerCase()];
      if (synonymList) {
        synonymList.slice(0, 2).forEach(syn => {
          const suggestion = query.replace(new RegExp(term, 'i'), syn);
          suggestions.push(suggestion);
        });
      }
    }

    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Create a QueryParser instance with custom config
   */
  static create(config?: ParserConfig): QueryParser {
    return new QueryParser(config);
  }
}
