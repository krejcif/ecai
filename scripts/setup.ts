#!/usr/bin/env tsx

/**
 * Setup Script
 *
 * Prepares the EcommerceIQ platform for first-time use:
 * - Creates necessary directories
 * - Initializes ruvector database
 * - Validates dependencies
 * - Prints setup instructions
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const COLLECTIONS = ['products', 'reviews', 'suppliers', 'trends'];

interface SetupConfig {
  dataDir: string;
  collections: string[];
  vectorDimension: number;
}

const config: SetupConfig = {
  dataDir: DATA_DIR,
  collections: COLLECTIONS,
  vectorDimension: 384,
};

/**
 * Check if required dependencies are installed
 */
function checkDependencies(): boolean {
  const spinner = ora('Checking dependencies...').start();

  try {
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 18) {
      spinner.fail(chalk.red('Node.js version 18 or higher is required'));
      console.log(chalk.yellow(`Current version: ${nodeVersion}`));
      return false;
    }

    // Check if ruvector is available
    try {
      execSync('npx ruvector --version', { stdio: 'pipe' });
    } catch (error) {
      spinner.warn(chalk.yellow('ruvector CLI not found, will be installed on first use'));
    }

    spinner.succeed(chalk.green('Dependencies validated'));
    return true;
  } catch (error) {
    spinner.fail(chalk.red('Dependency check failed'));
    console.error(error);
    return false;
  }
}

/**
 * Create necessary directories
 */
function createDirectories(): boolean {
  const spinner = ora('Creating directories...').start();

  try {
    const directories = [
      config.dataDir,
      path.join(config.dataDir, 'collections'),
      path.join(config.dataDir, 'cache'),
      path.join(PROJECT_ROOT, 'logs'),
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        spinner.text = `Created directory: ${path.relative(PROJECT_ROOT, dir)}`;
      }
    }

    spinner.succeed(chalk.green('Directories created'));
    return true;
  } catch (error) {
    spinner.fail(chalk.red('Failed to create directories'));
    console.error(error);
    return false;
  }
}

/**
 * Initialize vector database collections
 */
async function initializeDatabase(): Promise<boolean> {
  const spinner = ora('Initializing vector database...').start();

  try {
    for (const collection of config.collections) {
      const collectionPath = path.join(config.dataDir, collection);

      // Skip if collection already exists
      if (fs.existsSync(collectionPath) && fs.readdirSync(collectionPath).length > 0) {
        spinner.text = `Collection '${collection}' already exists, skipping...`;
        continue;
      }

      spinner.text = `Creating collection: ${collection}...`;

      try {
        // Create collection using ruvector CLI
        const command = `npx ruvector create "${collectionPath}" --dimension ${config.vectorDimension} --metric cosine`;
        execSync(command, { stdio: 'pipe' });

        spinner.text = `Created collection: ${collection}`;
      } catch (error: any) {
        // If collection already exists, that's okay
        if (error.message?.includes('already exists')) {
          spinner.text = `Collection '${collection}' already initialized`;
        } else {
          throw error;
        }
      }
    }

    spinner.succeed(chalk.green('Vector database initialized'));
    return true;
  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize database'));
    console.error(error);
    return false;
  }
}

/**
 * Create .env file if it doesn't exist
 */
function createEnvFile(): boolean {
  const spinner = ora('Checking environment configuration...').start();

  try {
    const envPath = path.join(PROJECT_ROOT, '.env');
    const envExamplePath = path.join(PROJECT_ROOT, '.env.example');

    if (!fs.existsSync(envPath)) {
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        spinner.succeed(chalk.green('Created .env file from .env.example'));
      } else {
        spinner.warn(chalk.yellow('.env.example not found, skipping...'));
      }
    } else {
      spinner.succeed(chalk.green('.env file already exists'));
    }

    return true;
  } catch (error) {
    spinner.fail(chalk.red('Failed to create .env file'));
    console.error(error);
    return false;
  }
}

/**
 * Print setup instructions
 */
function printInstructions(): void {
  console.log('\n' + chalk.cyan.bold('='.repeat(60)));
  console.log(chalk.cyan.bold('  EcommerceIQ Platform - Setup Complete!'));
  console.log(chalk.cyan.bold('='.repeat(60)) + '\n');

  console.log(chalk.green('✓ All setup tasks completed successfully!\n'));

  console.log(chalk.bold('Next Steps:\n'));

  console.log(chalk.cyan('1. Run the demo:'));
  console.log(chalk.white('   npm run cli demo\n'));

  console.log(chalk.cyan('2. Seed with real data:'));
  console.log(chalk.white('   tsx scripts/seed.ts\n'));

  console.log(chalk.cyan('3. Start the API server:'));
  console.log(chalk.white('   npm run cli serve\n'));

  console.log(chalk.cyan('4. Search for products:'));
  console.log(chalk.white('   npm run cli search "organic coffee"\n'));

  console.log(chalk.cyan('5. Run analysis:'));
  console.log(chalk.white('   npm run cli analyze trends --category food\n'));

  console.log(chalk.bold('\nUseful Commands:\n'));
  console.log(chalk.white('  npm run cli --help       # Show all available commands'));
  console.log(chalk.white('  npm run cli init         # Initialize the platform'));
  console.log(chalk.white('  npm run cli ingest --all # Ingest data from all sources'));
  console.log(chalk.white('  npm run dashboard        # Start the web dashboard\n'));

  console.log(chalk.bold('Documentation:\n'));
  console.log(chalk.white('  README.md                # Main documentation'));
  console.log(chalk.white('  data/                    # Sample data files'));
  console.log(chalk.white('  scripts/                 # Utility scripts\n'));

  console.log(chalk.cyan.bold('='.repeat(60)) + '\n');
}

/**
 * Main setup function
 */
async function main() {
  console.log(chalk.cyan.bold('\n🚀 EcommerceIQ Platform Setup\n'));

  let success = true;

  // Run setup steps
  success = checkDependencies() && success;
  success = createDirectories() && success;
  success = createEnvFile() && success;
  success = await initializeDatabase() && success;

  if (success) {
    printInstructions();
    process.exit(0);
  } else {
    console.log(chalk.red('\n❌ Setup failed. Please fix the errors above and try again.\n'));
    process.exit(1);
  }
}

// Run setup
main().catch((error) => {
  console.error(chalk.red('Setup failed:'), error);
  process.exit(1);
});
