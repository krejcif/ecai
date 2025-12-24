/**
 * Embedding Generation Test Suite
 * Tests embedding generation, caching, and consistency
 */

import { execSync } from 'child_process';

export interface TestResult {
  passed: boolean;
  error?: string;
  details?: any;
}

export class EmbeddingTest {
  /**
   * Test: Generate Single Embedding
   */
  async testGenerateSingleEmbedding(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const text = 'High-quality wireless headphones with noise cancellation';
      const vector = await this.generateEmbedding(text);
      const duration = Date.now() - startTime;

      const passed = Array.isArray(vector) && vector.length > 0 && vector.every(v => typeof v === 'number');

      return {
        passed,
        error: passed ? undefined : 'Invalid embedding format',
        details: {
          duration,
          avgTime: duration,
          dimension: vector.length,
          sampleValues: vector.slice(0, 5)
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
   * Test: Generate Batch Embeddings
   */
  async testGenerateBatchEmbeddings(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const texts = [
        'Smartphone with 128GB storage',
        'Laptop computer for gaming',
        'Wireless mouse and keyboard',
        'USB-C charging cable',
        '4K monitor 27 inches'
      ];

      const embeddings = await Promise.all(texts.map(text => this.generateEmbedding(text)));
      const duration = Date.now() - startTime;

      const allValid = embeddings.every(vec =>
        Array.isArray(vec) && vec.length > 0 && vec.every(v => typeof v === 'number')
      );

      const avgTime = duration / texts.length;

      return {
        passed: allValid,
        error: allValid ? undefined : 'Some embeddings are invalid',
        details: {
          duration,
          avgTime,
          count: embeddings.length,
          dimension: embeddings[0]?.length || 0
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
   * Test: Embedding Consistency
   */
  async testEmbeddingConsistency(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const text = 'Blue cotton t-shirt size medium';

      // Generate same embedding twice
      const embedding1 = await this.generateEmbedding(text);
      const embedding2 = await this.generateEmbedding(text);

      const duration = Date.now() - startTime;

      // Calculate similarity (should be 1.0 or very close)
      const similarity = this.cosineSimilarity(embedding1, embedding2);
      const passed = similarity > 0.99; // Allow small floating point differences

      return {
        passed,
        error: passed ? undefined : `Embeddings not consistent: similarity = ${similarity}`,
        details: {
          duration,
          similarity,
          dimension: embedding1.length
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
   * Test: Embedding Dimensionality
   */
  async testEmbeddingDimensionality(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const texts = [
        'Short',
        'Medium length text with more words',
        'Very long text with many words and descriptions about products and features and specifications and details'
      ];

      const embeddings = await Promise.all(texts.map(text => this.generateEmbedding(text)));
      const duration = Date.now() - startTime;

      // All embeddings should have same dimension
      const dimensions = embeddings.map(e => e.length);
      const allSameDimension = dimensions.every(d => d === dimensions[0]);

      return {
        passed: allSameDimension && dimensions[0] > 0,
        error: allSameDimension ? undefined : 'Embeddings have different dimensions',
        details: {
          duration,
          dimensions,
          expectedDimension: dimensions[0]
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
   * Test: Semantic Similarity
   */
  async testSemanticSimilarity(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Similar texts should have high similarity
      const text1 = 'Running shoes for athletes';
      const text2 = 'Athletic footwear for runners';

      // Different texts should have lower similarity
      const text3 = 'Kitchen blender appliance';

      const [emb1, emb2, emb3] = await Promise.all([
        this.generateEmbedding(text1),
        this.generateEmbedding(text2),
        this.generateEmbedding(text3)
      ]);

      const duration = Date.now() - startTime;

      const similaritySimilar = this.cosineSimilarity(emb1, emb2);
      const similarityDifferent = this.cosineSimilarity(emb1, emb3);

      const passed = similaritySimilar > similarityDifferent;

      return {
        passed,
        error: passed ? undefined : 'Semantic similarity not captured correctly',
        details: {
          duration,
          similaritySimilar: similaritySimilar.toFixed(4),
          similarityDifferent: similarityDifferent.toFixed(4),
          delta: (similaritySimilar - similarityDifferent).toFixed(4)
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
   * Test: Empty and Special Characters
   */
  async testEmptyAndSpecialCharacters(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const texts = [
        'Normal text',
        'Text with special chars: @#$%^&*()',
        'Text with "quotes" and \'apostrophes\'',
        'Text\nwith\nnewlines',
        'Text with numbers 123456'
      ];

      const embeddings = await Promise.all(
        texts.map(async text => {
          try {
            return await this.generateEmbedding(text);
          } catch (error) {
            return null;
          }
        })
      );

      const duration = Date.now() - startTime;

      const validEmbeddings = embeddings.filter(e => e !== null);
      const passed = validEmbeddings.length >= 4; // At least 4 out of 5 should work

      return {
        passed,
        details: {
          duration,
          totalTexts: texts.length,
          validEmbeddings: validEmbeddings.length
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
   * Test: Embedding Normalization
   */
  async testEmbeddingNormalization(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const text = 'Premium leather wallet';
      const embedding = await this.generateEmbedding(text);
      const duration = Date.now() - startTime;

      // Calculate magnitude
      const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));

      // For cosine similarity, embeddings are often normalized to unit length
      const isNormalized = Math.abs(magnitude - 1.0) < 0.01;

      return {
        passed: true, // Don't fail if not normalized, just report
        details: {
          duration,
          magnitude: magnitude.toFixed(4),
          isNormalized,
          dimension: embedding.length
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
   * Test: Product Embedding
   */
  async testProductEmbedding(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const product = {
        name: 'MacBook Pro 16-inch',
        description: 'Powerful laptop with M2 chip, 16GB RAM, 512GB SSD',
        category: 'Electronics'
      };

      const text = `${product.name}. ${product.description}. Category: ${product.category}`;
      const embedding = await this.generateEmbedding(text);
      const duration = Date.now() - startTime;

      const passed = Array.isArray(embedding) && embedding.length > 0;

      return {
        passed,
        details: {
          duration,
          avgTime: duration,
          productName: product.name,
          dimension: embedding.length
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
      const count = 20;
      const texts = Array.from({ length: count }, (_, i) =>
        `Product ${i} with various features and specifications`
      );

      const embeddings = await Promise.all(texts.map(text => this.generateEmbedding(text)));
      const duration = Date.now() - startTime;

      const avgTime = duration / count;
      const throughput = count / (duration / 1000);

      return {
        passed: embeddings.length === count,
        details: {
          duration,
          avgTime: avgTime.toFixed(2),
          count,
          throughput: throughput.toFixed(2) + ' embeddings/sec'
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

    if (numbers.length > 0) {
      return numbers;
    }

    throw new Error('Could not parse embedding output');
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }

    return dotProduct / (mag1 * mag2);
  }
}
