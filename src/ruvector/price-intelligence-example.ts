/**
 * Example usage of the Price Intelligence System
 * Demonstrates advanced price analytics using vector similarity
 */

import { PriceIntelligence } from './price-intelligence';
import { PriceVectorizer, PriceData } from './price-vectors';
import { ProductDocument } from '../database/collections';
import { VectorStore } from '../database/vector-store';

/**
 * Sample product data for price intelligence demonstrations
 */
const sampleProducts: ProductDocument[] = [
  {
    id: 'prod-101',
    name: 'Premium Wireless Headphones',
    description: 'High-end noise-cancelling wireless headphones with 40-hour battery',
    category: 'Electronics',
    price: 299.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      brand: 'AudioTech',
      rating: 4.7,
      reviewCount: 2500
    }
  },
  {
    id: 'prod-102',
    name: 'Budget Wireless Headphones',
    description: 'Affordable wireless headphones with decent sound quality',
    category: 'Electronics',
    price: 49.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      brand: 'SoundBudget',
      rating: 4.0,
      reviewCount: 850
    }
  },
  {
    id: 'prod-103',
    name: 'Mid-Range Wireless Headphones',
    description: 'Good quality wireless headphones with active noise cancellation',
    category: 'Electronics',
    price: 149.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      brand: 'SoundCore',
      rating: 4.5,
      reviewCount: 1200
    }
  },
  {
    id: 'prod-104',
    name: 'Professional Studio Headphones',
    description: 'Studio-grade wired headphones for professional audio work',
    category: 'Electronics',
    price: 179.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      brand: 'StudioPro',
      rating: 4.8,
      reviewCount: 950
    }
  },
  {
    id: 'prod-105',
    name: 'Gaming Wireless Headphones',
    description: 'Gaming headphones with 7.1 surround sound and RGB lighting',
    category: 'Electronics',
    price: 199.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      brand: 'GameSound',
      rating: 4.4,
      reviewCount: 1800
    }
  },
  {
    id: 'prod-106',
    name: 'Ultra-Premium Headphones',
    description: 'Luxury audiophile headphones with planar magnetic drivers',
    category: 'Electronics',
    price: 899.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      brand: 'AudioLux',
      rating: 4.9,
      reviewCount: 450
    }
  },
  {
    id: 'prod-107',
    name: 'Basic Earbuds',
    description: 'Simple wired earbuds for everyday use',
    category: 'Electronics',
    price: 15.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      brand: 'BasicSound',
      rating: 3.8,
      reviewCount: 5200
    }
  }
];

/**
 * Sample price history data
 */
const samplePriceData: Map<string, PriceData> = new Map([
  ['prod-101', {
    productId: 'prod-101',
    currentPrice: 299.99,
    priceHistory: [
      { price: 349.99, timestamp: new Date('2024-09-01') },
      { price: 329.99, timestamp: new Date('2024-10-01') },
      { price: 299.99, timestamp: new Date('2024-11-01') },
      { price: 299.99, timestamp: new Date('2024-12-01') }
    ],
    category: 'Electronics',
    cost: 180.00,
    competitors: [
      { id: 'prod-103', price: 149.99 },
      { id: 'prod-104', price: 179.99 },
      { id: 'prod-105', price: 199.99 }
    ]
  }],
  ['prod-102', {
    productId: 'prod-102',
    currentPrice: 49.99,
    priceHistory: [
      { price: 59.99, timestamp: new Date('2024-09-01') },
      { price: 54.99, timestamp: new Date('2024-10-01') },
      { price: 49.99, timestamp: new Date('2024-11-01') },
      { price: 49.99, timestamp: new Date('2024-12-01') }
    ],
    category: 'Electronics',
    cost: 25.00,
    competitors: [
      { id: 'prod-107', price: 15.99 }
    ]
  }],
  ['prod-103', {
    productId: 'prod-103',
    currentPrice: 149.99,
    priceHistory: [
      { price: 149.99, timestamp: new Date('2024-09-01') },
      { price: 139.99, timestamp: new Date('2024-10-01') },
      { price: 149.99, timestamp: new Date('2024-11-01') },
      { price: 149.99, timestamp: new Date('2024-12-01') }
    ],
    category: 'Electronics',
    cost: 85.00
  }],
  ['prod-106', {
    productId: 'prod-106',
    currentPrice: 899.99,
    priceHistory: [
      { price: 899.99, timestamp: new Date('2024-09-01') },
      { price: 899.99, timestamp: new Date('2024-10-01') },
      { price: 899.99, timestamp: new Date('2024-11-01') },
      { price: 899.99, timestamp: new Date('2024-12-01') }
    ],
    category: 'Electronics',
    cost: 550.00
  }]
]);

/**
 * Demo: Find Price Anomalies
 */
async function demoFindPriceAnomalies() {
  console.log('\n=== Price Anomaly Detection Demo ===\n');

  const intelligence = new PriceIntelligence();
  intelligence.addProducts(sampleProducts, samplePriceData);

  try {
    const anomalies = await intelligence.findPriceAnomalies(sampleProducts, samplePriceData);

    console.log(`Found ${anomalies.length} price anomalies:\n`);

    anomalies.forEach((anomaly, idx) => {
      console.log(`${idx + 1}. ${anomaly.product.name}`);
      console.log(`   Anomaly Type: ${anomaly.anomalyType}`);
      console.log(`   Current Price: $${anomaly.currentPrice.toFixed(2)}`);
      console.log(`   Expected Price: $${anomaly.expectedPrice.toFixed(2)}`);
      console.log(`   Deviation: ${anomaly.deviation.toFixed(1)}%`);
      console.log(`   Anomaly Score: ${(anomaly.anomalyScore * 100).toFixed(1)}%`);
      console.log(`   Confidence: ${(anomaly.confidence * 100).toFixed(1)}%`);
      console.log(`   Explanation: ${anomaly.explanation}`);
      console.log(`   Cluster Info:`);
      console.log(`     - Cluster Size: ${anomaly.clusterInfo.clusterSize} products`);
      console.log(`     - Avg Cluster Price: $${anomaly.clusterInfo.avgClusterPrice.toFixed(2)}`);
      console.log(`     - Distance from Center: ${anomaly.clusterInfo.distanceFromCenter.toFixed(2)}\n`);
    });

    if (anomalies.length === 0) {
      console.log('No significant price anomalies detected.\n');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Demo: Predict Price Change
 */
async function demoPredictPriceChange() {
  console.log('\n=== Price Change Prediction Demo ===\n');

  const intelligence = new PriceIntelligence();
  intelligence.addProducts(sampleProducts, samplePriceData);

  try {
    const productId = 'prod-101'; // Premium Wireless Headphones
    const prediction = await intelligence.predictPriceChange(productId, 30);

    const product = sampleProducts.find(p => p.id === productId);
    console.log(`Product: ${product?.name}\n`);
    console.log(`Current Price: $${prediction.currentPrice.toFixed(2)}`);
    console.log(`Predicted Price (${prediction.timeframe}): $${prediction.predictedPrice.toFixed(2)}`);
    console.log(`Expected Change: $${prediction.priceChange.toFixed(2)} (${prediction.priceChangePercent.toFixed(1)}%)`);
    console.log(`Direction: ${prediction.direction.toUpperCase()}`);
    console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%\n`);

    console.log('Prediction Factors:');
    prediction.factors.forEach(factor => {
      const impactSign = factor.impact >= 0 ? '+' : '';
      console.log(`  - ${factor.factor}: ${impactSign}${(factor.impact * 100).toFixed(1)}% (weight: ${(factor.weight * 100).toFixed(0)}%)`);
    });

    console.log('\nSimilar Products (Price Trends):');
    prediction.similarProducts.forEach((similar, idx) => {
      console.log(`  ${idx + 1}. ${similar.name}`);
      console.log(`     Similarity: ${(similar.similarity * 100).toFixed(1)}%`);
      console.log(`     Recent Change: ${similar.recentPriceChange >= 0 ? '+' : ''}${similar.recentPriceChange.toFixed(1)}%`);
    });
    console.log();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Demo: Competitive Pricing Analysis
 */
async function demoCompetitivePricing() {
  console.log('\n=== Competitive Pricing Analysis Demo ===\n');

  const intelligence = new PriceIntelligence();
  intelligence.addProducts(sampleProducts, samplePriceData);

  try {
    const productId = 'prod-103'; // Mid-Range Wireless Headphones
    const competitive = await intelligence.getCompetitivePricing(productId);

    const product = sampleProducts.find(p => p.id === productId);
    console.log(`Product: ${product?.name}`);
    console.log(`Current Price: $${competitive.currentPrice.toFixed(2)}\n`);

    console.log(`Competitive Position: ${competitive.competitivePosition.toUpperCase()}\n`);

    console.log('Market Statistics:');
    console.log(`  - Price Range: $${competitive.priceRange.min.toFixed(2)} - $${competitive.priceRange.max.toFixed(2)}`);
    console.log(`  - Average Price: $${competitive.priceRange.average.toFixed(2)}`);
    console.log(`  - Median Price: $${competitive.priceRange.median.toFixed(2)}\n`);

    console.log('Market Position:');
    console.log(`  - Percentile: ${competitive.marketPosition.percentile.toFixed(1)}%`);
    console.log(`  - Rank: #${competitive.marketPosition.rank} of ${competitive.marketPosition.totalCompetitors + 1}\n`);

    console.log('Similar Products (Competitors):');
    competitive.similarProducts.slice(0, 5).forEach((similar, idx) => {
      console.log(`  ${idx + 1}. ${similar.name}`);
      console.log(`     Price: $${similar.price.toFixed(2)} (${similar.priceDifferencePercent >= 0 ? '+' : ''}${similar.priceDifferencePercent.toFixed(1)}%)`);
      console.log(`     Similarity: ${(similar.similarity * 100).toFixed(1)}%`);
    });

    console.log('\nRecommendations:');
    competitive.recommendations.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec}`);
    });
    console.log();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Demo: Price Optimization
 */
async function demoPriceOptimization() {
  console.log('\n=== Price Optimization Demo ===\n');

  const intelligence = new PriceIntelligence();
  intelligence.addProducts(sampleProducts, samplePriceData);

  try {
    const productId = 'prod-101'; // Premium Wireless Headphones
    const optimization = await intelligence.getPriceOptimization(productId);

    const product = sampleProducts.find(p => p.id === productId);
    console.log(`Product: ${product?.name}\n`);

    console.log('Price Analysis:');
    console.log(`  Current Price: $${optimization.currentPrice.toFixed(2)}`);
    console.log(`  Optimal Price: $${optimization.optimalPrice.toFixed(2)}`);
    console.log(`  Recommended Adjustment: $${optimization.priceAdjustment.toFixed(2)} (${optimization.priceAdjustmentPercent >= 0 ? '+' : ''}${optimization.priceAdjustmentPercent.toFixed(1)}%)`);
    console.log(`  Confidence: ${(optimization.confidence * 100).toFixed(1)}%\n`);

    console.log('Reasoning:');
    console.log(`  ${optimization.reasoning}\n`);

    console.log('Expected Impact:');
    console.log(`  - Revenue Change: ${optimization.expectedImpact.revenueChange >= 0 ? '+' : ''}${optimization.expectedImpact.revenueChange.toFixed(1)}%`);
    console.log(`  - Volume Change: ${optimization.expectedImpact.volumeChange >= 0 ? '+' : ''}${optimization.expectedImpact.volumeChange.toFixed(1)}%`);
    console.log(`  - Margin Change: ${optimization.expectedImpact.marginChange >= 0 ? '+' : ''}${optimization.expectedImpact.marginChange.toFixed(1)}%`);
    console.log(`  - Profit Change: ${optimization.expectedImpact.profitChange >= 0 ? '+' : ''}${optimization.expectedImpact.profitChange.toFixed(1)}%\n`);

    console.log('Price Elasticity:');
    console.log(`  Estimated: ${optimization.priceElasticity.toFixed(2)}`);
    console.log(`  (${Math.abs(optimization.priceElasticity) > 1 ? 'Elastic' : 'Inelastic'} demand)\n`);

    console.log('Price Constraints:');
    console.log(`  - Minimum: $${optimization.constraints.minPrice.toFixed(2)}`);
    console.log(`  - Maximum: $${optimization.constraints.maxPrice.toFixed(2)}`);
    console.log(`  - Competitor Floor: $${optimization.constraints.competitorFloor.toFixed(2)}`);
    console.log(`  - Competitor Ceiling: $${optimization.constraints.competitorCeiling.toFixed(2)}\n`);

    console.log('Price Scenarios:');
    optimization.scenarios.forEach((scenario, idx) => {
      console.log(`  ${idx + 1}. Price: $${scenario.price.toFixed(2)}`);
      console.log(`     Expected Revenue: $${scenario.expectedRevenue.toFixed(2)}`);
      console.log(`     Expected Volume: ${scenario.expectedVolume.toFixed(0)} units`);
      console.log(`     Expected Profit: $${scenario.expectedProfit.toFixed(2)}`);
      console.log(`     Probability: ${(scenario.probability * 100).toFixed(0)}%\n`);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Demo: Price Vectorization
 */
async function demoPriceVectorization() {
  console.log('\n=== Price Vectorization Demo ===\n');

  const vectorizer = new PriceVectorizer({
    dimension: 384,
    priceHistoryLength: 30,
    normalizationMethod: 'minmax',
    includeTemporalFeatures: true,
    includeCompetitiveFeatures: true
  });

  try {
    const product = sampleProducts[0]; // Premium Wireless Headphones
    const priceData = samplePriceData.get(product.id);

    console.log(`Product: ${product.name}\n`);

    const vector = await vectorizer.createPriceVector(product, priceData);

    console.log(`Generated Price Vector:`);
    console.log(`  Dimension: ${vector.length}`);
    console.log(`  Sample values (first 20): [${vector.slice(0, 20).map(v => v.toFixed(3)).join(', ')}...]\n`);

    console.log('Vector Components:');
    console.log('  - Core price features (normalized)');
    console.log('  - Price position relative to category');
    console.log('  - Margin analysis');
    console.log('  - Price volatility and velocity');
    console.log('  - Temporal features (change frequency, recency)');
    console.log('  - Competitive positioning');
    console.log('  - Price history embeddings (trends, patterns)\n');

    // Create vectors for all products
    const allVectors = await vectorizer.createPriceVectors(sampleProducts, samplePriceData);
    console.log(`Total products vectorized: ${allVectors.size}`);

    // Show category statistics
    const categoryStats = vectorizer.getCategoryStats('Electronics');
    if (categoryStats) {
      console.log('\nElectronics Category Statistics:');
      console.log(`  - Mean Price: $${categoryStats.mean.toFixed(2)}`);
      console.log(`  - Median Price: $${categoryStats.median.toFixed(2)}`);
      console.log(`  - Std Deviation: $${categoryStats.stdDev.toFixed(2)}`);
      console.log(`  - Price Range: $${categoryStats.min.toFixed(2)} - $${categoryStats.max.toFixed(2)}`);
      console.log(`  - Product Count: ${categoryStats.count}`);
      console.log('  Percentiles:');
      console.log(`    - 25th: $${categoryStats.percentiles.p25.toFixed(2)}`);
      console.log(`    - 50th: $${categoryStats.percentiles.p50.toFixed(2)}`);
      console.log(`    - 75th: $${categoryStats.percentiles.p75.toFixed(2)}`);
      console.log(`    - 90th: $${categoryStats.percentiles.p90.toFixed(2)}`);
    }
    console.log();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Run all demos
 */
async function runAllDemos() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Price Intelligence System - Demo Suite                  ║');
  console.log('║   Advanced Pricing Analytics with Vector Similarity       ║');
  console.log('║   Powered by RuVector                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await demoPriceVectorization();
    await demoFindPriceAnomalies();
    await demoPredictPriceChange();
    await demoCompetitivePricing();
    await demoPriceOptimization();

    console.log('\n✅ All price intelligence demos completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run demos if this file is executed directly
if (require.main === module) {
  runAllDemos().catch(console.error);
}

export {
  runAllDemos,
  demoPriceVectorization,
  demoFindPriceAnomalies,
  demoPredictPriceChange,
  demoCompetitivePricing,
  demoPriceOptimization,
  sampleProducts,
  samplePriceData
};
