/**
 * Rate Limiting Middleware
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Rate limiting middleware factory
 * Creates a rate limiter with specified options
 */
export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs = 60000, // 1 minute default
    maxRequests = 100,
    message = 'Too many requests, please try again later',
    keyGenerator = (req: Request) => {
      // Use IP address as default key
      return req.ip || req.socket.remoteAddress || 'unknown';
    }
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();

      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);

      if (!entry || now > entry.resetTime) {
        // Create new entry or reset expired entry
        entry = {
          count: 0,
          resetTime: now + windowMs
        };
        rateLimitStore.set(key, entry);
      }

      // Increment request count
      entry.count++;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      // Check if rate limit exceeded
      if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());

        res.status(429).json({
          error: 'Too Many Requests',
          message,
          retryAfter
        });
        return;
      }

      next();
    } catch (error) {
      // Don't block request on rate limit errors
      console.error('Rate limit error:', error);
      next();
    }
  };
}

/**
 * Clean up expired entries from rate limit store
 * Should be called periodically
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * Standard rate limiters for different endpoint types
 */
export const rateLimiters = {
  // Standard API endpoints - 100 requests per minute
  standard: createRateLimit({
    windowMs: 60000,
    maxRequests: 100,
    message: 'Rate limit exceeded for standard endpoints'
  }),

  // Search endpoints - 30 requests per minute (more expensive)
  search: createRateLimit({
    windowMs: 60000,
    maxRequests: 30,
    message: 'Rate limit exceeded for search endpoints'
  }),

  // Data ingestion - 10 requests per minute (very expensive)
  ingestion: createRateLimit({
    windowMs: 60000,
    maxRequests: 10,
    message: 'Rate limit exceeded for data ingestion endpoints'
  }),

  // Intelligence endpoints - 50 requests per minute
  intelligence: createRateLimit({
    windowMs: 60000,
    maxRequests: 50,
    message: 'Rate limit exceeded for intelligence endpoints'
  })
};

/**
 * API key-based rate limiter
 * Uses API key instead of IP address for rate limiting
 */
export function createApiKeyRateLimit(options: Omit<RateLimitOptions, 'keyGenerator'>) {
  return createRateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      const authHeader = req.headers.authorization;
      const queryKey = req.query.apiKey as string;

      if (authHeader) {
        const parts = authHeader.split(' ');
        return parts.length === 2 ? parts[1] : authHeader;
      }

      return queryKey || req.ip || 'unknown';
    }
  });
}
