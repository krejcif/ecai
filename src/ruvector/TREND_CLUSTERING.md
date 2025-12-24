# Trend Clustering and Analysis

This module provides vector-based trend clustering and analysis using ruvector, enabling detection of emerging product trends, market patterns, and related product groups.

## Features

### TrendVectorizer

Converts trend signals into high-dimensional vectors for similarity analysis.

**Key Features:**
- Multi-signal vectorization (search volume, sales velocity, social mentions, price changes)
- Text embedding integration using ruvector
- Temporal feature extraction (seasonality, cyclical patterns)
- Flexible normalization options (min-max, z-score)
- Efficient caching for repeated embeddings

**Example:**

```typescript
import { TrendVectorizer, TrendVectorData } from './ruvector';

const vectorizer = new TrendVectorizer();

const trendData: TrendVectorData = {
  id: 'trend_001',
  keyword: 'Smart Watch',
  category: 'Electronics',
  signals: {
    searchVolume: 0.85,      // 0-1 normalized
    salesVelocity: 0.72,     // -1 to 1 (growth rate)
    socialMentions: 0.68,    // 0-1 normalized
    priceChange: -0.05,      // -1 to 1 (price change rate)
  },
  timestamp: new Date().toISOString(),
};

const vectorized = await vectorizer.createTrendVector(trendData, {
  useEmbeddings: true,
  includeTemporalFeatures: true,
  normalization: 'minmax',
});

console.log(vectorized.vector.length); // 384-dimensional vector
```

### TrendClusterer

Groups products by trend similarity and detects emerging patterns.

**Key Features:**
- K-means++ clustering with cosine similarity
- Emerging trend detection with confidence scoring
- Trend velocity and acceleration tracking
- Related trend discovery
- Historical trend analysis

**Example:**

```typescript
import { TrendClusterer, ProductTrendData } from './ruvector';

const clusterer = new TrendClusterer();

const products: ProductTrendData[] = [
  {
    productId: 'prod_001',
    productName: 'Smart Watch Pro',
    category: 'Electronics',
    signals: {
      searchVolume: 0.85,
      salesVelocity: 0.72,
      socialMentions: 0.68,
      priceChange: -0.05,
    },
    timestamp: new Date().toISOString(),
  },
  // ... more products
];

// Step 1: Cluster products
const clusters = await clusterer.clusterProducts(products, {
  numClusters: 5,
  minClusterSize: 2,
  useTemporalFeatures: true,
});

console.log(`Found ${clusters.length} clusters`);
clusters.forEach(cluster => {
  console.log(`Cluster: ${cluster.keywords[0]}`);
  console.log(`  Size: ${cluster.size} products`);
  console.log(`  Velocity: ${cluster.avgVelocity.toFixed(3)}`);
  console.log(`  Category: ${cluster.dominantCategory}`);
});
```

### Emerging Trend Detection

Identify fast-growing product clusters with high confidence.

**Example:**

```typescript
// Step 2: Detect emerging trends
const emergingTrends = await clusterer.detectEmergingTrends(clusters, 0.15);

emergingTrends.forEach(trend => {
  console.log(`Emerging Trend: ${trend.keyword}`);
  console.log(`  Growth Rate: ${(trend.growthRate * 100).toFixed(1)}%`);
  console.log(`  Velocity: ${trend.velocity.toFixed(3)}`);
  console.log(`  Acceleration: ${trend.acceleration.toFixed(3)}`);
  console.log(`  Confidence: ${(trend.confidence * 100).toFixed(1)}%`);
  console.log(`  Products: ${trend.products.length}`);
});
```

### Trend Velocity Analysis

Track how fast a trend is growing over time.

**Example:**

```typescript
// Step 3: Analyze trend velocity
const velocity = clusterer.getTrendVelocity('cluster_id', cluster);

console.log(`Trend Analysis:`);
console.log(`  Current Velocity: ${velocity.currentVelocity.toFixed(3)}`);
console.log(`  Acceleration: ${velocity.acceleration.toFixed(3)}`);
console.log(`  Direction: ${velocity.trend}`); // accelerating, decelerating, stable
console.log(`  Projected Growth: ${velocity.projectedGrowth.toFixed(3)}`);
```

### Related Trend Discovery

Find similar or complementary trends using vector similarity.

**Example:**

```typescript
// Step 4: Find related trends
const relatedTrends = await clusterer.getRelatedTrends(
  'trend_id',
  allVectorizedTrends,
  10 // limit
);

relatedTrends.forEach(related => {
  console.log(`Related: ${related.keyword}`);
  console.log(`  Similarity: ${(related.similarity * 100).toFixed(1)}%`);
  console.log(`  Correlation: ${(related.correlationScore * 100).toFixed(1)}%`);
  console.log(`  Type: ${related.relationshipType}`);
  // Types: 'similar', 'complementary', 'substitutable'
});
```

## Signal Types

### Core Signals (Required)

- **searchVolume**: Search volume normalized to 0-1 range
- **salesVelocity**: Sales growth rate from -1 (declining) to 1 (growing)
- **socialMentions**: Social media mentions normalized to 0-1 range
- **priceChange**: Price change rate from -1 (price drop) to 1 (price increase)

### Optional Signals

- **reviewVolume**: Number of reviews (normalized 0-1)
- **sentimentScore**: Average sentiment (-1 to 1)
- **competitorActivity**: Competitor activity level (0-1)
- **seasonalityScore**: Seasonality strength (0-1)
- **inventoryLevel**: Stock levels (normalized 0-1)
- **conversionRate**: Purchase conversion (0-1)

## Architecture

### Vectorization Pipeline

1. **Text Embeddings**: Convert product names and categories to semantic vectors using ruvector
2. **Signal Features**: Extract numerical features from trend signals
3. **Temporal Features**: Add time-based features for seasonality detection
4. **Feature Combination**: Merge text embeddings with signal features
5. **Normalization**: Apply min-max or z-score normalization

### Clustering Algorithm

1. **K-means++**: Intelligent centroid initialization
2. **Cosine Similarity**: Measure vector similarity
3. **Iterative Refinement**: Optimize cluster assignments
4. **Validation**: Filter clusters by minimum size

### Trend Detection

1. **Velocity Calculation**: Average sales velocity per cluster
2. **Acceleration**: Change in velocity over time
3. **Growth Rate**: Search volume as growth proxy
4. **Confidence Scoring**: Multi-factor confidence calculation

## Performance Considerations

### Caching

The TrendVectorizer automatically caches text embeddings:

```typescript
// Clear cache when needed
vectorizer.clearCache();

// Get cache statistics
const stats = vectorizer.getCacheStats();
console.log(`Cache entries: ${stats.entries}`);
```

### Batch Processing

Process multiple trends efficiently:

```typescript
const vectorized = await vectorizer.createTrendVectors(
  trends,
  { useEmbeddings: true }
);
```

### Cluster History

Track trends over time:

```typescript
// Get historical velocity data
const history = clusterer.getClusterHistory('cluster_id');

// Clear history to free memory
clusterer.clearHistory();
```

## Use Cases

### 1. Product Discovery
Identify emerging product categories before they become mainstream.

### 2. Inventory Planning
Predict which products will see increased demand based on cluster velocity.

### 3. Marketing Optimization
Focus marketing budget on high-velocity trend clusters.

### 4. Competitive Intelligence
Discover related product trends that competitors are targeting.

### 5. Pricing Strategy
Adjust prices based on trend acceleration and cluster dynamics.

## Complete Example

See `/home/user/ecai/examples/trend-clustering-demo.ts` for a complete working example.

## Integration with EcommerceIQ

The trend clustering system integrates seamlessly with other EcommerceIQ components:

- **Search Engine**: Use trend vectors for semantic product search
- **Price Intelligence**: Combine with price analysis for dynamic pricing
- **Sentiment Analysis**: Incorporate review sentiment into trend signals
- **Supplier Network**: Identify supplier trends and risks

## API Reference

### TrendVectorizer

- `createTrendVector(data, options)`: Vectorize a single trend
- `createTrendVectors(trends, options)`: Batch vectorize trends
- `clearCache()`: Clear embedding cache
- `getCacheStats()`: Get cache statistics
- `getFeatureStatistics()`: Get feature normalization stats

### TrendClusterer

- `clusterProducts(products, options)`: Group products by similarity
- `detectEmergingTrends(clusters, minGrowthRate)`: Find growing trends
- `getTrendVelocity(clusterId, cluster)`: Calculate trend velocity
- `getRelatedTrends(trendId, allTrends, limit)`: Find similar trends
- `clearHistory()`: Clear velocity history
- `getClusterHistory(clusterId)`: Get historical velocity data

## Troubleshooting

### Low Confidence Scores

- Increase cluster size by adjusting `numClusters` parameter
- Ensure sufficient historical data for velocity calculation
- Verify signal quality (avoid all zeros or extreme values)

### Poor Clustering Results

- Try different number of clusters
- Enable temporal features for seasonality detection
- Check for data quality issues in input signals

### Slow Performance

- Use batch processing for multiple trends
- Enable caching for repeated vectorizations
- Reduce vector dimensions if needed

## Future Enhancements

- Real-time trend streaming
- Multi-language support
- Advanced seasonality detection
- Anomaly detection in trend patterns
- Automatic optimal cluster count selection
