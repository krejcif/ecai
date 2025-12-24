/**
 * Test suite for Trend Clustering functionality
 * Tests TrendVectorizer and TrendClusterer classes
 */

import { TrendVectorizer, TrendClusterer } from '../index';
import type { TrendVectorData, ProductTrendData } from '../index';

/**
 * Test TrendVectorizer
 */
async function testTrendVectorizer() {
  console.log('Testing TrendVectorizer...');

  const vectorizer = new TrendVectorizer();

  // Test single trend vectorization
  const trendData: TrendVectorData = {
    id: 'test_001',
    keyword: 'Smart Watch',
    category: 'Electronics',
    signals: {
      searchVolume: 0.85,
      salesVelocity: 0.72,
      socialMentions: 0.68,
      priceChange: -0.05,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const vectorized = await vectorizer.createTrendVector(trendData, {
      useEmbeddings: true,
      includeTemporalFeatures: true,
    });

    console.log('✓ Single trend vectorization successful');
    console.log(`  Vector dimension: ${vectorized.vector.length}`);
    console.log(`  Keyword: ${vectorized.keyword}`);
    console.log(`  Category: ${vectorized.category}`);
  } catch (error) {
    console.error('✗ Single trend vectorization failed:', error);
  }

  // Test batch vectorization
  const trends: TrendVectorData[] = [
    {
      id: 'test_002',
      keyword: 'Wireless Earbuds',
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
      id: 'test_003',
      keyword: 'Fitness Tracker',
      category: 'Electronics',
      signals: {
        searchVolume: 0.72,
        salesVelocity: 0.58,
        socialMentions: 0.63,
        priceChange: 0.02,
      },
      timestamp: new Date().toISOString(),
    },
  ];

  try {
    const vectorizedBatch = await vectorizer.createTrendVectors(trends);
    console.log('✓ Batch vectorization successful');
    console.log(`  Vectorized ${vectorizedBatch.length} trends`);
  } catch (error) {
    console.error('✗ Batch vectorization failed:', error);
  }

  // Test cache
  const cacheStats = vectorizer.getCacheStats();
  console.log(`✓ Cache statistics: ${cacheStats.entries} entries`);

  console.log('');
}

/**
 * Test TrendClusterer
 */
async function testTrendClusterer() {
  console.log('Testing TrendClusterer...');

  const clusterer = new TrendClusterer();

  // Sample product data
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
      category: 'Health',
      signals: {
        searchVolume: 0.72,
        salesVelocity: 0.58,
        socialMentions: 0.63,
        priceChange: 0.02,
      },
      timestamp: new Date().toISOString(),
    },
    {
      productId: 'prod_004',
      productName: 'Yoga Mat',
      category: 'Health',
      signals: {
        searchVolume: 0.69,
        salesVelocity: 0.71,
        socialMentions: 0.62,
        priceChange: 0.05,
      },
      timestamp: new Date().toISOString(),
    },
    {
      productId: 'prod_005',
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
  ];

  try {
    // Test clustering
    const clusters = await clusterer.clusterProducts(products, {
      numClusters: 2,
      minClusterSize: 2,
    });

    console.log('✓ Product clustering successful');
    console.log(`  Found ${clusters.length} clusters`);

    clusters.forEach((cluster, idx) => {
      console.log(`  Cluster ${idx + 1}: ${cluster.size} products, velocity ${cluster.avgVelocity.toFixed(3)}`);
    });
  } catch (error) {
    console.error('✗ Product clustering failed:', error);
  }

  try {
    // Test clustering first
    const clusters = await clusterer.clusterProducts(products, {
      numClusters: 2,
      minClusterSize: 2,
    });

    // Test emerging trend detection
    const emergingTrends = await clusterer.detectEmergingTrends(clusters, 0.10);

    console.log('✓ Emerging trend detection successful');
    console.log(`  Detected ${emergingTrends.length} emerging trends`);

    emergingTrends.forEach((trend, idx) => {
      console.log(`  Trend ${idx + 1}: ${trend.keyword}, growth ${(trend.growthRate * 100).toFixed(1)}%, confidence ${(trend.confidence * 100).toFixed(1)}%`);
    });
  } catch (error) {
    console.error('✗ Emerging trend detection failed:', error);
  }

  try {
    // Test clustering first
    const clusters = await clusterer.clusterProducts(products, {
      numClusters: 2,
      minClusterSize: 2,
    });

    if (clusters.length > 0) {
      // Test velocity analysis
      const velocity = clusterer.getTrendVelocity(clusters[0].clusterId, clusters[0]);

      console.log('✓ Trend velocity analysis successful');
      console.log(`  Current velocity: ${velocity.currentVelocity.toFixed(3)}`);
      console.log(`  Trend direction: ${velocity.trend}`);
      console.log(`  Projected growth: ${velocity.projectedGrowth.toFixed(3)}`);
    }
  } catch (error) {
    console.error('✗ Trend velocity analysis failed:', error);
  }

  console.log('');
}

/**
 * Test integration
 */
async function testIntegration() {
  console.log('Testing Integration...');

  const vectorizer = new TrendVectorizer();
  const clusterer = new TrendClusterer();

  const products: ProductTrendData[] = [
    {
      productId: 'prod_001',
      productName: 'Gaming Laptop',
      category: 'Electronics',
      signals: {
        searchVolume: 0.90,
        salesVelocity: 0.85,
        socialMentions: 0.78,
        priceChange: 0.05,
      },
      timestamp: new Date().toISOString(),
    },
    {
      productId: 'prod_002',
      productName: 'Gaming Mouse',
      category: 'Electronics',
      signals: {
        searchVolume: 0.75,
        salesVelocity: 0.68,
        socialMentions: 0.62,
        priceChange: -0.02,
      },
      timestamp: new Date().toISOString(),
    },
  ];

  try {
    // Convert to trend data
    const trendData = products.map(p => ({
      id: p.productId,
      keyword: p.productName,
      category: p.category,
      signals: p.signals,
      timestamp: p.timestamp,
    }));

    // Vectorize
    const vectorized = await vectorizer.createTrendVectors(trendData);

    // Find related trends
    const relatedTrends = await clusterer.getRelatedTrends(
      vectorized[0].id,
      vectorized,
      5
    );

    console.log('✓ Related trend discovery successful');
    console.log(`  Found ${relatedTrends.length} related trends`);

    relatedTrends.forEach((related, idx) => {
      console.log(`  ${idx + 1}. ${related.keyword}: similarity ${(related.similarity * 100).toFixed(1)}%, type ${related.relationshipType}`);
    });
  } catch (error) {
    console.error('✗ Related trend discovery failed:', error);
  }

  console.log('');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== Trend Clustering Tests ===\n');

  await testTrendVectorizer();
  await testTrendClusterer();
  await testIntegration();

  console.log('=== Tests Complete ===');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { runTests };
