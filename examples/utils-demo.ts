/**
 * Configuration & Utilities Demo
 *
 * Demonstrates how to use the configuration and utilities modules
 */

import { config } from '../src/config';
import { logger, cache, retry, validateProduct, isValidEmail } from '../src/utils';
import type { Product } from '../src/types';

// ===== Configuration Demo =====

async function demoConfiguration() {
  logger.info('=== Configuration Demo ===');

  // Get configuration
  const appConfig = config.get();
  logger.info('Environment:', { env: appConfig.environment });
  logger.info('Database path:', { path: config.getDatabasePath() });
  logger.info('API port:', { port: config.getValue('api', 'port') });

  // Update configuration
  config.update({
    logging: { level: 'debug' },
  });
  logger.debug('Configuration updated');

  // Check environment
  if (config.isDevelopment()) {
    logger.info('Running in development mode');
  }
}

// ===== Logger Demo =====

function demoLogger() {
  logger.info('=== Logger Demo ===');

  // Different log levels
  logger.debug('Debug message', { details: 'Additional context' });
  logger.info('Info message');
  logger.warn('Warning message');

  // Error logging
  try {
    throw new Error('Example error');
  } catch (error) {
    logger.error('Caught an error', error as Error);
  }

  // Child logger with context
  const userLogger = logger.child({ userId: '123', service: 'demo' });
  userLogger.info('User action logged');
}

// ===== Cache Demo =====

async function demoCache() {
  logger.info('=== Cache Demo ===');

  // Set and get
  cache.set('user:123', { name: 'John Doe', email: 'john@example.com' }, 3600);
  const user = cache.get('user:123');
  logger.info('Retrieved from cache:', user);

  // Lazy initialization
  const data = await cache.getOrSet(
    'expensive:data',
    async () => {
      logger.info('Computing expensive data...');
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { computed: true, timestamp: Date.now() };
    },
    3600
  );
  logger.info('Lazy loaded data:', data);

  // Cache stats
  const stats = cache.getStats();
  logger.info('Cache statistics:', {
    hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
    entries: stats.entries,
  });
}

// ===== Retry Demo =====

async function demoRetry() {
  logger.info('=== Retry Demo ===');

  let attempts = 0;

  // Simulate an API call that fails twice then succeeds
  const unreliableApi = async () => {
    attempts++;
    logger.info(`API attempt ${attempts}`);

    if (attempts < 3) {
      throw new Error('Temporary failure');
    }

    return { success: true, data: 'Important data' };
  };

  try {
    const result = await retry(unreliableApi, {
      maxRetries: 5,
      initialDelay: 100,
      maxDelay: 1000,
    });

    logger.info('Retry succeeded:', result);
  } catch (error) {
    logger.error('Retry failed', error as Error);
  }
}

// ===== Validation Demo =====

function demoValidation() {
  logger.info('=== Validation Demo ===');

  // Email validation
  const email = 'test@example.com';
  if (isValidEmail(email)) {
    logger.info('Email is valid:', { email });
  }

  // Product validation
  const productData: Partial<Product> = {
    title: 'Example Product',
    description: 'A great product',
    price: 99.99,
    url: 'https://example.com/product',
    currency: 'USD',
    inStock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validationResult = validateProduct(productData);

  if (validationResult.valid) {
    logger.info('Product is valid');
  } else {
    logger.warn('Product validation failed:', {
      errors: validationResult.errors,
    });
  }
}

// ===== Run All Demos =====

async function runDemo() {
  try {
    await demoConfiguration();
    console.log();

    demoLogger();
    console.log();

    await demoCache();
    console.log();

    await demoRetry();
    console.log();

    demoValidation();
    console.log();

    logger.info('=== Demo Complete ===');
  } catch (error) {
    logger.error('Demo failed', error as Error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runDemo();
}

export { runDemo };
