/**
 * RuVector Interactive Demo
 *
 * Showcases all features of the RuVector-powered EcommerceIQ platform
 */

import chalk from 'chalk';
import { VectorStore, EmbeddingService, CollectionName } from '../database/index.js';
import { ProductDocument, ReviewDocument } from '../database/collections.js';

// ============================================================================
// Demo Data
// ============================================================================

const DEMO_PRODUCTS: Omit<ProductDocument, 'vector'>[] = [
  {
    id: 'P001',
    name: 'Organic Colombian Coffee Beans Premium Dark Roast',
    description: 'Premium organic coffee beans from the mountains of Colombia. Rich, bold flavor with notes of chocolate and caramel.',
    category: 'Food & Beverage',
    price: 24.99,
    source: 'demo',
    metadata: { brand: 'Mountain Roasters', rating: 4.8, stock: 150 }
  },
  {
    id: 'P002',
    name: 'Wireless Bluetooth Noise Cancelling Headphones',
    description: 'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and superior sound quality.',
    category: 'Electronics',
    price: 149.99,
    source: 'demo',
    metadata: { brand: 'AudioTech', rating: 4.6, stock: 85 }
  },
  {
    id: 'P003',
    name: 'Yoga Mat Premium Non-Slip Eco-Friendly',
    description: 'Extra thick yoga mat made from sustainable materials. Perfect grip and cushioning for all yoga styles.',
    category: 'Sports & Fitness',
    price: 49.99,
    source: 'demo',
    metadata: { brand: 'ZenFit', rating: 4.7, stock: 200 }
  },
  {
    id: 'P004',
    name: 'Stainless Steel Insulated Water Bottle 32oz',
    description: 'Double-wall insulated water bottle keeps drinks cold for 24 hours or hot for 12 hours. BPA-free and leak-proof.',
    category: 'Home & Kitchen',
    price: 29.99,
    source: 'demo',
    metadata: { brand: 'HydroLife', rating: 4.9, stock: 320 }
  },
  {
    id: 'P005',
    name: 'Mechanical Gaming Keyboard RGB Backlit',
    description: 'Professional gaming keyboard with mechanical switches, customizable RGB lighting, and programmable keys.',
    category: 'Electronics',
    price: 119.99,
    source: 'demo',
    metadata: { brand: 'GamePro', rating: 4.5, stock: 95 }
  },
  {
    id: 'P006',
    name: 'Running Shoes Lightweight Breathable',
    description: 'Lightweight running shoes with breathable mesh upper and responsive cushioning. Perfect for long-distance running.',
    category: 'Sports & Fitness',
    price: 89.99,
    source: 'demo',
    metadata: { brand: 'RunFast', rating: 4.4, stock: 150 }
  },
  {
    id: 'P007',
    name: 'Smart Fitness Tracker Watch Heart Rate Monitor',
    description: 'Advanced fitness tracker with heart rate monitoring, sleep tracking, GPS, and smartphone notifications.',
    category: 'Electronics',
    price: 79.99,
    source: 'demo',
    metadata: { brand: 'FitTrack', rating: 4.3, stock: 180 }
  },
  {
    id: 'P008',
    name: 'Organic Green Tea Matcha Powder Japanese Grade',
    description: 'Ceremonial grade matcha powder from Japan. Rich in antioxidants and perfect for traditional tea ceremonies or lattes.',
    category: 'Food & Beverage',
    price: 29.99,
    source: 'demo',
    metadata: { brand: 'TeaZen', rating: 4.8, stock: 125 }
  }
];

const DEMO_REVIEWS: Omit<ReviewDocument, 'vector'>[] = [
  {
    id: 'R001',
    productId: 'P001',
    text: 'Absolutely love this coffee! The flavor is rich and smooth, perfect for my morning routine.',
    sentiment: 'positive',
    rating: 5,
    date: '2025-12-20',
    metadata: { verified: true, helpful: 45 }
  },
  {
    id: 'R002',
    productId: 'P001',
    text: 'Good coffee but a bit expensive for the quantity. Taste is great though.',
    sentiment: 'neutral',
    rating: 4,
    date: '2025-12-18',
    metadata: { verified: true, helpful: 12 }
  },
  {
    id: 'R003',
    productId: 'P002',
    text: 'These headphones are amazing! Noise cancellation works perfectly and battery lasts forever.',
    sentiment: 'positive',
    rating: 5,
    date: '2025-12-19',
    metadata: { verified: true, helpful: 78 }
  },
  {
    id: 'R004',
    productId: 'P002',
    text: 'Sound quality is good but bluetooth connection drops sometimes. A bit disappointing for the price.',
    sentiment: 'negative',
    rating: 3,
    date: '2025-12-17',
    metadata: { verified: true, helpful: 23 }
  },
  {
    id: 'R005',
    productId: 'P003',
    text: 'Best yoga mat I have ever owned! Great cushioning and the grip is excellent even when sweaty.',
    sentiment: 'positive',
    rating: 5,
    date: '2025-12-21',
    metadata: { verified: true, helpful: 56 }
  },
  {
    id: 'R006',
    productId: 'P004',
    text: 'This water bottle is incredible! Keeps my drinks cold all day. Highly recommend!',
    sentiment: 'positive',
    rating: 5,
    date: '2025-12-22',
    metadata: { verified: true, helpful: 89 }
  }
];

// ============================================================================
// Demo Functions
// ============================================================================

/**
 * Generate a simple embedding for demo purposes
 */
function generateDemoEmbedding(text: string): number[] {
  const vector: number[] = [];
  const normalized = text.toLowerCase();

  for (let i = 0; i < 384; i++) {
    let value = 0;
    for (let j = 0; j < normalized.length; j++) {
      value += Math.sin((normalized.charCodeAt(j) * (i + 1) * (j + 1)) / 1000);
    }
    vector.push(Math.tanh(value / normalized.length));
  }

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / magnitude);
}

/**
 * Calculate cosine similarity
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Print section header
 */
function printHeader(title: string) {
  console.log('\n' + chalk.bold.cyan('='.repeat(80)));
  console.log(chalk.bold.cyan('  ' + title));
  console.log(chalk.bold.cyan('='.repeat(80)) + '\n');
}

/**
 * Print success message
 */
function printSuccess(message: string) {
  console.log(chalk.green('✓') + ' ' + message);
}

/**
 * Print info message
 */
function printInfo(message: string) {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

/**
 * Print result
 */
function printResult(label: string, value: any) {
  console.log(chalk.yellow('  →') + ' ' + chalk.bold(label + ':') + ' ' + value);
}

// ============================================================================
// Demo 1: Semantic Search
// ============================================================================

export async function demo_search() {
  printHeader('Demo 1: Semantic Search');

  printInfo('Demonstrating semantic product search using vector embeddings...');
  console.log();

  // Generate embeddings for all products
  const productVectors = DEMO_PRODUCTS.map(p => ({
    ...p,
    vector: generateDemoEmbedding(p.name + ' ' + p.description + ' ' + p.category)
  }));

  // Search queries
  const queries = [
    'coffee beans for morning',
    'noise cancelling headphones for work',
    'fitness equipment for home workout'
  ];

  for (const query of queries) {
    console.log(chalk.bold('Query: "' + query + '"'));
    const queryVector = generateDemoEmbedding(query);

    // Calculate similarities
    const results = productVectors
      .map(p => ({
        product: p,
        similarity: cosineSimilarity(queryVector, p.vector)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    console.log(chalk.gray('  Top 3 Results:'));
    results.forEach((result, idx) => {
      console.log(chalk.yellow('  ' + (idx + 1) + '.') + ' ' + result.product.name);
      printResult('   Similarity', (result.similarity * 100).toFixed(1) + '%');
      printResult('   Price', '$' + result.product.price);
      printResult('   Category', result.product.category);
      console.log();
    });
  }

  printSuccess('Semantic search demo completed successfully!');
  printInfo('Searched ' + DEMO_PRODUCTS.length + ' products using vector similarity');
}

// ============================================================================
// Demo 2: Product Recommendations
// ============================================================================

export async function demo_recommendations() {
  printHeader('Demo 2: Product Recommendations');

  printInfo('Demonstrating collaborative filtering and similar product recommendations...');
  console.log();

  const productVectors = DEMO_PRODUCTS.map(p => ({
    ...p,
    vector: generateDemoEmbedding(p.name + ' ' + p.description + ' ' + p.category)
  }));

  // Get recommendations for specific products
  const targetProducts = ['P001', 'P002', 'P003'];

  for (const productId of targetProducts) {
    const targetProduct = productVectors.find(p => p.id === productId);
    if (!targetProduct) continue;

    console.log(chalk.bold('Recommendations for: ' + targetProduct.name));
    printResult('Category', targetProduct.category);
    printResult('Price', '$' + targetProduct.price);
    console.log();

    // Find similar products
    const recommendations = productVectors
      .filter(p => p.id !== productId)
      .map(p => ({
        product: p,
        similarity: cosineSimilarity(targetProduct.vector, p.vector)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    console.log(chalk.gray('  Similar Products:'));
    recommendations.forEach((rec, idx) => {
      console.log(chalk.yellow('  ' + (idx + 1) + '.') + ' ' + rec.product.name);
      printResult('   Match Score', (rec.similarity * 100).toFixed(1) + '%');
      printResult('   Price', '$' + rec.product.price);
      printResult('   Category', rec.product.category);
      console.log();
    });
  }

  printSuccess('Product recommendation demo completed successfully!');
  printInfo('Generated recommendations based on vector similarity');
}

// ============================================================================
// Demo 3: Auto-Categorization
// ============================================================================

export async function demo_categorization() {
  printHeader('Demo 3: Automatic Categorization');

  printInfo('Demonstrating automatic product categorization using embeddings...');
  console.log();

  // Category embeddings
  const categories = [
    'Food & Beverage',
    'Electronics',
    'Sports & Fitness',
    'Home & Kitchen'
  ];

  const categoryVectors = categories.map(cat => ({
    name: cat,
    vector: generateDemoEmbedding(cat)
  }));

  // Test products (without category labels)
  const testProducts = [
    { name: 'Premium Dark Chocolate Bar', description: 'Artisan chocolate with 70% cacao' },
    { name: 'Laptop Stand Aluminum', description: 'Ergonomic laptop stand for desk setup' },
    { name: 'Resistance Bands Set', description: 'Exercise bands for strength training' },
    { name: 'Coffee Grinder Electric', description: 'Burr grinder for fresh coffee grounds' }
  ];

  testProducts.forEach(product => {
    console.log(chalk.bold('Product: ' + product.name));
    printInfo(product.description);
    console.log();

    const productVector = generateDemoEmbedding(product.name + ' ' + product.description);

    // Calculate category similarities
    const categoryScores = categoryVectors
      .map(cat => ({
        category: cat.name,
        confidence: cosineSimilarity(productVector, cat.vector)
      }))
      .sort((a, b) => b.confidence - a.confidence);

    console.log(chalk.gray('  Category Predictions:'));
    categoryScores.forEach((score, idx) => {
      const icon = idx === 0 ? chalk.green('✓') : chalk.gray('○');
      console.log('  ' + icon + ' ' + score.category + ' - ' + (score.confidence * 100).toFixed(1) + '% confidence');
    });
    console.log();
  });

  printSuccess('Auto-categorization demo completed successfully!');
  printInfo('Categorized products using semantic similarity to category embeddings');
}

// ============================================================================
// Demo 4: Price Intelligence
// ============================================================================

export async function demo_pricing() {
  printHeader('Demo 4: Price Intelligence');

  printInfo('Demonstrating price analysis and competitive intelligence...');
  console.log();

  // Group products by category
  const categoryGroups = new Map<string, typeof DEMO_PRODUCTS>();
  DEMO_PRODUCTS.forEach(p => {
    const products = categoryGroups.get(p.category) || [];
    products.push(p);
    categoryGroups.set(p.category, products);
  });

  // Analyze each category
  for (const [category, products] of categoryGroups.entries()) {
    console.log(chalk.bold('Category: ' + category));
    console.log();

    const prices = products.map(p => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] || avgPrice;

    printResult('Products', products.length);
    printResult('Avg Price', '$' + avgPrice.toFixed(2));
    printResult('Min Price', '$' + minPrice.toFixed(2));
    printResult('Max Price', '$' + maxPrice.toFixed(2));
    printResult('Median Price', '$' + medianPrice.toFixed(2));
    console.log();

    // Price recommendations
    console.log(chalk.gray('  Price Positioning:'));
    products.forEach(p => {
      const position = p.price < avgPrice ? chalk.green('Budget') :
                      p.price > avgPrice * 1.2 ? chalk.red('Premium') :
                      chalk.yellow('Mid-Range');
      console.log('  • ' + p.name.substring(0, 40) + '...');
      printResult('   Price', '$' + p.price);
      printResult('   Position', position);
      const vsAvg = ((p.price - avgPrice) / avgPrice * 100).toFixed(0);
      printResult('   vs Avg', (Number(vsAvg) > 0 ? '+' : '') + vsAvg + '%');
      console.log();
    });
  }

  // Price trend simulation
  console.log(chalk.bold('Price Trends (Simulated):'));
  console.log();

  const sampleProduct = DEMO_PRODUCTS[0];
  const priceHistory = [
    { date: '2025-09-01', price: 27.99 },
    { date: '2025-10-01', price: 26.99 },
    { date: '2025-11-01', price: 25.99 },
    { date: '2025-12-01', price: 24.99 }
  ];

  console.log('  Product: ' + sampleProduct.name);
  console.log();
  priceHistory.forEach((point, index) => {
    const change = index === 0 ? 0 : 
                   ((point.price - priceHistory[index - 1].price) / 
                    priceHistory[index - 1].price * 100);
    const arrow = change < 0 ? chalk.green('↓') : change > 0 ? chalk.red('↑') : '→';
    console.log('  ' + point.date + ': $' + point.price.toFixed(2) + ' ' + arrow + ' ' + Math.abs(change).toFixed(1) + '%');
  });
  console.log();

  const totalChange = ((priceHistory[priceHistory.length - 1].price - priceHistory[0].price) / priceHistory[0].price * 100);
  printSuccess('Price decreased by ' + Math.abs(totalChange).toFixed(1) + '% over 3 months');
  printInfo('Predicted trend: Stable with potential for slight decrease');
}

// ============================================================================
// Demo 5: Sentiment Analysis
// ============================================================================

export async function demo_sentiment() {
  printHeader('Demo 5: Sentiment Analysis');

  printInfo('Demonstrating review sentiment analysis...');
  console.log();

  // Analyze reviews by product
  const reviewsByProduct = new Map<string, typeof DEMO_REVIEWS>();
  DEMO_REVIEWS.forEach(r => {
    const reviews = reviewsByProduct.get(r.productId) || [];
    reviews.push(r);
    reviewsByProduct.set(r.productId, reviews);
  });

  for (const [productId, reviews] of reviewsByProduct.entries()) {
    const product = DEMO_PRODUCTS.find(p => p.id === productId);
    if (!product) continue;

    console.log(chalk.bold('Product: ' + product.name));
    console.log();

    // Calculate sentiment stats
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    reviews.forEach(r => sentiments[r.sentiment]++);

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const sentimentScore = (sentiments.positive - sentiments.negative) / reviews.length;

    printResult('Total Reviews', reviews.length);
    printResult('Avg Rating', avgRating.toFixed(1) + '/5.0');
    printResult('Sentiment Score', sentimentScore.toFixed(2));
    console.log();

    console.log(chalk.gray('  Sentiment Distribution:'));
    console.log('  ' + chalk.green('●') + ' Positive: ' + sentiments.positive + ' (' + (sentiments.positive / reviews.length * 100).toFixed(0) + '%)');
    console.log('  ' + chalk.yellow('●') + ' Neutral:  ' + sentiments.neutral + ' (' + (sentiments.neutral / reviews.length * 100).toFixed(0) + '%)');
    console.log('  ' + chalk.red('●') + ' Negative: ' + sentiments.negative + ' (' + (sentiments.negative / reviews.length * 100).toFixed(0) + '%)');
    console.log();

    console.log(chalk.gray('  Recent Reviews:'));
    reviews.slice(0, 2).forEach(r => {
      const icon = r.sentiment === 'positive' ? chalk.green('✓') :
                   r.sentiment === 'negative' ? chalk.red('✗') : chalk.yellow('○');
      console.log('  ' + icon + ' "' + r.text.substring(0, 70) + '..."');
      printResult('   Rating', r.rating + '/5');
      printResult('   Sentiment', r.sentiment);
      console.log();
    });
  }

  printSuccess('Sentiment analysis demo completed successfully!');
  printInfo('Analyzed ' + DEMO_REVIEWS.length + ' reviews across ' + reviewsByProduct.size + ' products');
}

// ============================================================================
// Run All Demos
// ============================================================================

export async function runAllDemos() {
  console.log(chalk.bold.magenta('\n╔═══════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║                                                                           ║'));
  console.log(chalk.bold.magenta('║              RuVector EcommerceIQ - Interactive Demo Suite                ║'));
  console.log(chalk.bold.magenta('║                                                                           ║'));
  console.log(chalk.bold.magenta('╚═══════════════════════════════════════════════════════════════════════════╝\n'));

  try {
    await demo_search();
    await demo_recommendations();
    await demo_categorization();
    await demo_pricing();
    await demo_sentiment();

    console.log(chalk.bold.green('\n✓ All demos completed successfully!\n'));
  } catch (error) {
    console.error(chalk.red('\n✗ Demo failed:'), error);
    throw error;
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

if (require.main === module) {
  runAllDemos().catch(console.error);
}
