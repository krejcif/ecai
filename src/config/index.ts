/**
 * Configuration Management System
 *
 * Provides environment-based configuration with validation and default values
 */

import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import {
  Config,
  validateConfig,
  PartialConfig,
} from './schema';

// Load environment variables
loadEnv();

// ===== Default Configuration =====

const defaultConfig: Config = {
  environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',

  database: {
    path: process.env.DATABASE_PATH || './data/ecommerce.db',
    backup: process.env.DATABASE_BACKUP === 'true',
    backupPath: process.env.DATABASE_BACKUP_PATH || './data/backups',
  },

  api: {
    port: parseInt(process.env.API_PORT || '3000', 10),
    host: process.env.API_HOST || 'localhost',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
  },

  logging: {
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    file: process.env.LOG_FILE,
    console: process.env.LOG_CONSOLE !== 'false',
    structured: process.env.LOG_STRUCTURED === 'true',
    colorize: process.env.LOG_COLORIZE !== 'false',
  },

  cache: {
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
    enabled: process.env.CACHE_ENABLED !== 'false',
  },

  retry: {
    maxRetries: parseInt(process.env.RETRY_MAX_RETRIES || '3', 10),
    initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY || '1000', 10),
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '30000', 10),
    backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
    circuitBreaker: {
      enabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000', 10),
    },
  },

  ai: {
    provider: (process.env.AI_PROVIDER as 'openai' | 'anthropic' | 'local') || 'openai',
    apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10),
    timeout: parseInt(process.env.AI_TIMEOUT || '30000', 10),
  },

  search: {
    enabled: process.env.SEARCH_ENABLED !== 'false',
    indexPath: process.env.SEARCH_INDEX_PATH || './data/search-index',
    rebuildOnStart: process.env.SEARCH_REBUILD_ON_START === 'true',
    fuzzyThreshold: parseFloat(process.env.SEARCH_FUZZY_THRESHOLD || '0.8'),
    maxResults: parseInt(process.env.SEARCH_MAX_RESULTS || '50', 10),
  },

  scraping: {
    enabled: process.env.SCRAPING_ENABLED !== 'false',
    userAgent: process.env.SCRAPING_USER_AGENT || 'EcommerceIQ/1.0',
    timeout: parseInt(process.env.SCRAPING_TIMEOUT || '30000', 10),
    maxConcurrent: parseInt(process.env.SCRAPING_MAX_CONCURRENT || '5', 10),
    retryOnFailure: process.env.SCRAPING_RETRY_ON_FAILURE !== 'false',
    respectRobotsTxt: process.env.SCRAPING_RESPECT_ROBOTS_TXT !== 'false',
    delayBetweenRequests: parseInt(process.env.SCRAPING_DELAY_BETWEEN_REQUESTS || '1000', 10),
  },
};

// ===== Configuration Manager =====

class ConfigManager {
  private config: Config;
  private overrides: PartialConfig = {};

  constructor() {
    // Validate and initialize configuration
    this.config = validateConfig(defaultConfig);
  }

  /**
   * Get the current configuration
   */
  get(): Readonly<Config> {
    return { ...this.config, ...this.overrides };
  }

  /**
   * Get a specific configuration value by path
   */
  getValue<K extends keyof Config>(key: K): Config[K];
  getValue<K extends keyof Config, S extends keyof Config[K]>(
    key: K,
    subKey: S
  ): Config[K][S];
  getValue(key: string, subKey?: string): unknown {
    const config = this.get();
    if (subKey) {
      return (config[key as keyof Config] as Record<string, unknown>)?.[subKey];
    }
    return config[key as keyof Config];
  }

  /**
   * Set a configuration value
   */
  setValue<K extends keyof Config>(key: K, value: Config[K]): void {
    this.overrides[key] = value;
  }

  /**
   * Update configuration with partial values
   */
  update(updates: PartialConfig): void {
    this.overrides = { ...this.overrides, ...updates };
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.overrides = {};
    this.config = validateConfig(defaultConfig);
  }

  /**
   * Reload configuration from environment
   */
  reload(): void {
    loadEnv();
    this.config = validateConfig(defaultConfig);
    this.overrides = {};
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.get().environment === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.get().environment === 'development';
  }

  /**
   * Check if running in test mode
   */
  isTest(): boolean {
    return this.get().environment === 'test';
  }

  /**
   * Get database path (resolved to absolute path)
   */
  getDatabasePath(): string {
    const dbPath = this.get().database.path;
    return path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
  }

  /**
   * Get backup path (resolved to absolute path)
   */
  getBackupPath(): string | undefined {
    const backupPath = this.get().database.backupPath;
    if (!backupPath) return undefined;
    return path.isAbsolute(backupPath) ? backupPath : path.resolve(process.cwd(), backupPath);
  }

  /**
   * Validate current configuration
   */
  validate(): boolean {
    try {
      validateConfig(this.get());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration as JSON
   */
  toJSON(): Config {
    return this.get();
  }

  /**
   * Get safe configuration (without sensitive data)
   */
  getSafeConfig(): Record<string, unknown> {
    const config = this.get();
    const { ai, ...rest } = config;
    return {
      ...rest,
      ai: {
        provider: ai.provider,
        model: ai.model,
        temperature: ai.temperature,
        maxTokens: ai.maxTokens,
        timeout: ai.timeout,
        apiKey: ai.apiKey ? '***REDACTED***' : undefined,
      },
    };
  }
}

// ===== Singleton Instance =====

const configManager = new ConfigManager();

// ===== Exports =====

export { configManager as config, ConfigManager };
export type { Config, PartialConfig };
export * from './schema';

// ===== Helper Functions =====

/**
 * Get the current configuration
 */
export function getConfig(): Readonly<Config> {
  return configManager.get();
}

/**
 * Get a specific configuration value
 */
export function getConfigValue<K extends keyof Config>(key: K): Config[K] {
  return configManager.getValue(key);
}

/**
 * Update configuration
 */
export function updateConfig(updates: PartialConfig): void {
  configManager.update(updates);
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return configManager.isProduction();
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return configManager.isDevelopment();
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return configManager.isTest();
}

// ===== Default Export =====

export default configManager;
