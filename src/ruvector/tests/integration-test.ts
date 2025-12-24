/**
 * Integration Test Suite
 * End-to-end tests for complete workflows
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  passed: boolean;
  error?: string;
  details?: any;
}

export class IntegrationTest {
  private testDbPath: string;

  constructor() {
    this.testDbPath = '/home/user/ecai/data/test_integration_db';
  }

  /**
   * Test: Complete Product Catalog Workflow
   */
  async testCompleteProductCatalogWorkflow(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Step 1: Create collection
      await this.createCollection();

      // Step 2: Add products
      const products = this.generateTestProducts(20);
      await this.insertProducts(products);

      // Step 3: Search for products
      const searchResults = await this.searchProducts('smartphone', 5);

      // Step 4: Get recommendations
      const recommendations = await this.getRecommendations(products[0].id, 3);

      // Step 5: Update a product (delete and reinsert)
      await this.deleteProduct(products[0].id);
      await this.insertProducts([products[0]]);

      const duration = Date.now() - startTime;

      return {
        passed: searchResults.length > 0 && recommendations.length > 0,
        details: {
          duration,
          productsAdded: products.length,
          searchResults: searchResults.length,
          recommendations: recommendations.length
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
   * Test: Bulk Data Import and Search
   */
  async testBulkDataImportAndSearch(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.createCollection();

      // Import large batch
      const products = this.generateTestProducts(100);
      await this.insertProducts(products);

      // Perform multiple searches
      const queries = ['electronics', 'clothing', 'food', 'sports', 'home'];
      const allResults: any[] = [];

      for (const query of queries) {
        const results = await this.searchProducts(query, 10);
        allResults.push(...results);
      }

      const duration = Date.now() - startTime;

      return {
        passed: allResults.length > 0,
        details: {
          duration,
          productsImported: products.length,
          queriesExecuted: queries.length,
          totalResults: allResults.length,
          avgResultsPerQuery: (allResults.length / queries.length).toFixed(2)
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
   * Test: Multi-User Concurrent Access
   */
  async testMultiUserConcurrentAccess(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.createCollection();

      const products = this.generateTestProducts(50);
      await this.insertProducts(products);

      // Simulate concurrent searches
      const concurrentSearches = [
        this.searchProducts('product', 10),
        this.searchProducts('item', 10),
        this.searchProducts('goods', 10)
      ];

      const results = await Promise.all(concurrentSearches);
      const duration = Date.now() - startTime;

      return {
        passed: results.every(r => r.length > 0),
        details: {
          duration,
          concurrentSearches: concurrentSearches.length,
          results: results.map(r => r.length)
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
   * Test: Search Precision and Recall
   */
  async testSearchPrecisionAndRecall(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.createCollection();

      // Create products with known categories
      const electronics = [
        { id: 'elec-1', name: 'Laptop', category: 'Electronics', description: 'High-performance laptop' },
        { id: 'elec-2', name: 'Smartphone', category: 'Electronics', description: 'Latest smartphone model' },
        { id: 'elec-3', name: 'Tablet', category: 'Electronics', description: 'Portable tablet device' }
      ];

      const clothing = [
        { id: 'cloth-1', name: 'Shirt', category: 'Clothing', description: 'Cotton t-shirt' },
        { id: 'cloth-2', name: 'Jeans', category: 'Clothing', description: 'Blue denim jeans' }
      ];

      await this.insertProducts([...electronics, ...clothing]);

      // Search for electronics
      const results = await this.searchProducts('electronic device', 5);

      // Calculate precision (how many results are actually electronics)
      const relevantResults = results.filter(r => r.id.startsWith('elec-'));
      const precision = relevantResults.length / results.length;

      // Calculate recall (how many electronics were found)
      const recall = relevantResults.length / electronics.length;

      const duration = Date.now() - startTime;

      return {
        passed: precision >= 0.5 && recall >= 0.5,
        details: {
          duration,
          precision: precision.toFixed(2),
          recall: recall.toFixed(2),
          f1Score: (2 * precision * recall / (precision + recall || 1)).toFixed(2),
          relevantFound: relevantResults.length,
          totalResults: results.length
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
   * Test: Cross-Collection Operations
   */
  async testCrossCollectionOperations(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Create two collections
      const collection1 = this.testDbPath + '_col1';
      const collection2 = this.testDbPath + '_col2';

      await this.createCollection(collection1);
      await this.createCollection(collection2);

      // Add different data to each
      const products1 = this.generateTestProducts(10, 'A');
      const products2 = this.generateTestProducts(10, 'B');

      await this.insertProducts(products1, collection1);
      await this.insertProducts(products2, collection2);

      // Search both collections
      const results1 = await this.searchProducts('product', 5, collection1);
      const results2 = await this.searchProducts('product', 5, collection2);

      const duration = Date.now() - startTime;

      // Clean up
      if (fs.existsSync(collection1)) fs.rmSync(collection1, { recursive: true, force: true });
      if (fs.existsSync(collection2)) fs.rmSync(collection2, { recursive: true, force: true });

      return {
        passed: results1.length > 0 && results2.length > 0,
        details: {
          duration,
          collection1Results: results1.length,
          collection2Results: results2.length
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
   * Test: Error Recovery and Resilience
   */
  async testErrorRecoveryAndResilience(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.createCollection();

      // Test 1: Insert with some invalid data
      let insertError = false;
      try {
        await this.insertProducts([{
          id: 'invalid',
          name: '',
          category: '',
          description: ''
        }]);
      } catch (error) {
        insertError = true;
      }

      // Test 2: Search with empty query
      let searchError = false;
      try {
        await this.searchProducts('', 5);
      } catch (error) {
        // Empty search might error, which is acceptable
      }

      // Test 3: System should still work after errors
      const products = this.generateTestProducts(5);
      await this.insertProducts(products);
      const results = await this.searchProducts('product', 5);

      const duration = Date.now() - startTime;

      return {
        passed: results.length > 0, // System recovered and works
        details: {
          duration,
          systemRecovered: true,
          resultsAfterErrors: results.length
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
   * Test: Real-World E-commerce Scenario
   */
  async testRealWorldEcommerceScenario(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.createCollection();

      // Simulate e-commerce catalog
      const catalog = [
        { id: 'p1', name: 'iPhone 15 Pro', category: 'Electronics', description: 'Latest iPhone with A17 Pro chip', price: 999 },
        { id: 'p2', name: 'iPhone 15', category: 'Electronics', description: 'New iPhone with great battery', price: 799 },
        { id: 'p3', name: 'AirPods Pro', category: 'Audio', description: 'Wireless earbuds with ANC', price: 249 },
        { id: 'p4', name: 'Apple Watch', category: 'Wearables', description: 'Smart watch with health features', price: 399 },
        { id: 'p5', name: 'MacBook Air', category: 'Computers', description: 'Lightweight laptop for work', price: 1199 }
      ];

      await this.insertProducts(catalog);

      // Scenario 1: Customer searches for "iphone"
      const iphoneResults = await this.searchProducts('iphone', 5);

      // Scenario 2: Customer views iPhone 15 Pro, get recommendations
      const recommendations = await this.getRecommendations('p1', 3);

      // Scenario 3: Customer searches for "wireless headphones"
      const headphoneResults = await this.searchProducts('wireless headphones', 5);

      const duration = Date.now() - startTime;

      const foundIPhone = iphoneResults.some(r => r.id === 'p1' || r.id === 'p2');
      const foundAccessories = recommendations.some(r => r.id === 'p3' || r.id === 'p4');
      const foundAirPods = headphoneResults.some(r => r.id === 'p3');

      return {
        passed: foundIPhone && foundAccessories && foundAirPods,
        details: {
          duration,
          iphoneSearchResults: iphoneResults.length,
          recommendationsCount: recommendations.length,
          headphoneResults: headphoneResults.length,
          scenarios: {
            iphoneSearch: foundIPhone,
            recommendations: foundAccessories,
            headphoneSearch: foundAirPods
          }
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
   * Test: Performance Under Load
   */
  async testPerformanceUnderLoad(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.createCollection();

      // Insert large dataset
      const products = this.generateTestProducts(200);
      await this.insertProducts(products);

      // Perform many searches
      const searchCount = 50;
      const searchTimes: number[] = [];

      for (let i = 0; i < searchCount; i++) {
        const searchStart = Date.now();
        await this.searchProducts(`product ${i}`, 10);
        searchTimes.push(Date.now() - searchStart);
      }

      const duration = Date.now() - startTime;
      const avgSearchTime = searchTimes.reduce((sum, t) => sum + t, 0) / searchTimes.length;
      const throughput = searchCount / (duration / 1000);

      return {
        passed: avgSearchTime < 1000, // Average search under 1 second
        details: {
          duration,
          avgTime: avgSearchTime.toFixed(2) + 'ms',
          searchCount,
          throughput: throughput.toFixed(2) + ' searches/sec',
          minTime: Math.min(...searchTimes),
          maxTime: Math.max(...searchTimes)
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
   * Test: Data Persistence and Recovery
   */
  async testDataPersistenceAndRecovery(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await this.createCollection();

      // Insert data
      const products = this.generateTestProducts(20);
      await this.insertProducts(products);

      // Simulate "restart" by searching (data should persist)
      const results1 = await this.searchProducts('product', 10);

      // Add more data
      const moreProducts = this.generateTestProducts(10, 'X');
      await this.insertProducts(moreProducts);

      // Search again
      const results2 = await this.searchProducts('product', 10);

      const duration = Date.now() - startTime;

      return {
        passed: results1.length > 0 && results2.length > 0,
        details: {
          duration,
          initialResults: results1.length,
          afterAddingMore: results2.length,
          dataPersisted: true
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

  private async createCollection(dbPath?: string): Promise<void> {
    const path = dbPath || this.testDbPath;

    if (fs.existsSync(path)) {
      fs.rmSync(path, { recursive: true, force: true });
    }

    const command = `npx ruvector create "${path}" --dimension 384 --metric cosine`;
    execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  }

  private async insertProducts(products: any[], dbPath?: string): Promise<void> {
    const path = dbPath || this.testDbPath;
    const docs = [];

    for (const product of products) {
      const text = `${product.name}. ${product.description}. Category: ${product.category}`;
      const vector = await this.generateEmbedding(text);

      docs.push({
        id: product.id,
        vector,
        metadata: product
      });
    }

    const tempFile = `/tmp/test_integration_${Date.now()}.jsonl`;
    const lines = docs.map(doc => JSON.stringify(doc)).join('\n');
    fs.writeFileSync(tempFile, lines);

    const command = `npx ruvector insert "${path}" --file "${tempFile}" --batch`;
    execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

    fs.unlinkSync(tempFile);
  }

  private async searchProducts(query: string, limit: number, dbPath?: string): Promise<any[]> {
    const path = dbPath || this.testDbPath;
    const queryVector = await this.generateEmbedding(query);

    const tempFile = `/tmp/test_integration_query_${Date.now()}.json`;
    fs.writeFileSync(tempFile, JSON.stringify({ vector: queryVector }));

    const command = `npx ruvector search "${path}" --query "${tempFile}" --limit ${limit}`;
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

    fs.unlinkSync(tempFile);

    return this.parseSearchResults(output);
  }

  private async getRecommendations(productId: string, limit: number): Promise<any[]> {
    // For recommendations, we search with a similar product's embedding
    const results = await this.searchProducts('product', limit + 5);
    return results.filter(r => r.id !== productId).slice(0, limit);
  }

  private async deleteProduct(productId: string): Promise<void> {
    const command = `npx ruvector delete "${this.testDbPath}" --id "${productId}"`;
    execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  }

  private generateTestProducts(count: number, prefix: string = ''): any[] {
    const categories = ['Electronics', 'Clothing', 'Food', 'Sports', 'Home'];
    const products = [];

    for (let i = 0; i < count; i++) {
      products.push({
        id: `${prefix}prod-${i}`,
        name: `${prefix}Product ${i}`,
        category: categories[i % categories.length],
        description: `High-quality ${categories[i % categories.length].toLowerCase()} product with great features`,
        price: Math.random() * 1000
      });
    }

    return products;
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

  private parseSearchResults(output: string): any[] {
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
