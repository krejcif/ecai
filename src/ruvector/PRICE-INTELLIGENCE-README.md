# Price Intelligence System with RuVector

Advanced pricing analytics using vector similarity search for competitive intelligence, price optimization, and anomaly detection.

## Overview

The Price Intelligence System leverages vector embeddings to analyze pricing patterns, detect anomalies, predict price changes, and optimize pricing strategies based on market dynamics and competitor behavior.

## Components

### 1. PriceVectorizer (`price-vectors.ts`)

Converts product price data into multi-dimensional vector representations for similarity analysis.

**Key Features:**
- Multi-dimensional price feature extraction
- Price history embedding with trend analysis
- Category statistics and percentile calculations
- Temporal features (change frequency, recency)
- Competitive positioning analysis
- Configurable normalization methods (minmax, zscore, log)

**Example:**
```typescript
import { PriceVectorizer } from './price-vectors';

const vectorizer = new PriceVectorizer({
  dimension: 384,
  priceHistoryLength: 30,
  normalizationMethod: 'minmax',
  includeTemporalFeatures: true,
  includeCompetitiveFeatures: true
});

const priceVector = await vectorizer.createPriceVector(product, priceData);
```

**Price Features Encoded:**
- Current price and category statistics
- Price position (percentile, relative to mean/median)
- Profit margins
- Price volatility and velocity
- Days since last price change
- Price change frequency
- Seasonal factors
- Competitor pricing
- Price history trends (moving averages, momentum, regression)

### 2. PriceIntelligence (`price-intelligence.ts`)

Main intelligence engine that uses vector similarity to provide advanced pricing analytics.

**Key Methods:**

#### `findPriceAnomalies(products, priceDataMap)`
Detects unusual pricing using vector clustering and statistical analysis.

**Returns:**
- Anomaly type (overpriced, underpriced, volatile, stagnant, outlier)
- Anomaly score and confidence
- Expected vs actual price
- Cluster information

**Use Cases:**
- Identify pricing errors
- Detect competitive threats
- Find repricing opportunities
- Monitor price compliance

**Example:**
```typescript
const intelligence = new PriceIntelligence();
intelligence.addProducts(products, priceDataMap);

const anomalies = await intelligence.findPriceAnomalies();
// Returns products with unusual pricing patterns
```

#### `predictPriceChange(productId, timeframe)`
Predicts future price changes based on similar products' pricing trends.

**Returns:**
- Predicted price and change amount/percentage
- Direction (increase, decrease, stable)
- Prediction factors with weights
- Similar products and their trends
- Confidence score

**Factors Analyzed:**
- Market trend direction
- Category average pricing
- Competitor pricing patterns
- Price volatility
- Seasonal adjustments

**Example:**
```typescript
const prediction = await intelligence.predictPriceChange('prod-123', 30);
console.log(`Predicted price in 30 days: $${prediction.predictedPrice}`);
console.log(`Expected change: ${prediction.priceChangePercent}%`);
console.log(`Confidence: ${prediction.confidence * 100}%`);
```

#### `getCompetitivePricing(productId)`
Analyzes competitive position using vector similarity to find comparable products.

**Returns:**
- Competitive position (leader, competitive, follower, premium, discount)
- Similar products with price comparisons
- Market statistics (range, average, median)
- Market position (percentile, rank)
- Strategic recommendations

**Use Cases:**
- Competitive benchmarking
- Market positioning
- Price gap analysis
- Strategic pricing decisions

**Example:**
```typescript
const competitive = await intelligence.getCompetitivePricing('prod-123');
console.log(`Position: ${competitive.competitivePosition}`);
console.log(`Market percentile: ${competitive.marketPosition.percentile}%`);
console.log(`Rank: #${competitive.marketPosition.rank}`);
```

#### `getPriceOptimization(productId)`
Suggests optimal pricing based on market conditions, elasticity, and competitive dynamics.

**Returns:**
- Optimal price and adjustment recommendation
- Expected impact on revenue, volume, margin, profit
- Price elasticity estimate
- Price constraints (min/max, competitive bounds)
- Multiple pricing scenarios with probability estimates

**Optimization Factors:**
- Competitive positioning
- Market trends
- Price elasticity
- Profit maximization
- Strategic constraints

**Example:**
```typescript
const optimization = await intelligence.getPriceOptimization('prod-123');
console.log(`Optimal price: $${optimization.optimalPrice}`);
console.log(`Expected profit change: ${optimization.expectedImpact.profitChange}%`);
console.log(`Price elasticity: ${optimization.priceElasticity}`);

// Review scenarios
optimization.scenarios.forEach(scenario => {
  console.log(`Price $${scenario.price}: Profit $${scenario.expectedProfit}`);
});
```

## Data Structures

### PriceData
```typescript
interface PriceData {
  productId: string;
  currentPrice: number;
  priceHistory?: Array<{ price: number; timestamp: Date }>;
  category: string;
  cost?: number; // For margin calculation
  competitors?: Array<{ id: string; price: number }>;
  metadata?: Record<string, any>;
}
```

### PriceAnomaly
```typescript
interface PriceAnomaly {
  productId: string;
  product: ProductDocument;
  anomalyScore: number; // 0-1
  anomalyType: 'overpriced' | 'underpriced' | 'volatile' | 'stagnant' | 'outlier';
  currentPrice: number;
  expectedPrice: number;
  deviation: number; // Percentage
  confidence: number;
  explanation: string;
  clusterInfo: {
    clusterId: number;
    clusterSize: number;
    avgClusterPrice: number;
    distanceFromCenter: number;
  };
}
```

### PriceOptimization
```typescript
interface PriceOptimization {
  productId: string;
  currentPrice: number;
  optimalPrice: number;
  priceAdjustment: number;
  priceAdjustmentPercent: number;
  reasoning: string;
  expectedImpact: {
    revenueChange: number;
    volumeChange: number;
    marginChange: number;
    profitChange: number;
  };
  confidence: number;
  priceElasticity: number;
  constraints: {
    minPrice: number;
    maxPrice: number;
    competitorFloor: number;
    competitorCeiling: number;
  };
  scenarios: Array<{
    price: number;
    expectedRevenue: number;
    expectedVolume: number;
    expectedProfit: number;
    probability: number;
  }>;
}
```

## Vector-Based Analysis

### How It Works

1. **Price Vectorization**: Products are converted to 384-dimensional vectors encoding:
   - Price features (current, historical, statistics)
   - Market position (percentiles, rankings)
   - Temporal patterns (trends, seasonality)
   - Competitive relationships

2. **Similarity Search**: Uses RuVector to find products with similar pricing characteristics:
   - Products in same category
   - Similar price points
   - Similar price history patterns
   - Comparable market positioning

3. **Clustering**: Groups products using vector similarity:
   - Identifies natural price tiers
   - Detects outliers and anomalies
   - Segments market by pricing strategy

4. **Prediction**: Analyzes similar products' behavior:
   - Learns from pricing patterns
   - Identifies market trends
   - Estimates price elasticity
   - Forecasts future movements

### Advantages of Vector-Based Approach

- **Multi-dimensional Analysis**: Considers dozens of factors simultaneously
- **Automatic Similarity**: No manual product matching required
- **Pattern Recognition**: Learns implicit pricing relationships
- **Scalable**: Efficient even with millions of products
- **Real-time**: Fast similarity search using RuVector
- **Adaptive**: Automatically adjusts to market changes

## Use Cases

### 1. Dynamic Pricing
```typescript
// Continuously optimize prices based on market conditions
const optimization = await intelligence.getPriceOptimization(productId);
if (optimization.confidence > 0.7) {
  await updatePrice(productId, optimization.optimalPrice);
}
```

### 2. Competitive Intelligence
```typescript
// Monitor competitor pricing and adjust strategy
const competitive = await intelligence.getCompetitivePricing(productId);
if (competitive.competitivePosition === 'follower') {
  console.log('Consider price reduction or value-add');
}
```

### 3. Price Monitoring
```typescript
// Detect pricing errors and anomalies
const anomalies = await intelligence.findPriceAnomalies(products);
for (const anomaly of anomalies) {
  if (anomaly.anomalyScore > 0.8) {
    await alertPricingTeam(anomaly);
  }
}
```

### 4. Revenue Optimization
```typescript
// Find optimal price for maximum profit
const optimization = await intelligence.getPriceOptimization(productId);
const bestScenario = optimization.scenarios.reduce((best, scenario) =>
  scenario.expectedProfit > best.expectedProfit ? scenario : best
);
console.log(`Best price for profit: $${bestScenario.price}`);
```

### 5. Market Analysis
```typescript
// Understand market trends and positioning
const prediction = await intelligence.predictPriceChange(productId, 90);
console.log(`Market trend: ${prediction.direction}`);
console.log(`Category moving ${prediction.priceChangePercent}% over 90 days`);
```

## Configuration

```typescript
const intelligence = new PriceIntelligence({
  anomalyThreshold: 0.7,        // Stricter = fewer anomalies
  similarityThreshold: 0.75,     // Higher = more similar products only
  clusteringMethod: 'kmeans',    // kmeans, dbscan, hierarchical
  maxCompetitors: 20,            // Max similar products to analyze
  priceElasticityDefault: -1.5  // Default elasticity if uncalculable
});
```

## Running the Examples

```bash
# Run all price intelligence demos
npx tsx src/ruvector/price-intelligence-example.ts

# Or run individual demos in Node REPL
node
> const { demoPriceOptimization } = require('./dist/ruvector/price-intelligence-example');
> demoPriceOptimization();
```

## Integration with EcommerceIQ

The Price Intelligence System integrates seamlessly with the EcommerceIQ platform:

```typescript
import { PriceIntelligence } from './ruvector/price-intelligence';
import { VectorStore } from './database/vector-store';

// Initialize with existing vector store
const vectorStore = new VectorStore();
const intelligence = new PriceIntelligence({ vectorStore });

// Use with product catalog
const products = await productCatalog.getAll();
const priceData = await priceHistory.getForProducts(products);
intelligence.addProducts(products, priceData);

// Get insights
const anomalies = await intelligence.findPriceAnomalies();
const optimization = await intelligence.getPriceOptimization(productId);
```

## Performance Considerations

- **Vector Dimension**: 384 dimensions balances accuracy and performance
- **Batch Processing**: Process multiple products in batches for efficiency
- **Caching**: Price vectors are cached to avoid recomputation
- **Indexing**: Use RuVector's native indexing for fast similarity search
- **Updates**: Rebuild vectors when prices or market conditions change significantly

## Future Enhancements

- Machine learning-based elasticity estimation
- Real-time price monitoring and alerts
- A/B testing framework for price experiments
- Multi-currency and regional pricing
- Advanced seasonality models
- Demand forecasting integration
- Promotion and discount optimization
- Bundle pricing optimization

## API Reference

See inline documentation in:
- `price-vectors.ts` - Vectorization and feature engineering
- `price-intelligence.ts` - Intelligence engine and analytics
- `price-intelligence-example.ts` - Usage examples and demos

## License

Part of the EcommerceIQ platform - MIT License
