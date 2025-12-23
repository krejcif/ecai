/**
 * Utilities Index
 *
 * Central export point for all utility modules
 */

// ===== Logger =====
export * from './logger';
export { logger, Logger, createLogger, formatError, createTimer, logTimed } from './logger';

// ===== Cache =====
export * from './cache';
export { cache, Cache, createCache, Cached, memoize } from './cache';

// ===== Retry =====
export * from './retry';
export {
  retry,
  retryWithJitter,
  retryManager,
  RetryManager,
  CircuitBreaker,
  sleep,
  createRetryManager,
  Retry,
  WithCircuitBreaker,
  isRetryableError,
  networkRetryOptions,
  rateLimitRetryOptions,
} from './retry';

// ===== Validation =====
export * from './validation';
export {
  // Validators
  isValidEmail,
  isValidUrl,
  isValidPhone,
  isValidUuid,
  isValidPrice,
  isValidRating,
  isValidDate,
  isValidISODate,
  isValidLength,
  isAlphanumeric,
  isValidSlug,
  isValidHexColor,
  isValidJSON,

  // Sanitization
  sanitizeString,
  stripHtml,
  sanitizeEmail,
  sanitizeUrl,
  sanitizePhone,
  sanitizeFilename,
  normalizeWhitespace,
  truncate,

  // Type Guards
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isNullish,
  isEmpty,
  isNonEmptyString,
  isPositiveNumber,
  isNonNegativeNumber,
  isInteger,

  // Complex Validators
  validateProduct,
  validateReview,
  validateSupplier,
  validateSearchQuery,
  validatePagination,

  // Helpers
  ValidationResultBuilder,
  createValidationResult,
  combineValidationResults,
  assertValid,
} from './validation';

// ===== Default Exports =====
import logger from './logger';
import cache from './cache';
import retryManager from './retry';

export default {
  logger,
  cache,
  retry: retryManager,
};
