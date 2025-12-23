/**
 * Configuration schema definitions using Zod
 */

import { z } from 'zod';

// ===== Database Schema =====

export const databaseConfigSchema = z.object({
  path: z.string().min(1, 'Database path is required'),
  backup: z.boolean().default(true),
  backupPath: z.string().optional(),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

// ===== API Schema =====

export const rateLimitConfigSchema = z.object({
  windowMs: z.number().int().positive().default(60000), // 1 minute
  maxRequests: z.number().int().positive().default(100),
});

export const apiConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
  host: z.string().default('localhost'),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
  rateLimit: rateLimitConfigSchema,
});

export type ApiConfig = z.infer<typeof apiConfigSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;

// ===== Logging Schema =====

export const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

export const logConfigSchema = z.object({
  level: logLevelSchema.default('info'),
  file: z.string().optional(),
  console: z.boolean().default(true),
  structured: z.boolean().default(false),
  colorize: z.boolean().default(true),
});

export type LogConfig = z.infer<typeof logConfigSchema>;
export type LogLevel = z.infer<typeof logLevelSchema>;

// ===== Cache Schema =====

export const cacheConfigSchema = z.object({
  maxSize: z.number().int().positive().default(1000), // max number of entries
  ttl: z.number().int().positive().default(3600), // 1 hour in seconds
  enabled: z.boolean().default(true),
});

export type CacheConfig = z.infer<typeof cacheConfigSchema>;

// ===== Retry & Circuit Breaker Schema =====

export const circuitBreakerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  failureThreshold: z.number().int().positive().default(5),
  resetTimeout: z.number().int().positive().default(60000), // 1 minute
});

export const retryConfigSchema = z.object({
  maxRetries: z.number().int().min(0).default(3),
  initialDelay: z.number().int().positive().default(1000), // 1 second
  maxDelay: z.number().int().positive().default(30000), // 30 seconds
  backoffMultiplier: z.number().positive().default(2),
  circuitBreaker: circuitBreakerConfigSchema,
});

export type RetryConfig = z.infer<typeof retryConfigSchema>;
export type CircuitBreakerConfig = z.infer<typeof circuitBreakerConfigSchema>;

// ===== AI/Intelligence Schema =====

export const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'local']).default('openai'),
  apiKey: z.string().optional(),
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(2000),
  timeout: z.number().int().positive().default(30000), // 30 seconds
});

export type AiConfig = z.infer<typeof aiConfigSchema>;

// ===== Search Schema =====

export const searchConfigSchema = z.object({
  enabled: z.boolean().default(true),
  indexPath: z.string().default('./data/search-index'),
  rebuildOnStart: z.boolean().default(false),
  fuzzyThreshold: z.number().min(0).max(1).default(0.8),
  maxResults: z.number().int().positive().default(50),
});

export type SearchConfig = z.infer<typeof searchConfigSchema>;

// ===== Scraping Schema =====

export const scrapingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  userAgent: z.string().default('EcommerceIQ/1.0'),
  timeout: z.number().int().positive().default(30000),
  maxConcurrent: z.number().int().positive().default(5),
  retryOnFailure: z.boolean().default(true),
  respectRobotsTxt: z.boolean().default(true),
  delayBetweenRequests: z.number().int().min(0).default(1000), // 1 second
});

export type ScrapingConfig = z.infer<typeof scrapingConfigSchema>;

// ===== Main Config Schema =====

export const configSchema = z.object({
  environment: z.enum(['development', 'production', 'test']).default('development'),
  database: databaseConfigSchema,
  api: apiConfigSchema,
  logging: logConfigSchema,
  cache: cacheConfigSchema,
  retry: retryConfigSchema,
  ai: aiConfigSchema,
  search: searchConfigSchema,
  scraping: scrapingConfigSchema,
});

export type Config = z.infer<typeof configSchema>;

// ===== Validation Helper =====

export function validateConfig(config: unknown): Config {
  try {
    return configSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`Configuration validation failed:\n${messages.join('\n')}`);
    }
    throw error;
  }
}

// ===== Partial Config Schema (for updates) =====

export const partialConfigSchema = configSchema.partial();

export type PartialConfig = z.infer<typeof partialConfigSchema>;
