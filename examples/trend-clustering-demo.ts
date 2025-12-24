/**
 * Trend Clustering Demo
 * Demonstrates how to use the TrendVectorizer and TrendClusterer
 * to analyze product trends and detect emerging patterns
 */

import { TrendVectorizer, TrendClusterer, ProductTrendData } from '../src/ruvector';

async function runTrendClusteringDemo() {
  console.log('=== Trend Clustering Demo ===\n');

  // Initialize the clusterer
  const clusterer = new TrendClusterer();

  // Sample product trend data
  const productTrends: ProductTrendData[] = [
    // Tech products - High growth cluster
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
    {
      productId: 'prod_002',
      productName: 'Wireless Earbuds X',
      category: 'Electronics',
      signals: {
        searchVolume: 0.78,
        salesVelocity: 0.65,
        socialMentions: 0.71,
        priceChange: -0.10,
      },
      timestamp: new Date().toISOString(),
    },
    {
      productId: 'prod_003',
      productName: 'Fitness Tracker',
      category: 'Electronics',
      signals: {
        searchVolume: 0.72,
        salesVelocity: 0.58,
        socialMentions: 0.63,
        priceChange: 0.02,
      },
      timestamp: new Date().toISOString(),
    },

    // Home & Garden - Moderate growth cluster
    {
      productId: 'prod_004',
      productName: 'Air Purifier',
      category: 'Home & Garden',
      signals: {
        searchVolume: 0.55,
        salesVelocity: 0.42,
        socialMentions: 0.38,
        priceChange: 0.05,
      },
      timestamp: new Date().toISOString(),
    },
    {
      productId: 'prod_005',
      productName: 'Smart Thermostat',
      category: 'Home & Garden',
      signals: {
        searchVolume: 0.48,
        salesVelocity: 0.35,
        socialMentions: 0.32,
        priceChange: 0.08,
      },
      timestamp: new Date().toISOString(),
    },

    // Fashion - Declining cluster
    {
      productId: 'prod_006',
      productName: 'Winter Jacket',
      category: 'Fashion',
      signals: {
        searchVolume: 0.35,
        salesVelocity: -0.25,
        socialMentions: 0.22,
        priceChange: -0.20,
      },
      timestamp: new Date().toISOString(),
    },
    {
      productId: 'prod_007',
      productName: 'Wool Sweater',
      category: 'Fashion',
      signals: {
        searchVolume: 0.28,
        salesVelocity: -0.18,
        socialMentions: 0.19,
        priceChange: -0.15,
      },
      timestamp: new Date().toISOString(),
    },

    // Health & Wellness - Emerging cluster
    {
      productId: 'prod_008',
      productName: 'Protein Powder',
      category: 'Health',
      signals: {
        searchVolume: 0.82,
        salesVelocity: 0.88,
        socialMentions: 0.75,
        priceChange: 0.12,
      },
      timestamp: new Date().toISOString(),
    },
    {
      productId: 'prod_009',
      productName: 'Yoga Mat',
      category: 'Health',
      signals: {
        searchVolume: 0.76,
        salesVelocity: 0.79,
        socialMentions: 0.68,
        priceChange: 0.08,
      },
      timestamp: new Date().toISOString(),
    },
    {
      productId: 'prod_010',
      productName: 'Resistance Bands',
      category: 'Health',
      signals: {
        searchVolume: 0.69,
        salesVelocity: 0.71,
        socialMentions: 0.62,
        priceChange: 0.05,
      },
      timestamp: new Date().toISOString(),
    },
  ];

  console.log(`Analyzing ${productTrends.length} products...\n`);

  // Step 1: Cluster products by trend similarity
  console.log('Step 1: Clustering products by trend similarity...');
  const clusters = await clusterer.clusterProducts(productTrends, {
    numClusters: 4,
    minClusterSize: 2,
    useTemporalFeatures: true,
  });

  console.log(`Found ${clusters.length} trend clusters\n`);

  // Display clusters
  clusters.forEach((cluster, idx) => {
    console.log(`Cluster ${idx + 1} (${cluster.size} products):`);
    console.log(`  Dominant Category: ${cluster.dominantCategory || 'Mixed'}`);
    console.log(`  Average Velocity: ${cluster.avgVelocity.toFixed(3)}`);
    console.log(`  Keywords: ${cluster.keywords.slice(0, 3).join(', ')}`);
    console.log(`  Products:`);
    cluster.products.forEach(p => {
      console.log(`    - ${p.keyword} (${p.category})`);
    });
    console.log('');
  });

  // Step 2: Detect emerging trends
  console.log('Step 2: Detecting emerging trends...');
  const emergingTrends = await clusterer.detectEmergingTrends(clusters, 0.10);

  console.log(`Found ${emergingTrends.length} emerging trends\n`);

  emergingTrends.forEach((trend, idx) => {
    console.log(`Emerging Trend ${idx + 1}:`);
    console.log(`  Keyword: ${trend.keyword}`);
    console.log(`  Category: ${trend.category || 'Unknown'}`);
    console.log(`  Growth Rate: ${(trend.growthRate * 100).toFixed(1)}%`);
    console.log(`  Velocity: ${trend.velocity.toFixed(3)}`);
    console.log(`  Acceleration: ${trend.acceleration.toFixed(3)}`);
    console.log(`  Confidence: ${(trend.confidence * 100).toFixed(1)}%`);
    console.log(`  Cluster Size: ${trend.clusterSize} products`);
    console.log(`  Average Signals:`);
    console.log(`    Search Volume: ${trend.signals.avgSearchVolume.toFixed(2)}`);
    console.log(`    Sales Velocity: ${trend.signals.avgSalesVelocity.toFixed(2)}`);
    console.log(`    Social Mentions: ${trend.signals.avgSocialMentions.toFixed(2)}`);
    console.log('');
  });

  // Step 3: Analyze trend velocity for a specific cluster
  if (clusters.length > 0) {
    console.log('Step 3: Analyzing trend velocity...');
    const cluster = clusters[0];
    const velocity = clusterer.getTrendVelocity(cluster.clusterId, cluster);

    console.log(`Trend Velocity for Cluster "${cluster.clusterId}":`);
    console.log(`  Current Velocity: ${velocity.currentVelocity.toFixed(3)}`);
    console.log(`  Acceleration: ${velocity.acceleration.toFixed(3)}`);
    console.log(`  Growth Rate: ${(velocity.growthRate * 100).toFixed(1)}%`);
    console.log(`  Trend Direction: ${velocity.trend}`);
    console.log(`  Projected Growth: ${velocity.projectedGrowth.toFixed(3)}`);
    console.log('');
  }

  // Step 4: Find related trends
  console.log('Step 4: Finding related trends...');

  // First, we need to vectorize all trends
  const vectorizer = new TrendVectorizer();
  const allVectorizedTrends = await vectorizer.createTrendVectors(
    productTrends.map(p => ({
      id: p.productId,
      keyword: p.productName,
      category: p.category,
      signals: p.signals,
      timestamp: p.timestamp,
    })),
    { useEmbeddings: true }
  );

  // Find trends related to the first product
  const targetProduct = productTrends[0];
  const relatedTrends = await clusterer.getRelatedTrends(
    targetProduct.productId,
    allVectorizedTrends,
    5
  );

  console.log(`Related trends to "${targetProduct.productName}":\n`);
  relatedTrends.forEach((related, idx) => {
    console.log(`${idx + 1}. ${related.keyword} (${related.category || 'Unknown'})`);
    console.log(`   Similarity: ${(related.similarity * 100).toFixed(1)}%`);
    console.log(`   Correlation: ${(related.correlationScore * 100).toFixed(1)}%`);
    console.log(`   Relationship: ${related.relationshipType}`);
    console.log('');
  });

  // Step 5: Show statistics
  console.log('=== Summary Statistics ===');
  console.log(`Total Products Analyzed: ${productTrends.length}`);
  console.log(`Total Clusters Found: ${clusters.length}`);
  console.log(`Emerging Trends Detected: ${emergingTrends.length}`);
  console.log(`Average Cluster Size: ${(productTrends.length / clusters.length).toFixed(1)}`);

  const avgConfidence = emergingTrends.length > 0
    ? emergingTrends.reduce((sum, t) => sum + t.confidence, 0) / emergingTrends.length
    : 0;
  console.log(`Average Trend Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

  console.log('\n=== Demo Complete ===');
}

// Run the demo
if (require.main === module) {
  runTrendClusteringDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { runTrendClusteringDemo };
