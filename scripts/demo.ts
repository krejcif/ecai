#!/usr/bin/env tsx

/**
 * Demo Script
 *
 * Demonstrates all major features of the EcommerceIQ platform:
 * - Product data generation and storage
 * - Review generation and sentiment analysis
 * - Supplier data and risk scoring
 * - Vector search capabilities
 * - Analytics and insights
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { v4 as uuidv4 } from 'uuid';
import { VectorStore } from '../src/database/vector-store';
import { EmbeddingService } from '../src/database/embeddings';
import { CollectionName } from '../src/database/collections';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

interface DemoProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  brand: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  source: string;
}

interface DemoReview {
  id: string;
  productId: string;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  rating: number;
  date: string;
}

interface DemoSupplier {
  id: string;
  name: string;
  location: string;
  riskScore: number;
  description: string;
  capabilities: string[];
}

/**
 * Generate diverse sample products
 */
function generateProducts(count: number = 50): DemoProduct[] {
  const categories = [
    { name: 'Electronics', brands: ['TechCo', 'ElectroMax', 'GadgetPro', 'SmartTech'] },
    { name: 'Clothing', brands: ['FashionHub', 'StyleWear', 'UrbanThreads', 'ElegantFit'] },
    { name: 'Food & Beverage', brands: ['NatureFood', 'OrganicLife', 'FreshTaste', 'PureEats'] },
    { name: 'Home & Garden', brands: ['HomeEssentials', 'GardenPro', 'CozyLiving', 'OutdoorLife'] },
    { name: 'Sports & Outdoors', brands: ['ActiveGear', 'SportMax', 'FitPro', 'AdventureWear'] },
    { name: 'Beauty & Personal Care', brands: ['BeautyPure', 'GlowCare', 'NaturalBeauty', 'VitalSkin'] },
    { name: 'Books & Media', brands: ['ReadWell', 'MediaHub', 'BookWorld', 'KnowledgePress'] },
    { name: 'Toys & Games', brands: ['PlayFun', 'ToyMaster', 'GameZone', 'KidsJoy'] },
  ];

  const products: DemoProduct[] = [];

  const productTemplates = [
    { prefix: 'Premium', suffix: 'Pro' },
    { prefix: 'Ultra', suffix: 'Max' },
    { prefix: 'Deluxe', suffix: 'Plus' },
    { prefix: 'Essential', suffix: 'Basic' },
    { prefix: 'Smart', suffix: 'AI' },
  ];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const brand = category.brands[Math.floor(Math.random() * category.brands.length)];
    const template = productTemplates[Math.floor(Math.random() * productTemplates.length)];

    const basePrice = 10 + Math.random() * 490;
    const rating = 3 + Math.random() * 2;
    const reviewCount = Math.floor(10 + Math.random() * 1000);

    products.push({
      id: uuidv4(),
      name: `${template.prefix} ${category.name} ${template.suffix} ${i + 1}`,
      description: `High-quality ${category.name.toLowerCase()} product from ${brand}. Features advanced technology and premium materials for exceptional performance.`,
      category: category.name,
      price: Math.round(basePrice * 100) / 100,
      currency: 'USD',
      brand,
      rating: Math.round(rating * 10) / 10,
      reviewCount,
      tags: [category.name, brand, template.prefix.toLowerCase(), template.suffix.toLowerCase()],
      source: 'demo',
    });
  }

  return products;
}

/**
 * Generate sample reviews for products
 */
function generateReviews(products: DemoProduct[], reviewsPerProduct: number = 3): DemoReview[] {
  const positiveReviews = [
    "Absolutely love this product! Exceeded my expectations.",
    "Great quality and fast shipping. Highly recommend!",
    "Best purchase I've made this year. Worth every penny.",
    "Fantastic product! Works exactly as described.",
    "Amazing quality and excellent customer service.",
  ];

  const negativeReviews = [
    "Disappointed with the quality. Not as advertised.",
    "Product arrived damaged. Poor packaging.",
    "Overpriced for what you get. Not worth it.",
    "Stopped working after a week. Very unreliable.",
    "Customer service was unhelpful. Wouldn't recommend.",
  ];

  const neutralReviews = [
    "It's okay. Does the job but nothing special.",
    "Average product. Met basic expectations.",
    "Decent quality for the price point.",
    "Works as expected. No complaints, no praise.",
    "Standard product. Nothing extraordinary.",
  ];

  const reviews: DemoReview[] = [];

  for (const product of products) {
    for (let i = 0; i < reviewsPerProduct; i++) {
      let sentiment: 'positive' | 'negative' | 'neutral';
      let rating: number;
      let text: string;

      const rand = Math.random();
      if (rand < 0.6) {
        sentiment = 'positive';
        rating = 4 + Math.floor(Math.random() * 2);
        text = positiveReviews[Math.floor(Math.random() * positiveReviews.length)];
      } else if (rand < 0.8) {
        sentiment = 'neutral';
        rating = 3;
        text = neutralReviews[Math.floor(Math.random() * neutralReviews.length)];
      } else {
        sentiment = 'negative';
        rating = 1 + Math.floor(Math.random() * 2);
        text = negativeReviews[Math.floor(Math.random() * negativeReviews.length)];
      }

      const daysAgo = Math.floor(Math.random() * 90);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      reviews.push({
        id: uuidv4(),
        productId: product.id,
        text,
        sentiment,
        rating,
        date: date.toISOString(),
      });
    }
  }

  return reviews;
}

/**
 * Generate sample suppliers
 */
function generateSuppliers(count: number = 20): DemoSupplier[] {
  const locations = [
    'China', 'Vietnam', 'India', 'Thailand', 'Bangladesh',
    'Turkey', 'Mexico', 'Poland', 'Italy', 'Germany'
  ];

  const capabilities = [
    'Manufacturing', 'Assembly', 'Packaging', 'Quality Control',
    'Logistics', 'Raw Materials', 'Design', 'R&D'
  ];

  const suppliers: DemoSupplier[] = [];

  for (let i = 0; i < count; i++) {
    const location = locations[i % locations.length];
    const riskScore = Math.round((Math.random() * 10) * 10) / 10;
    const supplierCapabilities = capabilities
      .filter(() => Math.random() > 0.5)
      .slice(0, 3 + Math.floor(Math.random() * 3));

    suppliers.push({
      id: uuidv4(),
      name: `Global Supplier ${i + 1}`,
      location,
      riskScore,
      description: `Established supplier based in ${location} with expertise in ${supplierCapabilities.join(', ').toLowerCase()}.`,
      capabilities: supplierCapabilities,
    });
  }

  return suppliers;
}

/**
 * Insert products into vector database
 */
async function insertProducts(
  vectorStore: VectorStore,
  embeddingService: EmbeddingService,
  products: DemoProduct[]
): Promise<void> {
  const spinner = ora('Generating product embeddings...').start();

  try {
    const documents = [];

    for (const product of products) {
      const vector = await embeddingService.embedProduct({
        name: product.name,
        description: product.description,
        category: product.category,
      });

      documents.push({
        id: product.id,
        vector,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        source: product.source,
        brand: product.brand,
        rating: product.rating,
        reviewCount: product.reviewCount,
      });
    }

    spinner.text = 'Inserting products into database...';
    await vectorStore.insertBatch(CollectionName.PRODUCTS, documents);
    spinner.succeed(chalk.green(`Inserted ${products.length} products`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to insert products'));
    throw error;
  }
}

/**
 * Insert reviews into vector database
 */
async function insertReviews(
  vectorStore: VectorStore,
  embeddingService: EmbeddingService,
  reviews: DemoReview[]
): Promise<void> {
  const spinner = ora('Generating review embeddings...').start();

  try {
    const documents = [];

    for (const review of reviews) {
      const vector = await embeddingService.embedReview({
        text: review.text,
        rating: review.rating,
      });

      documents.push({
        id: review.id,
        vector,
        productId: review.productId,
        text: review.text,
        sentiment: review.sentiment,
        rating: review.rating,
        date: review.date,
      });
    }

    spinner.text = 'Inserting reviews into database...';
    await vectorStore.insertBatch(CollectionName.REVIEWS, documents);
    spinner.succeed(chalk.green(`Inserted ${reviews.length} reviews`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to insert reviews'));
    throw error;
  }
}

/**
 * Insert suppliers into vector database
 */
async function insertSuppliers(
  vectorStore: VectorStore,
  embeddingService: EmbeddingService,
  suppliers: DemoSupplier[]
): Promise<void> {
  const spinner = ora('Generating supplier embeddings...').start();

  try {
    const documents = [];

    for (const supplier of suppliers) {
      const vector = await embeddingService.embedSupplier({
        name: supplier.name,
        location: supplier.location,
        description: supplier.description,
      });

      documents.push({
        id: supplier.id,
        vector,
        name: supplier.name,
        location: supplier.location,
        riskScore: supplier.riskScore,
        description: supplier.description,
        capabilities: supplier.capabilities,
      });
    }

    spinner.text = 'Inserting suppliers into database...';
    await vectorStore.insertBatch(CollectionName.SUPPLIERS, documents);
    spinner.succeed(chalk.green(`Inserted ${suppliers.length} suppliers`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to insert suppliers'));
    throw error;
  }
}

/**
 * Run sample searches
 */
async function runSampleSearches(
  vectorStore: VectorStore,
  embeddingService: EmbeddingService
): Promise<void> {
  console.log(chalk.cyan.bold('\n📊 Running Sample Searches\n'));

  const searches = [
    'high-quality electronics for gaming',
    'organic food products',
    'comfortable athletic wear',
    'eco-friendly home products',
  ];

  for (const query of searches) {
    const spinner = ora(`Searching: "${query}"...`).start();

    try {
      const queryVector = await embeddingService.embed(query);
      const results = await vectorStore.search(CollectionName.PRODUCTS, queryVector, {
        limit: 3,
      });

      spinner.succeed(chalk.green(`Found ${results.length} results for "${query}"`));

      results.forEach((result, index) => {
        const doc = result.document as any;
        console.log(chalk.white(`  ${index + 1}. ${doc.name}`));
        console.log(chalk.gray(`     Score: ${result.score.toFixed(4)} | Category: ${doc.category} | Price: $${doc.price}`));
      });
      console.log('');
    } catch (error) {
      spinner.fail(chalk.red(`Search failed for "${query}"`));
    }
  }
}

/**
 * Show analytics output
 */
async function showAnalytics(
  products: DemoProduct[],
  reviews: DemoReview[],
  suppliers: DemoSupplier[]
): Promise<void> {
  console.log(chalk.cyan.bold('\n📈 Platform Analytics\n'));

  // Category distribution
  const categoryCount = new Map<string, number>();
  products.forEach(p => {
    categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1);
  });

  console.log(chalk.bold('Category Distribution:'));
  Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const percentage = ((count / products.length) * 100).toFixed(1);
      console.log(chalk.white(`  ${category}: ${count} products (${percentage}%)`));
    });

  // Price statistics
  const prices = products.map(p => p.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  console.log(chalk.bold('\nPrice Statistics:'));
  console.log(chalk.white(`  Average: $${avgPrice.toFixed(2)}`));
  console.log(chalk.white(`  Range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`));

  // Sentiment analysis
  const sentimentCount = {
    positive: reviews.filter(r => r.sentiment === 'positive').length,
    neutral: reviews.filter(r => r.sentiment === 'neutral').length,
    negative: reviews.filter(r => r.sentiment === 'negative').length,
  };

  console.log(chalk.bold('\nReview Sentiment:'));
  console.log(chalk.green(`  Positive: ${sentimentCount.positive} (${((sentimentCount.positive / reviews.length) * 100).toFixed(1)}%)`));
  console.log(chalk.yellow(`  Neutral: ${sentimentCount.neutral} (${((sentimentCount.neutral / reviews.length) * 100).toFixed(1)}%)`));
  console.log(chalk.red(`  Negative: ${sentimentCount.negative} (${((sentimentCount.negative / reviews.length) * 100).toFixed(1)}%)`));

  // Supplier risk
  const avgRisk = suppliers.reduce((a, b) => a + b.riskScore, 0) / suppliers.length;
  const highRisk = suppliers.filter(s => s.riskScore >= 7).length;

  console.log(chalk.bold('\nSupplier Risk:'));
  console.log(chalk.white(`  Average Risk Score: ${avgRisk.toFixed(2)}/10`));
  console.log(chalk.white(`  High Risk Suppliers: ${highRisk}`));

  console.log('');
}

/**
 * Main demo function
 */
async function main() {
  console.log(chalk.cyan.bold('\n🎬 EcommerceIQ Platform Demo\n'));

  try {
    // Initialize services
    const spinner = ora('Initializing services...').start();
    const vectorStore = new VectorStore({ dataPath: DATA_DIR });
    const embeddingService = new EmbeddingService();
    spinner.succeed(chalk.green('Services initialized'));

    // Generate sample data
    console.log(chalk.cyan.bold('\n📦 Generating Sample Data\n'));
    const products = generateProducts(50);
    const reviews = generateReviews(products, 3);
    const suppliers = generateSuppliers(20);

    console.log(chalk.white(`  Generated ${products.length} products`));
    console.log(chalk.white(`  Generated ${reviews.length} reviews`));
    console.log(chalk.white(`  Generated ${suppliers.length} suppliers\n`));

    // Save sample data to files
    fs.writeFileSync(
      path.join(DATA_DIR, 'demo-products.json'),
      JSON.stringify(products, null, 2)
    );
    fs.writeFileSync(
      path.join(DATA_DIR, 'demo-reviews.json'),
      JSON.stringify(reviews, null, 2)
    );
    fs.writeFileSync(
      path.join(DATA_DIR, 'demo-suppliers.json'),
      JSON.stringify(suppliers, null, 2)
    );

    // Initialize collections
    console.log(chalk.cyan.bold('🗄️  Initializing Database Collections\n'));
    await vectorStore.initCollection(CollectionName.PRODUCTS);
    await vectorStore.initCollection(CollectionName.REVIEWS);
    await vectorStore.initCollection(CollectionName.SUPPLIERS);

    // Insert data
    console.log(chalk.cyan.bold('\n💾 Inserting Data into Vector Database\n'));
    await insertProducts(vectorStore, embeddingService, products);
    await insertReviews(vectorStore, embeddingService, reviews);
    await insertSuppliers(vectorStore, embeddingService, suppliers);

    // Run searches
    await runSampleSearches(vectorStore, embeddingService);

    // Show analytics
    await showAnalytics(products, reviews, suppliers);

    // Success message
    console.log(chalk.cyan.bold('='.repeat(60)));
    console.log(chalk.green.bold('  ✅ Demo completed successfully!'));
    console.log(chalk.cyan.bold('='.repeat(60)) + '\n');

    console.log(chalk.bold('What to do next:\n'));
    console.log(chalk.white('  1. Try searching: npm run cli search "premium electronics"'));
    console.log(chalk.white('  2. Run analysis: npm run cli analyze pricing'));
    console.log(chalk.white('  3. Start API server: npm run cli serve'));
    console.log(chalk.white('  4. Load real data: tsx scripts/seed.ts\n'));

  } catch (error) {
    console.error(chalk.red('Demo failed:'), error);
    process.exit(1);
  }
}

// Run demo
main().catch((error) => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});
