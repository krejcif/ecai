# AI-Powered Recommendation Engine

High-performance product recommendation system using RuVector for semantic similarity search.

## Overview

This recommendation engine provides four types of AI-powered recommendations:

1. **Product-Based Recommendations** - Find similar products using vector similarity
2. **Personalized Recommendations** - Based on user browsing/purchase history
3. **Cross-Sell Recommendations** - Products frequently bought together
4. **Trending Products** - Popular items in specific categories

## Features

- **Vector Similarity Search** - Uses cosine similarity, Euclidean distance, and other metrics
- **Smart Filtering** - Category, price range, and custom filters
- **Diversity Selection** - MMR (Maximal Marginal Relevance) for diverse results
- **Confidence Scoring** - Each recommendation includes a confidence score
- **Caching** - Built-in product and category vector caching
- **Fallback Support** - In-memory search when RuVector is unavailable

## Installation

The recommendation engine is part of the EcommerceIQ platform and uses RuVector for vector operations:

```bash
npm install
```

## Core Modules

### similarity.ts

Provides low-level vector similarity calculations:

- `calculateCosineSimilarity(v1, v2)` - Cosine similarity between vectors
- `calculateEuclideanDistance(v1, v2)` - Euclidean distance
- `calculateDotProduct(v1, v2)` - Dot product similarity
- `calculateManhattanDistance(v1, v2)` - Manhattan (L1) distance
- `rankBySimilarity(queryVector, candidates, options)` - Rank items by similarity
- `calculateAverageVector(vectors)` - Average multiple vectors
- `normalizeVector(vector)` - L2 normalization
- `selectDiverseItems(candidates, k, lambda)` - MMR diversity selection

### recommendations.ts

High-level recommendation engine with business logic:

#### RecommendationEngine Class

```typescript
import { RecommendationEngine } from './ruvector';

const engine = RecommendationEngine.create('.ruvector/products');
```

#### Methods

**1. getProductRecommendations(productId, limit, options)**

Find similar products based on a specific product:

```typescript
const recommendations = await engine.getProductRecommendations(
  'prod-123',
  10,
  {
    threshold: 0.5,
    diversify: true,
    categories: ['Electronics'],
    priceRange: { min: 50, max: 500 }
  }
);
```

**2. getPersonalizedRecommendations(userHistory, limit, options)**

Get personalized recommendations based on user history:

```typescript
const userHistory = ['prod-001', 'prod-002', 'prod-003'];
const recommendations = await engine.getPersonalizedRecommendations(
  userHistory,
  10,
  {
    diversify: true,
    diversityLambda: 0.6
  }
);
```

**3. getCrossSellRecommendations(cartItems, options)**

Find products frequently bought together:

```typescript
const cartItems = ['prod-keyboard', 'prod-mouse'];
const recommendations = await engine.getCrossSellRecommendations(
  cartItems,
  {
    limit: 5,
    minConfidence: 0.3
  }
);
```

**4. getTrendingProducts(category, limit, options)**

Get trending products in a category:

```typescript
const trending = await engine.getTrendingProducts(
  'Electronics',
  10,
  {
    minPopularity: 0.2
  }
);
```

## Usage Examples

### Basic Product Recommendations

```typescript
import { RecommendationEngine } from './ruvector';

const engine = RecommendationEngine.create();

// Load products into cache
await engine.cacheProducts(products);

// Get recommendations
const recs = await engine.getProductRecommendations('prod-001', 5);

recs.forEach(rec => {
  console.log(`${rec.product.name}`);
  console.log(`  Score: ${rec.score.toFixed(3)}`);
  console.log(`  Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
  console.log(`  Reason: ${rec.reason}`);
});
```

### Personalized Recommendations with Filters

```typescript
const recommendations = await engine.getPersonalizedRecommendations(
  ['prod-001', 'prod-002'],
  10,
  {
    categories: ['Electronics', 'Accessories'],
    priceRange: { min: 20, max: 200 },
    threshold: 0.3,
    diversify: true
  }
);
```

### Advanced Similarity Calculations

```typescript
import {
  calculateCosineSimilarity,
  rankBySimilarity,
  selectDiverseItems
} from './ruvector';

// Calculate similarity between two vectors
const similarity = calculateCosineSimilarity(vector1, vector2);

// Rank candidates by similarity
const ranked = rankBySimilarity(
  queryVector,
  candidates,
  {
    metric: 'cosine',
    limit: 10,
    threshold: 0.5
  }
);

// Select diverse items using MMR
const diverse = selectDiverseItems(candidates, 5, 0.5);
```

## Running Examples

Run the example demo:

```bash
npx tsx src/ruvector/example.ts
```

This will demonstrate:
- Product-based recommendations
- Personalized recommendations
- Cross-sell recommendations
- Trending products
- Cache statistics

## RuVector Integration

The recommendation engine uses RuVector CLI for vector search:

```bash
# Create a vector database
npx ruvector create .ruvector/products --dimension 384

# Insert product vectors
npx ruvector insert .ruvector/products products.json

# Search for similar products
npx ruvector search .ruvector/products --query-file query.json --limit 10
```

## Configuration Options

### RecommendationOptions

```typescript
interface RecommendationOptions {
  limit?: number;              // Max results (default: based on method)
  threshold?: number;          // Min similarity score (0-1)
  diversify?: boolean;         // Enable diversity selection
  diversityLambda?: number;    // MMR lambda (0=diversity, 1=relevance)
  excludeIds?: string[];       // Product IDs to exclude
  categories?: string[];       // Filter by categories
  priceRange?: {               // Filter by price range
    min?: number;
    max?: number;
  };
}
```

### TrendingProductOptions

```typescript
interface TrendingProductOptions {
  limit?: number;              // Max results
  timeWindow?: 'day' | 'week' | 'month';  // Time window
  minPopularity?: number;      // Min popularity score (0-1)
}
```

### CrossSellOptions

```typescript
interface CrossSellOptions {
  limit?: number;              // Max results
  minConfidence?: number;      // Min confidence score (0-1)
  excludeCategories?: string[]; // Categories to exclude
}
```

## Return Types

### ProductRecommendation

```typescript
interface ProductRecommendation {
  product: ProductDocument;    // The recommended product
  score: number;               // Similarity/relevance score (0-1)
  reason: string;              // Human-readable explanation
  confidence: number;          // Confidence in recommendation (0-1)
}
```

## Performance

- **Vector Search**: Uses RuVector's optimized SIMD operations
- **Caching**: Products and category vectors are cached in memory
- **Fallback**: In-memory search if RuVector is unavailable
- **Batch Processing**: Processes multiple recommendations efficiently

## Cache Management

```typescript
// Load products into cache
await engine.cacheProducts(products);

// Get cache statistics
const stats = engine.getCacheStats();
console.log(`Products cached: ${stats.products}`);
console.log(`Categories cached: ${stats.categories}`);

// Clear all caches
engine.clearCache();
```

## Similarity Metrics

The engine supports multiple similarity metrics:

- **Cosine** (default): Best for normalized vectors, range [-1, 1]
- **Euclidean**: Distance-based, sensitive to magnitude
- **Dot Product**: Fast, assumes normalized vectors
- **Manhattan**: L1 distance, robust to outliers

## Advanced Features

### Diversity Selection

Uses Maximal Marginal Relevance (MMR) to balance relevance and diversity:

```typescript
const recommendations = await engine.getProductRecommendations(
  'prod-001',
  10,
  {
    diversify: true,
    diversityLambda: 0.5  // 0=max diversity, 1=max relevance
  }
);
```

### Weighted Similarity

Combine multiple vector aspects with custom weights:

```typescript
import { calculateWeightedSimilarity } from './ruvector';

const score = calculateWeightedSimilarity(
  [
    { vector: nameVector, weight: 0.4 },
    { vector: descVector, weight: 0.3 }
  ],
  [
    { vector: targetNameVector, weight: 0.4 },
    { vector: targetDescVector, weight: 0.3 }
  ],
  'cosine'
);
```

## Error Handling

The engine includes robust error handling:

```typescript
try {
  const recs = await engine.getProductRecommendations('prod-123', 10);
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle missing product
  } else if (error.message.includes('no vector')) {
    // Handle missing embeddings
  }
}
```

## Testing

Run tests for the recommendation engine:

```bash
npx tsx src/ruvector/tests/recommendations.test.ts
```

## Architecture

```
┌─────────────────────────────────────┐
│   RecommendationEngine              │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Product Cache               │  │
│  │  Category Vector Cache       │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  RuVector CLI                │  │
│  │  (Vector Search)             │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Similarity Functions        │  │
│  │  (Cosine, Euclidean, etc.)   │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Best Practices

1. **Cache Products**: Always cache products before making recommendations
2. **Use Appropriate Metrics**: Cosine for normalized, Euclidean for absolute distances
3. **Enable Diversity**: For better user experience, enable diversity selection
4. **Set Thresholds**: Filter low-quality recommendations with threshold
5. **Monitor Performance**: Use cache stats to optimize memory usage

## License

MIT - Part of the EcommerceIQ platform
