/**
 * Vector similarity calculations for recommendations
 */

export interface SimilarityResult {
  id: string;
  score: number;
  distance?: number;
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical vectors
 *
 * @param v1 First vector
 * @param v2 Second vector
 * @returns Cosine similarity score
 */
export function calculateCosineSimilarity(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length || v1.length === 0) {
    throw new Error('Vectors must be non-empty and of equal length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Calculate Euclidean distance between two vectors
 * Lower values indicate more similar vectors
 *
 * @param v1 First vector
 * @param v2 Second vector
 * @returns Euclidean distance
 */
export function calculateEuclideanDistance(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length || v1.length === 0) {
    throw new Error('Vectors must be non-empty and of equal length');
  }

  let sumSquaredDiff = 0;

  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sumSquaredDiff += diff * diff;
  }

  return Math.sqrt(sumSquaredDiff);
}

/**
 * Calculate dot product similarity between two vectors
 * Higher values indicate more similar vectors
 *
 * @param v1 First vector
 * @param v2 Second vector
 * @returns Dot product score
 */
export function calculateDotProduct(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length || v1.length === 0) {
    throw new Error('Vectors must be non-empty and of equal length');
  }

  let dotProduct = 0;

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
  }

  return dotProduct;
}

/**
 * Calculate Manhattan (L1) distance between two vectors
 * Lower values indicate more similar vectors
 *
 * @param v1 First vector
 * @param v2 Second vector
 * @returns Manhattan distance
 */
export function calculateManhattanDistance(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length || v1.length === 0) {
    throw new Error('Vectors must be non-empty and of equal length');
  }

  let sumAbsDiff = 0;

  for (let i = 0; i < v1.length; i++) {
    sumAbsDiff += Math.abs(v1[i] - v2[i]);
  }

  return sumAbsDiff;
}

/**
 * Rank candidates by similarity to a query vector
 *
 * @param queryVector Query vector to compare against
 * @param candidates Array of candidates with their vectors
 * @param metric Similarity metric to use (default: 'cosine')
 * @param limit Maximum number of results to return
 * @returns Ranked candidates sorted by similarity (highest first)
 */
export function rankBySimilarity<T extends { id: string; vector: number[] }>(
  queryVector: number[],
  candidates: T[],
  options: {
    metric?: 'cosine' | 'euclidean' | 'dot' | 'manhattan';
    limit?: number;
    threshold?: number;
  } = {}
): Array<T & { score: number; distance?: number }> {
  const { metric = 'cosine', limit, threshold } = options;

  if (!queryVector || queryVector.length === 0) {
    throw new Error('Query vector must be non-empty');
  }

  if (!candidates || candidates.length === 0) {
    return [];
  }

  // Calculate similarity for each candidate
  const scored = candidates.map(candidate => {
    if (!candidate.vector || candidate.vector.length !== queryVector.length) {
      return null;
    }

    let score: number;
    let distance: number | undefined;

    switch (metric) {
      case 'cosine':
        score = calculateCosineSimilarity(queryVector, candidate.vector);
        break;
      case 'euclidean':
        distance = calculateEuclideanDistance(queryVector, candidate.vector);
        // Convert distance to similarity score (inverse)
        score = 1 / (1 + distance);
        break;
      case 'dot':
        score = calculateDotProduct(queryVector, candidate.vector);
        break;
      case 'manhattan':
        distance = calculateManhattanDistance(queryVector, candidate.vector);
        // Convert distance to similarity score (inverse)
        score = 1 / (1 + distance);
        break;
      default:
        score = calculateCosineSimilarity(queryVector, candidate.vector);
    }

    return {
      ...candidate,
      score,
      distance
    };
  }).filter((item): item is T & { score: number; distance?: number } => item !== null);

  // Apply threshold if specified
  let filtered = scored;
  if (threshold !== undefined) {
    filtered = scored.filter(item => item.score >= threshold);
  }

  // Sort by score (descending - higher is better)
  filtered.sort((a, b) => b.score - a.score);

  // Apply limit if specified
  if (limit !== undefined && limit > 0) {
    return filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Calculate average vector from multiple vectors
 * Useful for creating aggregate embeddings
 *
 * @param vectors Array of vectors
 * @returns Average vector
 */
export function calculateAverageVector(vectors: number[][]): number[] {
  if (!vectors || vectors.length === 0) {
    throw new Error('Vectors array must be non-empty');
  }

  const dimension = vectors[0].length;

  // Validate all vectors have same dimension
  for (const vec of vectors) {
    if (vec.length !== dimension) {
      throw new Error('All vectors must have the same dimension');
    }
  }

  const avgVector = new Array(dimension).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < dimension; i++) {
      avgVector[i] += vector[i];
    }
  }

  for (let i = 0; i < dimension; i++) {
    avgVector[i] /= vectors.length;
  }

  return avgVector;
}

/**
 * Normalize a vector to unit length (L2 normalization)
 *
 * @param vector Vector to normalize
 * @returns Normalized vector
 */
export function normalizeVector(vector: number[]): number[] {
  if (!vector || vector.length === 0) {
    throw new Error('Vector must be non-empty');
  }

  let norm = 0;
  for (const val of vector) {
    norm += val * val;
  }
  norm = Math.sqrt(norm);

  if (norm === 0) {
    return vector.map(() => 0);
  }

  return vector.map(val => val / norm);
}

/**
 * Calculate weighted similarity score combining multiple vectors
 * Useful for multi-aspect similarity
 *
 * @param queryVectors Array of query vectors with weights
 * @param candidateVectors Array of candidate vectors with weights
 * @param metric Similarity metric to use
 * @returns Weighted similarity score
 */
export function calculateWeightedSimilarity(
  queryVectors: Array<{ vector: number[]; weight: number }>,
  candidateVectors: Array<{ vector: number[]; weight: number }>,
  metric: 'cosine' | 'euclidean' | 'dot' = 'cosine'
): number {
  if (queryVectors.length !== candidateVectors.length) {
    throw new Error('Query and candidate must have same number of vector aspects');
  }

  let totalWeight = 0;
  let weightedScore = 0;

  for (let i = 0; i < queryVectors.length; i++) {
    const queryItem = queryVectors[i];
    const candidateItem = candidateVectors[i];

    let score: number;

    switch (metric) {
      case 'cosine':
        score = calculateCosineSimilarity(queryItem.vector, candidateItem.vector);
        break;
      case 'euclidean':
        const distance = calculateEuclideanDistance(queryItem.vector, candidateItem.vector);
        score = 1 / (1 + distance);
        break;
      case 'dot':
        score = calculateDotProduct(queryItem.vector, candidateItem.vector);
        break;
      default:
        score = calculateCosineSimilarity(queryItem.vector, candidateItem.vector);
    }

    const weight = (queryItem.weight + candidateItem.weight) / 2;
    weightedScore += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

/**
 * Find the k most diverse items from a set of candidates
 * Uses Maximal Marginal Relevance (MMR) for diversity
 *
 * @param candidates Candidates with their vectors and scores
 * @param k Number of diverse items to select
 * @param lambda Trade-off between relevance and diversity (0-1, default 0.5)
 * @returns K most diverse items
 */
export function selectDiverseItems<T extends { id: string; vector: number[]; score: number }>(
  candidates: T[],
  k: number,
  lambda: number = 0.5
): T[] {
  if (candidates.length === 0 || k <= 0) {
    return [];
  }

  if (candidates.length <= k) {
    return [...candidates];
  }

  const selected: T[] = [];
  const remaining = [...candidates];

  // Select the highest scoring item first
  remaining.sort((a, b) => b.score - a.score);
  selected.push(remaining.shift()!);

  // Iteratively select the most diverse items
  while (selected.length < k && remaining.length > 0) {
    let bestItem: T | null = null;
    let bestScore = -Infinity;
    let bestIndex = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      // Calculate minimum similarity to already selected items
      let minSimilarity = Infinity;
      for (const selectedItem of selected) {
        const similarity = calculateCosineSimilarity(candidate.vector, selectedItem.vector);
        minSimilarity = Math.min(minSimilarity, similarity);
      }

      // MMR score: balance between relevance and diversity
      const mmrScore = lambda * candidate.score - (1 - lambda) * minSimilarity;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestItem = candidate;
        bestIndex = i;
      }
    }

    if (bestItem) {
      selected.push(bestItem);
      remaining.splice(bestIndex, 1);
    } else {
      break;
    }
  }

  return selected;
}
