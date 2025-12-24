/**
 * Recommendation Test Suite
 * Tests product recommendations and similarity matching
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  passed: boolean;
  error?: string;
  details?: any;
}

export class RecommendationTest {
  private testDbPath: string;
  private testProducts: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    tags: string[];
  }>;

  constructor() {
    this.testDbPath = '/home/user/ecai/data/test_recommendation_db';
    this.testProducts = [
      {
        id: 'phone-1',
        name: 'iPhone 15 Pro',
        category: 'Smartphones',
        description: 'Premium smartphone with advanced camera',
        tags: ['apple', 'smartphone', 'premium', 'camera']
      },
      {
        id: 'phone-2',
        name: 'iPhone 14',
        category: 'Smartphones',
        description: 'Previous generation iPhone with great performance',
        tags: ['apple', 'smartphone', 'ios']
      },
      {
        id: 'phone-3',
        name: 'Samsung Galaxy S24',
        category: 'Smartphones',
        description: 'Android flagship with AI features',
        tags: ['samsung', 'smartphone', 'android', 'camera']
      },
      {
        id: 'laptop-1',
        name: 'MacBook Pro',
        category: 'Laptops',
        description: 'Professional laptop for developers',
        tags: ['apple', 'laptop', 'professional', 'development']
      },
      {
        id: 'laptop-2',
        name: 'MacBook Air',
        category: 'Laptops',
        description: 'Lightweight laptop for everyday use',
        tags: ['apple', 'laptop', 'portable']
      },
      {
        id: 'tablet-1',
        name: 'iPad Pro',
        category: 'Tablets',
        description: 'Powerful tablet for creative work',
        tags: ['apple', 'tablet', 'creative', 'professional']
      },
      {
        id: 'watch-1',
        name: 'Apple Watch Series 9',
        category: 'Wearables',
        description: 'Smart watch with health tracking',
        tags: ['apple', 'smartwatch', 'health', 'fitness']
      },
      {
        id: 'headphones-1',
        name: 'AirPods Pro',
        category: 'Audio',
        description: 'Wireless earbuds with noise cancellation',
        tags: ['apple', 'audio', 'wireless', 'noise-cancellation']
      },
      {
        id: 'headphones-2',
        name: 'Sony WH-1000XM5',
        category: 'Audio',
        description: 'Premium over-ear headphones',
        tags: ['sony', 'audio', 'wireless', 'noise-cancellation', 'premium']
      },
      {
        id: 'speaker-1',
        name: 'HomePod',
        category: 'Audio',
        description: 'Smart speaker with great sound',
        tags: ['apple', 'audio', 'smart-home', 'speaker']
      }
    ];
  }

  /**
   * Test: Find Similar Products
   */
  async testFindSimilarProducts(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupRecommendationDatabase();

      // Find products similar to iPhone 15 Pro
      const sourceProduct = this.testProducts.find(p => p.id === 'phone-1')!;
      const similar = await this.findSimilar(sourceProduct.id, 5);
      const duration = Date.now() - startTime;

      // Should find other iPhones and smartphones
      const foundSmartphones = similar.filter(s =>
        this.testProducts.find(p => p.id === s.id)?.category === 'Smartphones'
      );

      return {
        passed: foundSmartphones.length >= 2,
        details: {
          duration,
          sourceProduct: sourceProduct.name,
          similarCount: similar.length,
          smartphonesFound: foundSmartphones.length,
          topSimilar: similar.slice(0, 3).map(s => ({
            id: s.id,
            name: this.testProducts.find(p => p.id === s.id)?.name,
            score: s.score.toFixed(4)
          }))
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Category-Based Recommendations
   */
  async testCategoryBasedRecommendations(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupRecommendationDatabase();

      // Find similar to MacBook Pro
      const sourceProduct = this.testProducts.find(p => p.id === 'laptop-1')!;
      const similar = await this.findSimilar(sourceProduct.id, 5);
      const duration = Date.now() - startTime;

      // Should recommend other Apple products and laptops
      const appleProducts = similar.filter(s => {
        const product = this.testProducts.find(p => p.id === s.id);
        return product?.tags.includes('apple');
      });

      return {
        passed: appleProducts.length >= 2,
        details: {
          duration,
          sourceProduct: sourceProduct.name,
          similarCount: similar.length,
          appleProductsFound: appleProducts.length
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Cross-Category Recommendations
   */
  async testCrossCategoryRecommendations(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupRecommendationDatabase();

      // Find similar to iPhone - should include other Apple products
      const sourceProduct = this.testProducts.find(p => p.id === 'phone-1')!;
      const similar = await this.findSimilar(sourceProduct.id, 10);
      const duration = Date.now() - startTime;

      // Should find products from different categories but same brand
      const categories = new Set(
        similar.map(s => this.testProducts.find(p => p.id === s.id)?.category)
      );

      return {
        passed: categories.size >= 2,
        details: {
          duration,
          sourceProduct: sourceProduct.name,
          categoriesFound: categories.size,
          categories: Array.from(categories)
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Recommendation Diversity
   */
  async testRecommendationDiversity(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupRecommendationDatabase();

      const sourceProduct = this.testProducts.find(p => p.id === 'phone-1')!;
      const similar = await this.findSimilar(sourceProduct.id, 5);
      const duration = Date.now() - startTime;

      // Check that recommendations are not all identical
      const uniqueIds = new Set(similar.map(s => s.id));

      return {
        passed: uniqueIds.size === similar.length && !similar.some(s => s.id === sourceProduct.id),
        details: {
          duration,
          totalRecommendations: similar.length,
          uniqueRecommendations: uniqueIds.size,
          sourceExcluded: !similar.some(s => s.id === sourceProduct.id)
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Recommendation Scoring
   */
  async testRecommendationScoring(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupRecommendationDatabase();

      const sourceProduct = this.testProducts.find(p => p.id === 'phone-1')!;
      const similar = await this.findSimilar(sourceProduct.id, 10);
      const duration = Date.now() - startTime;

      // Scores should be in descending order
      const scoresDescending = similar.every((item, i) =>
        i === 0 || item.score <= similar[i - 1].score
      );

      // Scores should be between 0 and 1
      const scoresInRange = similar.every(item => item.score >= 0 && item.score <= 1);

      return {
        passed: scoresDescending && scoresInRange,
        details: {
          duration,
          scoresDescending,
          scoresInRange,
          scores: similar.map(s => s.score.toFixed(4)),
          maxScore: Math.max(...similar.map(s => s.score)).toFixed(4),
          minScore: Math.min(...similar.map(s => s.score)).toFixed(4)
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Complementary Products
   */
  async testComplementaryProducts(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupRecommendationDatabase();

      // For iPhone, should recommend accessories like AirPods, Watch
      const sourceProduct = this.testProducts.find(p => p.id === 'phone-1')!;
      const similar = await this.findSimilar(sourceProduct.id, 10);
      const duration = Date.now() - startTime;

      // Check if accessories are recommended
      const hasAccessories = similar.some(s => {
        const product = this.testProducts.find(p => p.id === s.id);
        return product?.category === 'Audio' || product?.category === 'Wearables';
      });

      return {
        passed: hasAccessories,
        details: {
          duration,
          sourceProduct: sourceProduct.name,
          hasAccessories,
          recommendations: similar.slice(0, 5).map(s => ({
            name: this.testProducts.find(p => p.id === s.id)?.name,
            category: this.testProducts.find(p => p.id === s.id)?.category
          }))
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Batch Recommendations
   */
  async testBatchRecommendations(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupRecommendationDatabase();

      const productIds = ['phone-1', 'laptop-1', 'headphones-1'];
      const allRecommendations: any[] = [];

      for (const productId of productIds) {
        const similar = await this.findSimilar(productId, 3);
        allRecommendations.push(...similar);
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / productIds.length;

      return {
        passed: allRecommendations.length >= productIds.length * 2,
        details: {
          duration,
          avgTime: avgTime.toFixed(2),
          productsProcessed: productIds.length,
          totalRecommendations: allRecommendations.length
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Recommendation Performance
   */
  async testRecommendationPerformance(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupRecommendationDatabase();

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const productId = this.testProducts[i % this.testProducts.length].id;
        const iterStart = Date.now();
        await this.findSimilar(productId, 5);
        times.push(Date.now() - iterStart);
      }

      const duration = Date.now() - startTime;
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const maxTime = Math.max(...times);

      return {
        passed: avgTime < 500, // Should be under 500ms per recommendation
        details: {
          duration,
          avgTime: avgTime.toFixed(2),
          maxTime,
          iterations,
          throughput: (iterations / (duration / 1000)).toFixed(2) + ' recommendations/sec'
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Top-N Recommendations
   */
  async testTopNRecommendations(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupRecommendationDatabase();

      const sourceProduct = this.testProducts.find(p => p.id === 'phone-1')!;
      const limits = [3, 5, 10];
      const results: any[] = [];

      for (const limit of limits) {
        const similar = await this.findSimilar(sourceProduct.id, limit);
        results.push({
          limit,
          actualCount: similar.length,
          correct: similar.length <= limit
        });
      }

      const duration = Date.now() - startTime;
      const allCorrect = results.every(r => r.correct);

      return {
        passed: allCorrect,
        details: {
          duration,
          results
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  // Helper methods

  private async setupRecommendationDatabase(): Promise<void> {
    // Clean and recreate database
    if (fs.existsSync(this.testDbPath)) {
      fs.rmSync(this.testDbPath, { recursive: true, force: true });
    }

    const command = `npx ruvector create "${this.testDbPath}" --dimension 384 --metric cosine`;
    execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

    // Insert test products
    const docs = [];
    for (const product of this.testProducts) {
      const text = `${product.name}. ${product.description}. Category: ${product.category}. Tags: ${product.tags.join(', ')}`;
      const vector = await this.generateEmbedding(text);

      docs.push({
        id: product.id,
        vector,
        metadata: product
      });
    }

    const tempFile = path.join('/tmp', `test_rec_setup_${Date.now()}.jsonl`);
    const lines = docs.map(doc => JSON.stringify(doc)).join('\n');
    fs.writeFileSync(tempFile, lines);

    const insertCmd = `npx ruvector insert "${this.testDbPath}" --file "${tempFile}" --batch`;
    execSync(insertCmd, { encoding: 'utf-8', stdio: 'pipe' });

    fs.unlinkSync(tempFile);
  }

  private async findSimilar(
    productId: string,
    limit: number
  ): Promise<Array<{ id: string; score: number }>> {
    // Get the product's vector
    const product = this.testProducts.find(p => p.id === productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const text = `${product.name}. ${product.description}. Category: ${product.category}. Tags: ${product.tags.join(', ')}`;
    const queryVector = await this.generateEmbedding(text);

    const tempFile = path.join('/tmp', `test_rec_query_${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify({ vector: queryVector }));

    const command = `npx ruvector search "${this.testDbPath}" --query "${tempFile}" --limit ${limit + 1}`;
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

    fs.unlinkSync(tempFile);

    const results = this.parseSearchResults(output);

    // Filter out the source product itself
    return results
      .filter(r => r.id !== productId)
      .slice(0, limit);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');
    const command = `npx ruvector embed "${escapedText}"`;

    const output = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000
    });

    return this.parseEmbeddingOutput(output);
  }

  private parseEmbeddingOutput(output: string): number[] {
    const trimmed = output.trim();

    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }

    if (trimmed.startsWith('{')) {
      const obj = JSON.parse(trimmed);
      return obj.vector || obj.embedding;
    }

    const numbers = trimmed
      .split(/[\s,]+/)
      .map(s => parseFloat(s))
      .filter(n => !isNaN(n));

    return numbers;
  }

  private parseSearchResults(output: string): Array<{ id: string; score: number }> {
    try {
      const trimmed = output.trim();
      let results: any[];

      if (trimmed.startsWith('[')) {
        results = JSON.parse(trimmed);
      } else if (trimmed.startsWith('{')) {
        const obj = JSON.parse(trimmed);
        results = obj.results || obj.matches || [obj];
      } else {
        results = trimmed.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
      }

      return results.map(r => ({
        id: r.id,
        score: r.score || r.distance || 0
      }));
    } catch (error) {
      return [];
    }
  }
}
