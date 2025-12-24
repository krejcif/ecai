/**
 * Example usage of the AI Recommendation Engine
 */

import { RecommendationEngine } from './recommendations';
import { ProductDocument } from '../database/collections';

/**
 * Sample product data for demonstration
 */
const sampleProducts: ProductDocument[] = [
  {
    id: 'prod-001',
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium noise-cancelling wireless headphones with 30-hour battery life',
    category: 'Electronics',
    price: 199.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      rating: 4.5,
      reviewCount: 1250,
      viewCount: 5000,
      purchaseCount: 450,
      createdAt: new Date('2024-11-01').toISOString()
    }
  },
  {
    id: 'prod-002',
    name: 'USB-C Charging Cable',
    description: 'Fast charging USB-C cable, 6ft braided design',
    category: 'Accessories',
    price: 12.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      rating: 4.7,
      reviewCount: 3200,
      viewCount: 12000,
      purchaseCount: 2800,
      createdAt: new Date('2024-10-15').toISOString()
    }
  },
  {
    id: 'prod-003',
    name: 'Laptop Stand Aluminum',
    description: 'Ergonomic aluminum laptop stand with adjustable height',
    category: 'Accessories',
    price: 39.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      rating: 4.6,
      reviewCount: 890,
      viewCount: 3500,
      purchaseCount: 650,
      createdAt: new Date('2024-12-01').toISOString()
    }
  },
  {
    id: 'prod-004',
    name: 'Mechanical Keyboard RGB',
    description: 'Gaming mechanical keyboard with customizable RGB lighting',
    category: 'Electronics',
    price: 149.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      rating: 4.8,
      reviewCount: 2100,
      viewCount: 8500,
      purchaseCount: 1200,
      createdAt: new Date('2024-11-20').toISOString()
    }
  },
  {
    id: 'prod-005',
    name: 'Wireless Gaming Mouse',
    description: 'High-precision wireless gaming mouse with 16000 DPI',
    category: 'Electronics',
    price: 79.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      rating: 4.4,
      reviewCount: 1580,
      viewCount: 6200,
      purchaseCount: 920,
      createdAt: new Date('2024-10-25').toISOString()
    }
  },
  {
    id: 'prod-006',
    name: 'Portable SSD 1TB',
    description: 'Ultra-fast portable SSD with USB 3.2 Gen 2',
    category: 'Storage',
    price: 129.99,
    source: 'demo',
    vector: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      rating: 4.9,
      reviewCount: 2800,
      viewCount: 9500,
      purchaseCount: 1850,
      createdAt: new Date('2024-09-10').toISOString()
    }
  }
];

/**
 * Demo: Product-based Recommendations
 */
async function demoProductRecommendations() {
  console.log('\n=== Product-Based Recommendations Demo ===\n');

  const engine = RecommendationEngine.create();
  await engine.cacheProducts(sampleProducts);

  try {
    const recommendations = await engine.getProductRecommendations(
      'prod-001', // Wireless Bluetooth Headphones
      3,
      {
        threshold: 0.3,
        diversify: true
      }
    );

    console.log('Based on: Wireless Bluetooth Headphones\n');
    recommendations.forEach((rec, idx) => {
      console.log(`${idx + 1}. ${rec.product.name}`);
      console.log(`   Category: ${rec.product.category}`);
      console.log(`   Price: $${rec.product.price}`);
      console.log(`   Score: ${rec.score.toFixed(3)}`);
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
      console.log(`   Reason: ${rec.reason}\n`);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Demo: Personalized Recommendations
 */
async function demoPersonalizedRecommendations() {
  console.log('\n=== Personalized Recommendations Demo ===\n');

  const engine = RecommendationEngine.create();
  await engine.cacheProducts(sampleProducts);

  try {
    const userHistory = ['prod-001', 'prod-004', 'prod-005']; // Electronics items
    const recommendations = await engine.getPersonalizedRecommendations(
      userHistory,
      3,
      {
        diversify: true,
        diversityLambda: 0.6
      }
    );

    console.log('User History:');
    userHistory.forEach(id => {
      const product = sampleProducts.find(p => p.id === id);
      console.log(`  - ${product?.name}`);
    });
    console.log('\nRecommended for you:\n');

    recommendations.forEach((rec, idx) => {
      console.log(`${idx + 1}. ${rec.product.name}`);
      console.log(`   Category: ${rec.product.category}`);
      console.log(`   Price: $${rec.product.price}`);
      console.log(`   Score: ${rec.score.toFixed(3)}`);
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
      console.log(`   Reason: ${rec.reason}\n`);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Demo: Cross-Sell Recommendations
 */
async function demoCrossSellRecommendations() {
  console.log('\n=== Cross-Sell Recommendations Demo ===\n');

  const engine = RecommendationEngine.create();
  await engine.cacheProducts(sampleProducts);

  try {
    const cartItems = ['prod-004', 'prod-005']; // Keyboard and Mouse
    const recommendations = await engine.getCrossSellRecommendations(cartItems, {
      limit: 3,
      minConfidence: 0.3
    });

    console.log('Cart Items:');
    cartItems.forEach(id => {
      const product = sampleProducts.find(p => p.id === id);
      console.log(`  - ${product?.name}`);
    });
    console.log('\nFrequently Bought Together:\n');

    recommendations.forEach((rec, idx) => {
      console.log(`${idx + 1}. ${rec.product.name}`);
      console.log(`   Category: ${rec.product.category}`);
      console.log(`   Price: $${rec.product.price}`);
      console.log(`   Score: ${rec.score.toFixed(3)}`);
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
      console.log(`   Reason: ${rec.reason}\n`);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Demo: Trending Products
 */
async function demoTrendingProducts() {
  console.log('\n=== Trending Products Demo ===\n');

  const engine = RecommendationEngine.create();
  await engine.cacheProducts(sampleProducts);

  try {
    const trending = await engine.getTrendingProducts('Electronics', 3, {
      minPopularity: 0.2
    });

    console.log('Trending in Electronics:\n');

    trending.forEach((rec, idx) => {
      console.log(`${idx + 1}. ${rec.product.name}`);
      console.log(`   Price: $${rec.product.price}`);
      console.log(`   Rating: ${rec.product.metadata?.rating || 'N/A'}`);
      console.log(`   Reviews: ${rec.product.metadata?.reviewCount || 0}`);
      console.log(`   Score: ${rec.score.toFixed(3)}`);
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
      console.log(`   Reason: ${rec.reason}\n`);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Demo: Cache Statistics
 */
async function demoCacheStats() {
  console.log('\n=== Cache Statistics Demo ===\n');

  const engine = RecommendationEngine.create();
  await engine.cacheProducts(sampleProducts);

  const stats = engine.getCacheStats();
  console.log('Cache Statistics:');
  console.log(`  Products cached: ${stats.products}`);
  console.log(`  Categories cached: ${stats.categories}`);
  console.log(`  Interaction records: ${stats.interactions}`);
}

/**
 * Run all demos
 */
async function runAllDemos() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   AI-Powered Recommendation Engine - Demo Suite           ║');
  console.log('║   Powered by RuVector                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await demoProductRecommendations();
    await demoPersonalizedRecommendations();
    await demoCrossSellRecommendations();
    await demoTrendingProducts();
    await demoCacheStats();

    console.log('\n✅ All demos completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
  }
}

// Run demos if this file is executed directly
if (require.main === module) {
  runAllDemos().catch(console.error);
}

export {
  runAllDemos,
  demoProductRecommendations,
  demoPersonalizedRecommendations,
  demoCrossSellRecommendations,
  demoTrendingProducts,
  demoCacheStats,
  sampleProducts
};
