/**
 * ProductCategorizer - AI-powered product categorization system
 */

import { EmbeddingService } from '../database/embeddings';
import { CategoryIndex, Category, CategoryMatch } from './category-index';
import { ProductDocument } from '../database/collections';

export interface Product {
  id: string;
  name: string;
  description: string;
  category?: string;
  price?: number;
  metadata?: Record<string, any>;
}

export interface CategorizationResult {
  productId: string;
  suggestedCategory: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  alternatives: Array<{
    category: string;
    score: number;
  }>;
}

export interface MiscategorizedProduct {
  productId: string;
  product: Product;
  currentCategory: string;
  suggestedCategory: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  reason: string;
}

export interface CategoryEmbedding {
  categoryId: string;
  categoryName: string;
  vector: number[];
  productCount?: number;
}

export interface ProductCategorizerConfig {
  embeddingService?: EmbeddingService;
  categoryIndex?: CategoryIndex;
  confidenceThreshold?: number;
  miscategorizedThreshold?: number;
}

/**
 * ProductCategorizer - Automatic product categorization using vector similarity
 */
export class ProductCategorizer {
  private embeddingService: EmbeddingService;
  private categoryIndex: CategoryIndex;
  private confidenceThreshold: number;
  private miscategorizedThreshold: number;
  private productCache: Map<string, Product>;
  private productVectors: Map<string, number[]>;

  constructor(config: ProductCategorizerConfig = {}) {
    this.embeddingService = config.embeddingService || new EmbeddingService();
    this.categoryIndex = config.categoryIndex || CategoryIndex.create();
    this.confidenceThreshold = config.confidenceThreshold ?? 0.7;
    this.miscategorizedThreshold = config.miscategorizedThreshold ?? 0.3;
    this.productCache = new Map();
    this.productVectors = new Map();
  }

  /**
   * Initialize categorizer with predefined categories
   */
  async initialize(categories: Category[]): Promise<void> {
    console.log('Initializing product categorizer...');
    await this.categoryIndex.buildCategoryIndex(categories);
    console.log('Product categorizer initialized');
  }

  /**
   * Categorize a product using vector similarity
   */
  async categorizeProduct(product: Product): Promise<CategorizationResult> {
    // Generate product embedding
    const productText = this.getProductText(product);
    const productVector = await this.embeddingService.embed(productText);

    // Cache product and vector
    this.productCache.set(product.id, product);
    this.productVectors.set(product.id, productVector);

    // Find best matching category
    const matches = await this.categoryIndex.matchCategories(productVector, 5);

    if (matches.length === 0) {
      throw new Error('No matching category found');
    }

    const bestMatch = matches[0];
    const alternatives = matches.slice(1, 5).map(m => ({
      category: m.category.name,
      score: m.score
    }));

    return {
      productId: product.id,
      suggestedCategory: bestMatch.category.name,
      confidence: bestMatch.confidence,
      score: bestMatch.score,
      alternatives
    };
  }

  /**
   * Suggest top matching categories for a product
   */
  async suggestCategories(
    product: Product,
    limit: number = 5
  ): Promise<CategoryMatch[]> {
    // Generate product embedding
    const productText = this.getProductText(product);
    const productVector = await this.embeddingService.embed(productText);

    // Cache product and vector
    this.productCache.set(product.id, product);
    this.productVectors.set(product.id, productVector);

    // Get top matching categories
    const matches = await this.categoryIndex.matchCategories(productVector, limit);

    return matches;
  }

  /**
   * Find products that might be miscategorized
   */
  async findMiscategorized(
    products: Product[]
  ): Promise<MiscategorizedProduct[]> {
    console.log(`Analyzing ${products.length} products for miscategorization...`);

    const miscategorized: MiscategorizedProduct[] = [];

    for (const product of products) {
      if (!product.category) {
        continue; // Skip products without a category
      }

      try {
        // Get categorization suggestion
        const result = await this.categorizeProduct(product);

        // Check if suggested category differs from current category
        const currentCategory = product.category;
        const suggestedCategory = result.suggestedCategory;

        if (currentCategory !== suggestedCategory) {
          // Calculate category mismatch severity
          const categoryMismatch = this.calculateCategoryMismatch(
            currentCategory,
            suggestedCategory,
            result.score
          );

          // Only flag if mismatch is significant
          if (categoryMismatch.shouldFlag) {
            miscategorized.push({
              productId: product.id,
              product,
              currentCategory,
              suggestedCategory,
              confidence: result.confidence,
              score: result.score,
              reason: categoryMismatch.reason
            });
          }
        }
      } catch (error) {
        console.warn(`Error analyzing product ${product.id}:`, error);
      }
    }

    console.log(`Found ${miscategorized.length} potentially miscategorized products`);
    return miscategorized;
  }

  /**
   * Get vector representations of all categories
   */
  async getCategoryEmbeddings(): Promise<CategoryEmbedding[]> {
    const categories = this.categoryIndex.getAllCategories();
    const embeddings: CategoryEmbedding[] = [];

    for (const category of categories) {
      const vector = this.categoryIndex.getCategoryVector(category.id);

      if (vector) {
        embeddings.push({
          categoryId: category.id,
          categoryName: category.name,
          vector,
          productCount: this.getProductCountForCategory(category.name)
        });
      }
    }

    return embeddings;
  }

  /**
   * Batch categorize multiple products
   */
  async categorizeProducts(
    products: Product[]
  ): Promise<CategorizationResult[]> {
    console.log(`Categorizing ${products.length} products...`);

    const results: CategorizationResult[] = [];

    // Process in batches for efficiency
    const batchSize = 10;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(product => this.categorizeProduct(product))
      );
      results.push(...batchResults);

      console.log(`Processed ${Math.min(i + batchSize, products.length)}/${products.length} products`);
    }

    return results;
  }

  /**
   * Get categorization statistics
   */
  getCategoryStats(): {
    totalCategories: number;
    totalProducts: number;
    averageConfidence: number;
  } {
    const totalProducts = this.productCache.size;
    const totalCategories = this.categoryIndex.getAllCategories().length;

    return {
      totalCategories,
      totalProducts,
      averageConfidence: 0 // Would need to track categorization results
    };
  }

  /**
   * Add a new category to the system
   */
  async addCategory(category: Category): Promise<void> {
    await this.categoryIndex.addCategory(category);
  }

  /**
   * Remove a category from the system
   */
  async removeCategory(categoryId: string): Promise<void> {
    await this.categoryIndex.removeCategory(categoryId);
  }

  /**
   * Get all available categories
   */
  getAllCategories(): Category[] {
    return this.categoryIndex.getAllCategories();
  }

  /**
   * Recategorize products after category changes
   */
  async recategorizeAll(): Promise<void> {
    const products = Array.from(this.productCache.values());
    await this.categorizeProducts(products);
  }

  /**
   * Get product text for embedding
   */
  private getProductText(product: Product): string {
    const parts = [
      product.name,
      product.description
    ];

    if (product.category) {
      parts.push(`Category: ${product.category}`);
    }

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Calculate category mismatch severity
   */
  private calculateCategoryMismatch(
    currentCategory: string,
    suggestedCategory: string,
    score: number
  ): { shouldFlag: boolean; reason: string } {
    // High confidence in a different category
    if (score >= 0.8) {
      return {
        shouldFlag: true,
        reason: `High confidence (${(score * 100).toFixed(1)}%) in "${suggestedCategory}" vs current "${currentCategory}"`
      };
    }

    // Medium confidence with significant difference
    if (score >= 0.6) {
      return {
        shouldFlag: true,
        reason: `Medium confidence (${(score * 100).toFixed(1)}%) suggests "${suggestedCategory}" may be more accurate than "${currentCategory}"`
      };
    }

    // Low confidence - don't flag
    return {
      shouldFlag: false,
      reason: 'Confidence too low to flag as miscategorized'
    };
  }

  /**
   * Get product count for a category
   */
  private getProductCountForCategory(categoryName: string): number {
    let count = 0;
    for (const product of this.productCache.values()) {
      if (product.category === categoryName) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.productCache.clear();
    this.productVectors.clear();
  }

  /**
   * Export categorization data for analysis
   */
  exportCategorizationData(): {
    products: Product[];
    categories: Category[];
    stats: any;
  } {
    return {
      products: Array.from(this.productCache.values()),
      categories: this.getAllCategories(),
      stats: this.getCategoryStats()
    };
  }

  /**
   * Create a ProductCategorizer instance
   */
  static create(config?: ProductCategorizerConfig): ProductCategorizer {
    return new ProductCategorizer(config);
  }

  /**
   * Create with default e-commerce categories
   */
  static async createWithDefaultCategories(
    config?: ProductCategorizerConfig
  ): Promise<ProductCategorizer> {
    const categorizer = new ProductCategorizer(config);

    // Define common e-commerce categories
    const defaultCategories: Category[] = [
      {
        id: 'electronics',
        name: 'Electronics',
        description: 'Electronic devices, gadgets, computers, smartphones, tablets, and accessories',
        keywords: ['electronic', 'device', 'computer', 'smartphone', 'tablet', 'laptop', 'headphones', 'camera', 'tv', 'monitor']
      },
      {
        id: 'clothing',
        name: 'Clothing & Apparel',
        description: 'Clothing, fashion, apparel, shoes, and accessories',
        keywords: ['shirt', 'pants', 'dress', 'jacket', 'shoes', 'clothing', 'apparel', 'fashion', 'wear', 'outfit']
      },
      {
        id: 'home',
        name: 'Home & Garden',
        description: 'Home goods, furniture, decor, garden supplies, and household items',
        keywords: ['furniture', 'home', 'decor', 'garden', 'household', 'kitchen', 'bedroom', 'living room', 'outdoor']
      },
      {
        id: 'food',
        name: 'Food & Beverages',
        description: 'Food products, groceries, snacks, drinks, and beverages',
        keywords: ['food', 'drink', 'beverage', 'snack', 'grocery', 'meal', 'organic', 'fresh', 'nutrition']
      },
      {
        id: 'beauty',
        name: 'Beauty & Personal Care',
        description: 'Cosmetics, skincare, haircare, personal hygiene, and beauty products',
        keywords: ['beauty', 'cosmetics', 'skincare', 'makeup', 'haircare', 'personal care', 'hygiene', 'lotion', 'shampoo']
      },
      {
        id: 'sports',
        name: 'Sports & Outdoors',
        description: 'Sports equipment, outdoor gear, fitness products, and athletic wear',
        keywords: ['sports', 'fitness', 'outdoor', 'athletic', 'exercise', 'gym', 'running', 'hiking', 'camping']
      },
      {
        id: 'toys',
        name: 'Toys & Games',
        description: 'Toys, games, puzzles, and children\'s entertainment products',
        keywords: ['toy', 'game', 'puzzle', 'children', 'kids', 'play', 'entertainment', 'board game', 'video game']
      },
      {
        id: 'books',
        name: 'Books & Media',
        description: 'Books, magazines, movies, music, and digital media',
        keywords: ['book', 'magazine', 'movie', 'music', 'media', 'dvd', 'cd', 'audiobook', 'ebook', 'novel']
      },
      {
        id: 'automotive',
        name: 'Automotive',
        description: 'Car parts, accessories, tools, and automotive supplies',
        keywords: ['car', 'auto', 'automotive', 'vehicle', 'parts', 'accessories', 'tools', 'motor', 'engine']
      },
      {
        id: 'office',
        name: 'Office & School Supplies',
        description: 'Office supplies, stationery, school supplies, and organizational products',
        keywords: ['office', 'school', 'supplies', 'stationery', 'pen', 'paper', 'notebook', 'desk', 'organization']
      }
    ];

    await categorizer.initialize(defaultCategories);
    return categorizer;
  }
}
