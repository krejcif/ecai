# Price Intelligence - Quick Start Guide

## Installation

The Price Intelligence System is part of the EcommerceIQ platform's RuVector module. No additional installation required.

## Quick Example

```typescript
import { PriceIntelligence, PriceVectorizer } from './ruvector';
import { ProductDocument } from './database/collections';

// 1. Create sample products
const products: ProductDocument[] = [
  {
    id: 'prod-1',
    name: 'Wireless Headphones',
    description: 'Premium noise-cancelling headphones',
    category: 'Electronics',
    price: 199.99,
    source: 'catalog',
    vector: [] // Will be generated
  },
  // ... more products
];

// 2. Initialize the system
const intelligence = new PriceIntelligence();
intelligence.addProducts(products);

// 3. Find price anomalies
const anomalies = await intelligence.findPriceAnomalies();
console.log(`Found ${anomalies.length} anomalies`);

// 4. Predict price changes
const prediction = await intelligence.predictPriceChange('prod-1', 30);
console.log(`Predicted price: $${prediction.predictedPrice}`);
console.log(`Direction: ${prediction.direction}`);

// 5. Analyze competition
const competitive = await intelligence.getCompetitivePricing('prod-1');
console.log(`Market position: ${competitive.competitivePosition}`);
console.log(`Percentile: ${competitive.marketPosition.percentile}%`);

// 6. Optimize pricing
const optimization = await intelligence.getPriceOptimization('prod-1');
console.log(`Optimal price: $${optimization.optimalPrice}`);
console.log(`Expected profit change: ${optimization.expectedImpact.profitChange}%`);
```

## Core Functions

### 1. Find Price Anomalies
```typescript
const anomalies = await intelligence.findPriceAnomalies(products, priceDataMap);
// Returns: Products with unusual pricing (overpriced, underpriced, etc.)
```

### 2. Predict Price Changes
```typescript
const prediction = await intelligence.predictPriceChange(productId, 30);
// Returns: Predicted price in 30 days with confidence and factors
```

### 3. Competitive Pricing
```typescript
const competitive = await intelligence.getCompetitivePricing(productId);
// Returns: Market position and similar products comparison
```

### 4. Price Optimization
```typescript
const optimization = await intelligence.getPriceOptimization(productId);
// Returns: Optimal price with impact analysis and scenarios
```

## Advanced: Price Vectorization

```typescript
import { PriceVectorizer, PriceData } from './ruvector';

const vectorizer = new PriceVectorizer({
  dimension: 384,
  priceHistoryLength: 30,
  includeTemporalFeatures: true,
  includeCompetitiveFeatures: true
});

// Add price history
const priceData: PriceData = {
  productId: 'prod-1',
  currentPrice: 199.99,
  priceHistory: [
    { price: 219.99, timestamp: new Date('2024-09-01') },
    { price: 199.99, timestamp: new Date('2024-10-01') }
  ],
  category: 'Electronics',
  cost: 120.00,
  competitors: [
    { id: 'comp-1', price: 189.99 },
    { id: 'comp-2', price: 229.99 }
  ]
};

const vector = await vectorizer.createPriceVector(product, priceData);
// Returns: 384-dimensional vector encoding all price features
```

## Common Use Cases

### Daily Price Monitoring
```typescript
// Run daily to detect issues
const anomalies = await intelligence.findPriceAnomalies();
const highRisk = anomalies.filter(a => a.anomalyScore > 0.8);
if (highRisk.length > 0) {
  await sendAlert(highRisk);
}
```

### Dynamic Pricing
```typescript
// Adjust prices based on market
for (const product of products) {
  const optimization = await intelligence.getPriceOptimization(product.id);
  if (optimization.confidence > 0.7) {
    await updatePrice(product.id, optimization.optimalPrice);
  }
}
```

### Competitive Intelligence
```typescript
// Track market position
const competitive = await intelligence.getCompetitivePricing(productId);
if (competitive.marketPosition.percentile < 25) {
  console.log('Warning: Priced significantly below market');
}
```

### Revenue Forecasting
```typescript
// Predict market trends
const prediction = await intelligence.predictPriceChange(productId, 90);
console.log(`90-day forecast: ${prediction.direction}`);
console.log(`Expected change: ${prediction.priceChangePercent}%`);
```

## Running Examples

```bash
# Run complete demo suite
npx tsx src/ruvector/price-intelligence-example.ts

# Or with npm script (if configured)
npm run demo:price-intelligence
```

## Key Features

✅ **Vector-Based Similarity** - Finds comparable products automatically
✅ **Multi-Factor Analysis** - Considers dozens of pricing factors
✅ **Real-Time Analytics** - Fast similarity search with RuVector
✅ **Anomaly Detection** - Identifies pricing errors and outliers
✅ **Price Prediction** - Forecasts based on market trends
✅ **Optimization** - Suggests profit-maximizing prices
✅ **Competitive Intelligence** - Tracks market position
✅ **Scenario Analysis** - Evaluates multiple pricing strategies

## Configuration Options

```typescript
const intelligence = new PriceIntelligence({
  anomalyThreshold: 0.7,      // Higher = stricter anomaly detection
  similarityThreshold: 0.75,   // Higher = more similar products only
  clusteringMethod: 'kmeans',  // kmeans | dbscan | hierarchical
  maxCompetitors: 20,          // Max similar products to analyze
  priceElasticityDefault: -1.5 // Default price elasticity
});

const vectorizer = new PriceVectorizer({
  dimension: 384,                       // Vector size
  priceHistoryLength: 30,               // Historical data points
  normalizationMethod: 'minmax',        // minmax | zscore | log
  includeTemporalFeatures: true,        // Time-based features
  includeCompetitiveFeatures: true      // Competitor analysis
});
```

## Output Types

All methods return strongly-typed results:
- `PriceAnomaly[]` - Detected pricing issues
- `PriceChangePrognosis` - Price prediction with factors
- `CompetitivePricing` - Market position analysis
- `PriceOptimization` - Optimization recommendations

See type definitions in `price-intelligence.ts` and `price-vectors.ts`.

## Need Help?

- 📖 Full documentation: `PRICE-INTELLIGENCE-README.md`
- 💻 Code examples: `price-intelligence-example.ts`
- 🔧 Type definitions: `price-intelligence.ts`, `price-vectors.ts`
- 🎯 Integration: See `index.ts` for exports

## Performance Tips

1. **Batch Processing**: Process multiple products together
2. **Caching**: Vectors are cached automatically
3. **Incremental Updates**: Only reprocess changed products
4. **Thresholds**: Adjust similarity/anomaly thresholds for speed/accuracy trade-off
5. **History Length**: Reduce `priceHistoryLength` if not needed

## Next Steps

1. Try the examples: `npx tsx src/ruvector/price-intelligence-example.ts`
2. Read full documentation: `PRICE-INTELLIGENCE-README.md`
3. Integrate with your product catalog
4. Set up automated price monitoring
5. Build custom pricing strategies
