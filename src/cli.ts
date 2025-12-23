#!/usr/bin/env node

/**
 * EcommerceIQ CLI
 *
 * Command-line interface for the EcommerceIQ platform
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { config } from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import EcommerceIQ, {
  SearchQuerySchema,
  AnalysisTypeSchema,
  type SearchQuery,
  type AnalysisType
} from './index.js';

// Load environment variables
config();

const program = new Command();
const platform = new EcommerceIQ();

// ============================================================================
// CLI Configuration
// ============================================================================

program
  .name('ecommerce-iq')
  .description('AI-powered ecommerce intelligence platform')
  .version('1.0.0');

// ============================================================================
// Command: init
// ============================================================================

program
  .command('init')
  .description('Initialize the database and core services')
  .option('--reset', 'Reset the database before initialization')
  .action(async (options) => {
    const spinner = ora('Initializing EcommerceIQ platform...').start();

    try {
      if (options.reset) {
        await platform.database.clear();
        spinner.text = 'Database reset complete';
      }

      await platform.initialize();
      spinner.succeed(chalk.green('Platform initialized successfully!'));

      const stats = await platform.getStats();
      console.log(chalk.cyan('\nPlatform Status:'));
      console.log(`  Total Products: ${stats.totalProducts}`);
      console.log(`  Categories: ${stats.totalCategories}`);
      console.log(`  Data Sources: ${stats.totalSources}`);
    } catch (error) {
      spinner.fail(chalk.red('Initialization failed'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// ============================================================================
// Command: ingest
// ============================================================================

program
  .command('ingest')
  .description('Ingest data from open data sources')
  .option('-s, --source <name>', 'Specific data source to ingest from')
  .option('--all', 'Ingest from all available sources')
  .action(async (options) => {
    const spinner = ora('Starting data ingestion...').start();

    try {
      await platform.initialize();

      if (options.all) {
        spinner.text = 'Ingesting from all open data sources...';
        await platform.ingestion.ingestOpenDataSources();
      } else if (options.source) {
        spinner.text = `Ingesting from ${options.source}...`;
        // TODO: Implement source-specific ingestion
        console.log(chalk.yellow('\nSource-specific ingestion not yet implemented'));
      } else {
        spinner.warn(chalk.yellow('No source specified. Use --all or -s <source>'));
        return;
      }

      const stats = await platform.getStats();
      spinner.succeed(chalk.green('Data ingestion completed!'));

      console.log(chalk.cyan('\nIngestion Summary:'));
      console.log(`  Total Products: ${stats.totalProducts}`);
      console.log(`  Categories: ${stats.totalCategories}`);
      console.log(`  Sources: ${stats.sources.join(', ')}`);
    } catch (error) {
      spinner.fail(chalk.red('Ingestion failed'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// ============================================================================
// Command: search
// ============================================================================

program
  .command('search')
  .description('Search for products using semantic search')
  .argument('<query>', 'Search query')
  .option('-c, --category <category>', 'Filter by category')
  .option('--min-price <price>', 'Minimum price filter', parseFloat)
  .option('--max-price <price>', 'Maximum price filter', parseFloat)
  .option('-b, --brand <brands...>', 'Filter by brand(s)')
  .option('-r, --min-rating <rating>', 'Minimum rating filter', parseFloat)
  .option('-l, --limit <number>', 'Maximum number of results', '10')
  .option('--json', 'Output results as JSON')
  .action(async (query, options) => {
    const spinner = ora('Searching products...').start();

    try {
      await platform.initialize();

      const searchQuery: SearchQuery = {
        query,
        category: options.category,
        minPrice: options.minPrice,
        maxPrice: options.maxPrice,
        brands: options.brand,
        minRating: options.minRating,
        limit: parseInt(options.limit),
      };

      const results = await platform.search(searchQuery);
      spinner.succeed(chalk.green(`Found ${results.length} products`));

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(chalk.cyan('\nSearch Results:\n'));
        results.forEach((product, index) => {
          console.log(chalk.bold(`${index + 1}. ${product.name}`));
          console.log(`   Category: ${product.category}`);
          console.log(`   Price: $${product.price.toFixed(2)} ${product.currency}`);
          if (product.brand) console.log(`   Brand: ${product.brand}`);
          if (product.rating) console.log(`   Rating: ${product.rating}/5 (${product.reviewCount || 0} reviews)`);
          if (product.description) console.log(`   Description: ${product.description.substring(0, 100)}...`);
          console.log(`   Source: ${product.source}`);
          console.log('');
        });
      }
    } catch (error) {
      spinner.fail(chalk.red('Search failed'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// ============================================================================
// Command: analyze
// ============================================================================

program
  .command('analyze')
  .description('Run analysis on product data')
  .argument('<type>', 'Analysis type: trends, sentiment, pricing, competitive')
  .option('-c, --category <category>', 'Filter by category')
  .option('--json', 'Output results as JSON')
  .action(async (type, options) => {
    const spinner = ora(`Running ${type} analysis...`).start();

    try {
      // Validate analysis type
      const analysisType = AnalysisTypeSchema.parse(type) as AnalysisType;

      await platform.initialize();

      const results = await platform.analyze(analysisType, {
        category: options.category,
      });

      spinner.succeed(chalk.green(`${type} analysis completed!`));

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(chalk.cyan(`\n${type.toUpperCase()} Analysis Results:\n`));
        console.log(JSON.stringify(results, null, 2));
      }
    } catch (error) {
      spinner.fail(chalk.red('Analysis failed'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// ============================================================================
// Command: serve
// ============================================================================

program
  .command('serve')
  .description('Start the API server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-h, --host <host>', 'Host to bind to', '0.0.0.0')
  .action(async (options) => {
    const spinner = ora('Starting API server...').start();

    try {
      await platform.initialize();

      const app = express();
      const port = parseInt(options.port);
      const host = options.host;

      // Middleware
      app.use(helmet());
      app.use(cors());
      app.use(express.json());

      // Health check
      app.get('/health', (req: Request, res: Response) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      // Get platform stats
      app.get('/api/stats', async (req: Request, res: Response) => {
        try {
          const stats = await platform.getStats();
          res.json(stats);
        } catch (error) {
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Search products
      app.post('/api/search', async (req: Request, res: Response) => {
        try {
          const query = SearchQuerySchema.parse(req.body);
          const results = await platform.search(query);
          res.json({ results, count: results.length });
        } catch (error) {
          res.status(400).json({
            error: error instanceof Error ? error.message : 'Invalid request'
          });
        }
      });

      // Run analysis
      app.post('/api/analyze/:type', async (req: Request, res: Response) => {
        try {
          const type = AnalysisTypeSchema.parse(req.params.type);
          const results = await platform.analyze(type, req.body);
          res.json({ results });
        } catch (error) {
          res.status(400).json({
            error: error instanceof Error ? error.message : 'Invalid request'
          });
        }
      });

      // Get all products
      app.get('/api/products', async (req: Request, res: Response) => {
        try {
          const products = await platform.database.getAllProducts();
          res.json({ products, count: products.length });
        } catch (error) {
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Get single product
      app.get('/api/products/:id', async (req: Request, res: Response) => {
        try {
          const product = await platform.database.getProduct(req.params.id);
          if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
          }
          res.json(product);
        } catch (error) {
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      app.listen(port, host, () => {
        spinner.succeed(chalk.green('API server started successfully!'));
        console.log(chalk.cyan(`\nServer Information:`));
        console.log(`  URL: http://${host}:${port}`);
        console.log(`  Health: http://${host}:${port}/health`);
        console.log(`  API Docs: http://${host}:${port}/api`);
        console.log(chalk.yellow('\nPress Ctrl+C to stop the server'));
      });
    } catch (error) {
      spinner.fail(chalk.red('Failed to start server'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// ============================================================================
// Command: dashboard
// ============================================================================

program
  .command('dashboard')
  .description('Open the web dashboard')
  .option('-p, --port <port>', 'Port to use', '3000')
  .action(async (options) => {
    console.log(chalk.cyan('Opening web dashboard...'));
    console.log(chalk.yellow('\nDashboard feature coming soon!'));
    console.log(`Dashboard will be available at: http://localhost:${options.port}`);
    console.log('\nFor now, use the API server with: ecommerce-iq serve');
  });

// ============================================================================
// Command: demo
// ============================================================================

program
  .command('demo')
  .description('Run the interactive demo with sample data')
  .action(async () => {
    const spinner = ora('Starting demo...').start();

    try {
      // Import and run the demo script
      const { execSync } = await import('child_process');
      const path = await import('path');

      spinner.succeed(chalk.green('Demo starting...'));

      // Run the demo script
      const demoScript = path.join(__dirname, '../scripts/demo.ts');
      execSync(`tsx ${demoScript}`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

    } catch (error) {
      spinner.fail(chalk.red('Demo failed'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// ============================================================================
// Command: setup
// ============================================================================

program
  .command('setup')
  .description('Set up the platform for first-time use')
  .action(async () => {
    const spinner = ora('Running setup...').start();

    try {
      // Import and run the setup script
      const { execSync } = await import('child_process');
      const path = await import('path');

      spinner.succeed(chalk.green('Setup starting...'));

      // Run the setup script
      const setupScript = path.join(__dirname, '../scripts/setup.ts');
      execSync(`tsx ${setupScript}`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

    } catch (error) {
      spinner.fail(chalk.red('Setup failed'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// ============================================================================
// Parse and Execute
// ============================================================================

program.parse();
