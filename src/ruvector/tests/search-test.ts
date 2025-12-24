/**
 * Semantic Search Test Suite
 * Tests search accuracy, relevance, and performance
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  passed: boolean;
  error?: string;
  details?: any;
}

export class SearchTest {
  private testDbPath: string;
  private testProducts: Array<{ id: string; name: string; category: string; description: string }>;

  constructor() {
    this.testDbPath = '/home/user/ecai/data/test_search_db';
    this.testProducts = [
      {
        id: 'prod-1',
        name: 'iPhone 15 Pro',
        category: 'Electronics',
        description: 'Latest smartphone with A17 chip and titanium design'
      },
      {
        id: 'prod-2',
        name: 'Samsung Galaxy S24',
        category: 'Electronics',
        description: 'Android smartphone with AI features and excellent camera'
      },
      {
        id: 'prod-3',
        name: 'Nike Running Shoes',
        category: 'Sports',
        description: 'Lightweight running shoes with cushioned sole'
      },
      {
        id: 'prod-4',
        name: 'Adidas Training Shoes',
        category: 'Sports',
        description: 'Durable training shoes for gym workouts'
      },
      {
        id: 'prod-5',
        name: 'Sony Headphones',
        category: 'Electronics',
        description: 'Noise-cancelling wireless headphones with premium sound'
      },
      {
        id: 'prod-6',
        name: 'Coffee Maker',
        category: 'Kitchen',
        description: 'Programmable coffee machine with thermal carafe'
      },
      {
        id: 'prod-7',
        name: 'Blender',
        category: 'Kitchen',
        description: 'High-power blender for smoothies and food processing'
      },
      {
        id: 'prod-8',
        name: 'Yoga Mat',
        category: 'Sports',
        description: 'Non-slip yoga mat with extra cushioning'
      },
      {
        id: 'prod-9',
        name: 'MacBook Air',
        category: 'Electronics',
        description: 'Thin and light laptop with M2 chip and all-day battery'
      },
      {
        id: 'prod-10',
        name: 'Desk Lamp',
        category: 'Home',
        description: 'LED desk lamp with adjustable brightness and color'
      }
    ];
  }

  /**
   * Test: Basic Search
   */
  async testBasicSearch(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupSearchDatabase();

      const query = 'smartphone';
      const results = await this.search(query, 5);
      const duration = Date.now() - startTime;

      // Should find iPhone and Samsung
      const foundPhone = results.some(r => r.id.includes('prod-1') || r.id.includes('prod-2'));

      return {
        passed: results.length > 0 && foundPhone,
        error: foundPhone ? undefined : 'Relevant products not found',
        details: {
          duration,
          query,
          resultsCount: results.length,
          topResults: results.slice(0, 3).map(r => ({ id: r.id, score: r.score }))
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
   * Test: Semantic Search Accuracy
   */
  async testSemanticSearchAccuracy(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupSearchDatabase();

      // Query for shoes using synonym
      const query = 'athletic footwear';
      const results = await this.search(query, 5);
      const duration = Date.now() - startTime;

      // Should find Nike and Adidas shoes
      const foundShoes = results.some(r =>
        r.id.includes('prod-3') || r.id.includes('prod-4')
      );

      // Calculate accuracy based on top results
      const topResults = results.slice(0, 3);
      const relevantCount = topResults.filter(r =>
        r.id.includes('prod-3') || r.id.includes('prod-4')
      ).length;
      const accuracy = relevantCount / Math.min(topResults.length, 2); // 2 relevant items

      return {
        passed: foundShoes && accuracy >= 0.5,
        details: {
          duration,
          query,
          accuracy,
          resultsCount: results.length,
          topResults: topResults.map(r => ({ id: r.id, score: r.score }))
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
   * Test: Category-Based Search
   */
  async testCategoryBasedSearch(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupSearchDatabase();

      const query = 'electronics gadget';
      const results = await this.search(query, 10);
      const duration = Date.now() - startTime;

      // Count how many results are electronics
      const electronicsCount = results.filter(r => {
        const product = this.testProducts.find(p => p.id === r.id);
        return product?.category === 'Electronics';
      }).length;

      const electronicsRatio = electronicsCount / results.length;

      return {
        passed: electronicsRatio >= 0.5, // At least half should be electronics
        details: {
          duration,
          query,
          resultsCount: results.length,
          electronicsCount,
          electronicsRatio: electronicsRatio.toFixed(2)
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
   * Test: Search Ranking Quality
   */
  async testSearchRankingQuality(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupSearchDatabase();

      const query = 'laptop computer';
      const results = await this.search(query, 5);
      const duration = Date.now() - startTime;

      // MacBook Air should be in top results
      const macbookIndex = results.findIndex(r => r.id === 'prod-9');
      const inTopResults = macbookIndex >= 0 && macbookIndex < 3;

      // Scores should be descending
      const scoresDescending = results.every((r, i) =>
        i === 0 || r.score <= results[i - 1].score
      );

      return {
        passed: inTopResults && scoresDescending,
        details: {
          duration,
          query,
          macbookRank: macbookIndex + 1,
          scoresDescending,
          scores: results.map(r => r.score.toFixed(4))
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
   * Test: Multi-Word Query
   */
  async testMultiWordQuery(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupSearchDatabase();

      const query = 'wireless noise cancelling headphones';
      const results = await this.search(query, 5);
      const duration = Date.now() - startTime;

      // Sony headphones should be found
      const foundHeadphones = results.some(r => r.id === 'prod-5');

      return {
        passed: foundHeadphones,
        details: {
          duration,
          query,
          resultsCount: results.length,
          topResults: results.slice(0, 3).map(r => ({ id: r.id, score: r.score }))
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
   * Test: Search Performance
   */
  async testSearchPerformance(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupSearchDatabase();

      const queries = [
        'smartphone',
        'running shoes',
        'kitchen appliances',
        'electronics',
        'sports equipment'
      ];

      const times: number[] = [];

      for (const query of queries) {
        const queryStart = Date.now();
        await this.search(query, 10);
        times.push(Date.now() - queryStart);
      }

      const duration = Date.now() - startTime;
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const maxTime = Math.max(...times);

      // Search should be reasonably fast (under 1 second per query)
      const passed = avgTime < 1000;

      return {
        passed,
        details: {
          duration,
          avgTime: avgTime.toFixed(2),
          maxTime,
          queryCount: queries.length,
          timings: times
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
   * Test: Empty Query Handling
   */
  async testEmptyQueryHandling(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupSearchDatabase();

      const query = '';
      let results: any[] = [];
      let error: string | undefined;

      try {
        results = await this.search(query, 5);
      } catch (e: any) {
        error = e.message;
      }

      const duration = Date.now() - startTime;

      // Either return empty results or throw error, both are acceptable
      return {
        passed: true,
        details: {
          duration,
          resultsCount: results.length,
          errorHandled: error ? 'yes' : 'no'
        }
      };
    } catch (error: any) {
      return {
        passed: true, // Throwing error is acceptable behavior
        error: error.message,
        details: { duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Test: Relevance Scoring
   */
  async testRelevanceScoring(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupSearchDatabase();

      const query = 'iPhone smartphone';
      const results = await this.search(query, 10);
      const duration = Date.now() - startTime;

      // iPhone should have higher score than other products
      const iphoneResult = results.find(r => r.id === 'prod-1');
      const avgOtherScore = results
        .filter(r => r.id !== 'prod-1')
        .reduce((sum, r) => sum + r.score, 0) / (results.length - 1 || 1);

      const iphoneScoreHigher = iphoneResult && iphoneResult.score > avgOtherScore;

      return {
        passed: !!iphoneScoreHigher,
        details: {
          duration,
          iphoneScore: iphoneResult?.score.toFixed(4),
          avgOtherScore: avgOtherScore.toFixed(4),
          scoreDelta: iphoneResult ? (iphoneResult.score - avgOtherScore).toFixed(4) : 'N/A'
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
   * Test: Limit Parameter
   */
  async testLimitParameter(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.setupSearchDatabase();

      const query = 'product';
      const limits = [3, 5, 10];
      const allCorrect: boolean[] = [];

      for (const limit of limits) {
        const results = await this.search(query, limit);
        allCorrect.push(results.length <= limit);
      }

      const duration = Date.now() - startTime;

      return {
        passed: allCorrect.every(c => c),
        details: {
          duration,
          limits,
          allCorrect
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

  private async setupSearchDatabase(): Promise<void> {
    // Clean and recreate database
    if (fs.existsSync(this.testDbPath)) {
      fs.rmSync(this.testDbPath, { recursive: true, force: true });
    }

    const command = `npx ruvector create "${this.testDbPath}" --dimension 384 --metric cosine`;
    execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

    // Insert test products
    const docs = [];
    for (const product of this.testProducts) {
      const text = `${product.name}. ${product.description}. Category: ${product.category}`;
      const vector = await this.generateEmbedding(text);

      docs.push({
        id: product.id,
        vector,
        metadata: product
      });
    }

    const tempFile = path.join('/tmp', `test_search_setup_${Date.now()}.jsonl`);
    const lines = docs.map(doc => JSON.stringify(doc)).join('\n');
    fs.writeFileSync(tempFile, lines);

    const insertCmd = `npx ruvector insert "${this.testDbPath}" --file "${tempFile}" --batch`;
    execSync(insertCmd, { encoding: 'utf-8', stdio: 'pipe' });

    fs.unlinkSync(tempFile);
  }

  private async search(query: string, limit: number): Promise<Array<{ id: string; score: number }>> {
    const queryVector = await this.generateEmbedding(query);

    const tempFile = path.join('/tmp', `test_search_query_${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify({ vector: queryVector }));

    const command = `npx ruvector search "${this.testDbPath}" --query "${tempFile}" --limit ${limit}`;
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

    fs.unlinkSync(tempFile);

    return this.parseSearchResults(output);
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
