/**
 * CategoryIndex - Vector index for product categories
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EmbeddingService } from '../database/embeddings';

export interface Category {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  parentCategory?: string;
  metadata?: Record<string, any>;
}

export interface CategoryVector {
  categoryId: string;
  category: Category;
  vector: number[];
}

export interface CategoryMatch {
  categoryId: string;
  category: Category;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface CategoryIndexConfig {
  dataPath?: string;
  embeddingService?: EmbeddingService;
  similarityThreshold?: number;
}

/**
 * CategoryIndex - Builds and manages vector index for product categories
 */
export class CategoryIndex {
  private dataPath: string;
  private embeddingService: EmbeddingService;
  private categories: Map<string, Category>;
  private categoryVectors: Map<string, number[]>;
  private indexPath: string;
  private similarityThreshold: number;

  constructor(config: CategoryIndexConfig = {}) {
    this.dataPath = config.dataPath || '/home/user/ecai/data/categories';
    this.embeddingService = config.embeddingService || new EmbeddingService();
    this.categories = new Map();
    this.categoryVectors = new Map();
    this.indexPath = path.join(this.dataPath, 'category_index');
    this.similarityThreshold = config.similarityThreshold ?? 0.6;

    // Ensure data directory exists
    this.ensureDataDirectory();
  }

  /**
   * Build category index from predefined categories
   */
  async buildCategoryIndex(categories: Category[]): Promise<void> {
    console.log(`Building category index with ${categories.length} categories...`);

    // Store categories
    for (const category of categories) {
      this.categories.set(category.id, category);
    }

    // Generate embeddings for each category
    const categoryTexts = categories.map(cat => this.getCategoryText(cat));
    const embeddings = await this.embeddingService.embedBatch(categoryTexts);

    // Store category vectors
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const vector = embeddings[i].vector;
      this.categoryVectors.set(category.id, vector);
    }

    // Create ruvector index
    await this.createVectorIndex();

    // Insert all category vectors into index
    await this.insertCategoryVectors();

    console.log(`Category index built successfully with ${categories.length} categories`);
  }

  /**
   * Match a product vector to the best category
   */
  async matchCategory(productVector: number[]): Promise<CategoryMatch> {
    const matches = await this.matchCategories(productVector, 1);

    if (matches.length === 0) {
      throw new Error('No matching category found');
    }

    return matches[0];
  }

  /**
   * Match a product vector to multiple categories
   */
  async matchCategories(
    productVector: number[],
    limit: number = 5
  ): Promise<CategoryMatch[]> {
    try {
      // Create temporary query file
      const queryFile = path.join(this.dataPath, `query_${Date.now()}.json`);
      fs.writeFileSync(queryFile, JSON.stringify({ vector: productVector }));

      // Search using ruvector CLI
      const command = `npx ruvector search "${this.indexPath}" --query "${queryFile}" --limit ${limit}`;
      const output = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000
      });

      // Clean up query file
      fs.unlinkSync(queryFile);

      // Parse results
      const results = this.parseSearchResults(output);

      // Convert to CategoryMatch objects
      return results.map(result => {
        const category = this.categories.get(result.id);
        if (!category) {
          throw new Error(`Category ${result.id} not found in index`);
        }

        return {
          categoryId: result.id,
          category,
          score: result.score,
          confidence: this.getConfidence(result.score)
        };
      });
    } catch (error) {
      console.error('Error matching categories:', error);
      throw new Error(`Failed to match categories: ${error}`);
    }
  }

  /**
   * Get all categories in the index
   */
  getAllCategories(): Category[] {
    return Array.from(this.categories.values());
  }

  /**
   * Get category by ID
   */
  getCategory(categoryId: string): Category | undefined {
    return this.categories.get(categoryId);
  }

  /**
   * Get category vector
   */
  getCategoryVector(categoryId: string): number[] | undefined {
    return this.categoryVectors.get(categoryId);
  }

  /**
   * Add a new category to the index
   */
  async addCategory(category: Category): Promise<void> {
    // Generate embedding for category
    const categoryText = this.getCategoryText(category);
    const vector = await this.embeddingService.embed(categoryText);

    // Store category and vector
    this.categories.set(category.id, category);
    this.categoryVectors.set(category.id, vector);

    // Insert into vector index
    await this.insertCategoryVector(category.id, vector);

    console.log(`Added category: ${category.name}`);
  }

  /**
   * Remove category from index
   */
  async removeCategory(categoryId: string): Promise<void> {
    try {
      // Remove from maps
      this.categories.delete(categoryId);
      this.categoryVectors.delete(categoryId);

      // Delete from vector index
      const command = `npx ruvector delete "${this.indexPath}" --id "${categoryId}"`;
      execSync(command, {
        encoding: 'utf-8',
        timeout: 10000
      });

      console.log(`Removed category: ${categoryId}`);
    } catch (error) {
      console.error('Error removing category:', error);
      throw new Error(`Failed to remove category: ${error}`);
    }
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<{ totalCategories: number; indexSize: number }> {
    try {
      const command = `npx ruvector stats "${this.indexPath}"`;
      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: 10000
      });

      const stats = JSON.parse(output);

      return {
        totalCategories: this.categories.size,
        indexSize: stats.count || 0
      };
    } catch (error) {
      return {
        totalCategories: this.categories.size,
        indexSize: 0
      };
    }
  }

  /**
   * Rebuild the entire index
   */
  async rebuildIndex(): Promise<void> {
    const categories = Array.from(this.categories.values());
    await this.buildCategoryIndex(categories);
  }

  /**
   * Create the vector index using ruvector CLI
   */
  private async createVectorIndex(): Promise<void> {
    try {
      // Remove existing index if it exists
      if (fs.existsSync(this.indexPath)) {
        fs.rmSync(this.indexPath, { recursive: true, force: true });
      }

      // Create new index
      // Assume 384 dimensions for default embedding model
      const command = `npx ruvector create "${this.indexPath}" --dimension 384 --metric cosine`;
      execSync(command, {
        encoding: 'utf-8',
        timeout: 30000
      });

      console.log('Vector index created');
    } catch (error) {
      throw new Error(`Failed to create vector index: ${error}`);
    }
  }

  /**
   * Insert all category vectors into the index
   */
  private async insertCategoryVectors(): Promise<void> {
    const batchFile = path.join(this.dataPath, 'category_batch.jsonl');
    const lines: string[] = [];

    for (const [categoryId, vector] of this.categoryVectors.entries()) {
      const category = this.categories.get(categoryId)!;
      lines.push(JSON.stringify({
        id: categoryId,
        vector,
        metadata: {
          name: category.name,
          description: category.description,
          keywords: category.keywords
        }
      }));
    }

    fs.writeFileSync(batchFile, lines.join('\n'));

    try {
      const command = `npx ruvector insert "${this.indexPath}" --file "${batchFile}" --batch`;
      execSync(command, {
        encoding: 'utf-8',
        timeout: 60000
      });

      // Clean up batch file
      fs.unlinkSync(batchFile);
    } catch (error) {
      throw new Error(`Failed to insert category vectors: ${error}`);
    }
  }

  /**
   * Insert a single category vector
   */
  private async insertCategoryVector(categoryId: string, vector: number[]): Promise<void> {
    const category = this.categories.get(categoryId)!;
    const tempFile = path.join(this.dataPath, `temp_${Date.now()}.json`);

    const data = {
      id: categoryId,
      vector,
      metadata: {
        name: category.name,
        description: category.description,
        keywords: category.keywords
      }
    };

    fs.writeFileSync(tempFile, JSON.stringify(data));

    try {
      const command = `npx ruvector insert "${this.indexPath}" --file "${tempFile}"`;
      execSync(command, {
        encoding: 'utf-8',
        timeout: 30000
      });

      fs.unlinkSync(tempFile);
    } catch (error) {
      throw new Error(`Failed to insert category vector: ${error}`);
    }
  }

  /**
   * Get text representation of category for embedding
   */
  private getCategoryText(category: Category): string {
    const parts = [
      category.name,
      category.description,
      category.keywords.join(', ')
    ];

    if (category.parentCategory) {
      parts.push(`Parent: ${category.parentCategory}`);
    }

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Parse search results from ruvector CLI output
   */
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
        // Try JSONL format
        results = trimmed
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      }

      return results.map(r => ({
        id: r.id,
        score: r.score || r.distance || 0
      }));
    } catch (error) {
      console.warn('Failed to parse search results:', error);
      return [];
    }
  }

  /**
   * Determine confidence level based on similarity score
   */
  private getConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) {
      return 'high';
    } else if (score >= 0.6) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }

  /**
   * Create a CategoryIndex instance
   */
  static create(config?: CategoryIndexConfig): CategoryIndex {
    return new CategoryIndex(config);
  }
}
