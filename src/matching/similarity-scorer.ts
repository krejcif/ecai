/**
 * Similarity scoring for product matching
 */

export interface FieldWeight {
  field: string;
  weight: number;
  matchType: 'exact' | 'fuzzy' | 'vector' | 'numeric';
}

export interface SimilarityScore {
  overall: number;
  fieldScores: Record<string, number>;
  confidence: number;
}

export interface ScoringConfig {
  weights: FieldWeight[];
  threshold?: number;
  vectorDimension?: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate normalized similarity score (0-1) from Levenshtein distance
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  if (normalized1 === normalized2) return 1;

  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(normalized1, normalized2);
  return 1 - distance / maxLen;
}

/**
 * Calculate Jaro-Winkler similarity
 */
function jaroWinklerSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  if (normalized1 === normalized2) return 1;

  const len1 = normalized1.length;
  const len2 = normalized2.length;

  if (len1 === 0 || len2 === 0) return 0;

  // Calculate match window
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchWindow < 0) return 0;

  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);

    for (let j = start; j < end; j++) {
      if (matches2[j] || normalized1[i] !== normalized2[j]) continue;
      matches1[i] = true;
      matches2[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) k++;
    if (normalized1[i] !== normalized2[k]) transpositions++;
    k++;
  }

  // Calculate Jaro similarity
  const jaro = (
    matches / len1 +
    matches / len2 +
    (matches - transpositions / 2) / matches
  ) / 3;

  // Calculate prefix length (up to 4 characters)
  let prefixLen = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (normalized1[i] === normalized2[i]) {
      prefixLen++;
    } else {
      break;
    }
  }

  // Calculate Jaro-Winkler similarity
  return jaro + prefixLen * 0.1 * (1 - jaro);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Normalize and compare UPC/EAN codes
 */
function normalizeProductCode(code: string): string {
  if (!code) return '';
  // Remove hyphens, spaces, and convert to uppercase
  return code.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Check if two product codes match (UPC, EAN, ISBN, etc.)
 */
function productCodeMatch(code1: string, code2: string): boolean {
  if (!code1 || !code2) return false;

  const norm1 = normalizeProductCode(code1);
  const norm2 = normalizeProductCode(code2);

  if (norm1 === norm2) return true;

  // Check if one is a subset of the other (e.g., UPC-12 vs UPC-13)
  if (norm1.length !== norm2.length) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    const longer = norm1.length < norm2.length ? norm2 : norm1;

    // Allow matching if shorter code is at the end of longer code
    // (common for UPC-A vs EAN-13)
    return longer.endsWith(shorter);
  }

  return false;
}

/**
 * Calculate numeric similarity (for prices, quantities, etc.)
 */
function numericSimilarity(num1: number, num2: number, tolerance: number = 0.1): number {
  if (num1 === num2) return 1;

  const avg = (Math.abs(num1) + Math.abs(num2)) / 2;
  if (avg === 0) return num1 === num2 ? 1 : 0;

  const diff = Math.abs(num1 - num2);
  const relDiff = diff / avg;

  if (relDiff <= tolerance) {
    return 1 - relDiff / tolerance;
  }

  return 0;
}

/**
 * Token-based similarity (for multi-word fields)
 */
function tokenSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const tokens1 = new Set(str1.toLowerCase().split(/\s+/).filter(t => t.length > 0));
  const tokens2 = new Set(str2.toLowerCase().split(/\s+/).filter(t => t.length > 0));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  // Jaccard similarity
  return intersection.size / union.size;
}

export class SimilarityScorer {
  private config: ScoringConfig;

  constructor(config: ScoringConfig) {
    this.config = config;
  }

  /**
   * Calculate similarity between two objects based on configured weights
   */
  calculateSimilarity(obj1: Record<string, any>, obj2: Record<string, any>): SimilarityScore {
    const fieldScores: Record<string, number> = {};
    let totalWeight = 0;
    let weightedSum = 0;

    for (const { field, weight, matchType } of this.config.weights) {
      const value1 = obj1[field];
      const value2 = obj2[field];

      let score = 0;

      // Skip if both values are missing
      if (value1 === undefined && value2 === undefined) {
        continue;
      }

      // Penalty if only one value is missing
      if (value1 === undefined || value2 === undefined) {
        score = 0;
      } else {
        score = this.calculateFieldSimilarity(value1, value2, matchType);
      }

      fieldScores[field] = score;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    const overall = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const confidence = this.calculateConfidence(fieldScores, overall);

    return {
      overall,
      fieldScores,
      confidence
    };
  }

  /**
   * Calculate similarity for a specific field based on match type
   */
  private calculateFieldSimilarity(value1: any, value2: any, matchType: string): number {
    switch (matchType) {
      case 'exact':
        return value1 === value2 ? 1 : 0;

      case 'fuzzy':
        if (typeof value1 === 'string' && typeof value2 === 'string') {
          // Use Jaro-Winkler for better performance with product names
          const jw = jaroWinklerSimilarity(value1, value2);
          const lev = levenshteinSimilarity(value1, value2);
          const token = tokenSimilarity(value1, value2);

          // Combine metrics (weighted average)
          return jw * 0.4 + lev * 0.3 + token * 0.3;
        }
        return value1 === value2 ? 1 : 0;

      case 'vector':
        if (Array.isArray(value1) && Array.isArray(value2)) {
          return cosineSimilarity(value1, value2);
        }
        return 0;

      case 'numeric':
        if (typeof value1 === 'number' && typeof value2 === 'number') {
          return numericSimilarity(value1, value2);
        }
        return 0;

      default:
        return value1 === value2 ? 1 : 0;
    }
  }

  /**
   * Calculate confidence score based on field coverage and scores
   */
  private calculateConfidence(fieldScores: Record<string, number>, overall: number): number {
    const numFields = Object.keys(fieldScores).length;
    const totalWeights = this.config.weights.length;

    if (totalWeights === 0) return 0;

    // Coverage factor: how many fields were compared
    const coverage = numFields / totalWeights;

    // Consistency factor: standard deviation of scores
    const scores = Object.values(fieldScores);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const consistency = 1 - Math.min(stdDev, 1);

    // Combine factors
    return overall * 0.6 + coverage * 0.2 + consistency * 0.2;
  }

  /**
   * Check if UPC/EAN codes match
   */
  static matchProductCode(code1: string, code2: string): boolean {
    return productCodeMatch(code1, code2);
  }

  /**
   * Calculate fuzzy text similarity
   */
  static fuzzyMatch(text1: string, text2: string): number {
    return jaroWinklerSimilarity(text1, text2);
  }

  /**
   * Calculate vector similarity
   */
  static vectorSimilarity(vec1: number[], vec2: number[]): number {
    return cosineSimilarity(vec1, vec2);
  }

  /**
   * Get default product matching configuration
   */
  static getDefaultProductConfig(): ScoringConfig {
    return {
      weights: [
        { field: 'upc', weight: 3.0, matchType: 'exact' },
        { field: 'ean', weight: 3.0, matchType: 'exact' },
        { field: 'name', weight: 2.0, matchType: 'fuzzy' },
        { field: 'brand', weight: 1.5, matchType: 'fuzzy' },
        { field: 'description', weight: 1.0, matchType: 'fuzzy' },
        { field: 'category', weight: 1.0, matchType: 'fuzzy' },
        { field: 'price', weight: 0.5, matchType: 'numeric' },
        { field: 'vector', weight: 1.5, matchType: 'vector' }
      ],
      threshold: 0.7,
      vectorDimension: 384
    };
  }
}
