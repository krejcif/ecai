/**
 * API Module - E-Commerce AI Intelligence Platform
 *
 * This module provides a RESTful API server for the e-commerce intelligence platform.
 * It includes endpoints for product search, intelligence analysis, and data management.
 *
 * @module api
 */

// Export server
export { ApiServer, ServerConfig } from './server';

// Export routes
export { default as productsRouter } from './routes/products';
export { default as intelligenceRouter } from './routes/intelligence';
export { default as dataRouter } from './routes/data';

// Export middleware
export {
  authenticateApiKey,
  optionalAuth,
  authenticateAdmin,
  AuthRequest
} from './middleware/auth';

export {
  createRateLimit,
  rateLimiters,
  createApiKeyRateLimit,
  cleanupRateLimitStore,
  RateLimitOptions
} from './middleware/rate-limit';

export {
  validate,
  sanitizeInput,
  commonRules,
  ValidationRule,
  ValidationSchema
} from './middleware/validation';

/**
 * Quick start helper function
 * Creates and starts an API server with default configuration
 *
 * @example
 * ```typescript
 * import { startServer } from './api';
 *
 * startServer({ port: 3000 }).then(() => {
 *   console.log('Server started');
 * });
 * ```
 */
export async function startServer(config?: {
  port?: number;
  host?: string;
  corsOrigins?: string[];
  trustProxy?: boolean;
}): Promise<any> {
  const { ApiServer } = await import('./server');
  const server = new ApiServer(config);
  await server.start();
  return server;
}

/**
 * Create API server instance without starting it
 * Useful for testing or custom configurations
 *
 * @example
 * ```typescript
 * import { createServer } from './api';
 *
 * const server = createServer({ port: 3000 });
 * const app = server.getApp();
 * // Use app for testing or additional configuration
 * await server.start();
 * ```
 */
export function createServer(config?: {
  port?: number;
  host?: string;
  corsOrigins?: string[];
  trustProxy?: boolean;
}) {
  const { ApiServer } = require('./server');
  return new ApiServer(config);
}

// Default export
export { ApiServer as default } from './server';
