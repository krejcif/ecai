/**
 * Validation Utility
 *
 * Provides common validators, sanitization, and type guards
 */

import { ValidationResult, ValidationError } from '../types';

// ===== Validation Result Builder =====

class ValidationResultBuilder {
  private errors: ValidationError[] = [];

  addError(field: string, message: string, code: string = 'VALIDATION_ERROR'): this {
    this.errors.push({ field, message, code });
    return this;
  }

  build(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
    };
  }
}

// ===== Common Validators =====

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Validate UUID
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate price
 */
export function isValidPrice(price: number): boolean {
  return typeof price === 'number' && price >= 0 && !isNaN(price) && isFinite(price);
}

/**
 * Validate rating (0-5)
 */
export function isValidRating(rating: number, min = 0, max = 5): boolean {
  return typeof rating === 'number' && rating >= min && rating <= max && !isNaN(rating);
}

/**
 * Validate date
 */
export function isValidDate(date: unknown): boolean {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  return false;
}

/**
 * Validate ISO date string
 */
export function isValidISODate(dateString: string): boolean {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoRegex.test(dateString) && isValidDate(dateString);
}

/**
 * Validate string length
 */
export function isValidLength(
  str: string,
  min: number,
  max?: number
): boolean {
  const length = str.length;
  return length >= min && (max === undefined || length <= max);
}

/**
 * Validate alphanumeric
 */
export function isAlphanumeric(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str);
}

/**
 * Validate slug (URL-friendly string)
 */
export function isValidSlug(str: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(str);
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate JSON string
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// ===== Sanitization =====

/**
 * Sanitize string (remove potentially harmful characters)
 */
export function sanitizeString(str: string): string {
  return str.replace(/[<>\"'&]/g, (char) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;',
    };
    return entities[char] || char;
  });
}

/**
 * Sanitize HTML (strip all HTML tags)
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize email
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

/**
 * Normalize whitespace
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Truncate string
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
}

// ===== Type Guards =====

/**
 * Check if value is string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (isNullish(value)) return true;
  if (isString(value)) return value.trim().length === 0;
  if (isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if value is non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

/**
 * Check if value is positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * Check if value is non-negative number
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

/**
 * Check if value is integer
 */
export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

// ===== Complex Validators =====

/**
 * Validate product data
 */
export function validateProduct(data: unknown): ValidationResult {
  const builder = new ValidationResultBuilder();

  if (!isObject(data)) {
    return builder.addError('root', 'Product must be an object').build();
  }

  const product = data as Record<string, unknown>;

  // Validate required fields
  if (!isNonEmptyString(product.title)) {
    builder.addError('title', 'Title is required and must be a non-empty string', 'REQUIRED');
  }

  if (!isNonEmptyString(product.description)) {
    builder.addError('description', 'Description is required', 'REQUIRED');
  }

  if (!isValidPrice(product.price as number)) {
    builder.addError('price', 'Price must be a valid non-negative number', 'INVALID_PRICE');
  }

  if (!isNonEmptyString(product.url) || !isValidUrl(product.url)) {
    builder.addError('url', 'URL must be a valid URL', 'INVALID_URL');
  }

  // Validate optional fields
  if (product.rating !== undefined && !isValidRating(product.rating as number)) {
    builder.addError('rating', 'Rating must be between 0 and 5', 'INVALID_RATING');
  }

  if (product.reviewCount !== undefined && !isNonNegativeNumber(product.reviewCount)) {
    builder.addError('reviewCount', 'Review count must be a non-negative number', 'INVALID_COUNT');
  }

  return builder.build();
}

/**
 * Validate review data
 */
export function validateReview(data: unknown): ValidationResult {
  const builder = new ValidationResultBuilder();

  if (!isObject(data)) {
    return builder.addError('root', 'Review must be an object').build();
  }

  const review = data as Record<string, unknown>;

  if (!isNonEmptyString(review.productId)) {
    builder.addError('productId', 'Product ID is required', 'REQUIRED');
  }

  if (!isNonEmptyString(review.author)) {
    builder.addError('author', 'Author is required', 'REQUIRED');
  }

  if (!isValidRating(review.rating as number)) {
    builder.addError('rating', 'Rating must be between 0 and 5', 'INVALID_RATING');
  }

  if (!isNonEmptyString(review.content)) {
    builder.addError('content', 'Content is required', 'REQUIRED');
  }

  if (!isBoolean(review.verified)) {
    builder.addError('verified', 'Verified must be a boolean', 'INVALID_TYPE');
  }

  return builder.build();
}

/**
 * Validate supplier data
 */
export function validateSupplier(data: unknown): ValidationResult {
  const builder = new ValidationResultBuilder();

  if (!isObject(data)) {
    return builder.addError('root', 'Supplier must be an object').build();
  }

  const supplier = data as Record<string, unknown>;

  if (!isNonEmptyString(supplier.name)) {
    builder.addError('name', 'Name is required', 'REQUIRED');
  }

  if (!isNonEmptyString(supplier.website) || !isValidUrl(supplier.website)) {
    builder.addError('website', 'Website must be a valid URL', 'INVALID_URL');
  }

  if (supplier.email && !isValidEmail(supplier.email as string)) {
    builder.addError('email', 'Email must be valid', 'INVALID_EMAIL');
  }

  if (supplier.rating !== undefined && !isValidRating(supplier.rating as number)) {
    builder.addError('rating', 'Rating must be between 0 and 5', 'INVALID_RATING');
  }

  return builder.build();
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: unknown): ValidationResult {
  const builder = new ValidationResultBuilder();

  if (!isNonEmptyString(query)) {
    builder.addError('query', 'Search query must be a non-empty string', 'REQUIRED');
  } else if ((query as string).length < 2) {
    builder.addError('query', 'Search query must be at least 2 characters', 'TOO_SHORT');
  } else if ((query as string).length > 500) {
    builder.addError('query', 'Search query must not exceed 500 characters', 'TOO_LONG');
  }

  return builder.build();
}

/**
 * Validate pagination parameters
 */
export function validatePagination(data: unknown): ValidationResult {
  const builder = new ValidationResultBuilder();

  if (!isObject(data)) {
    return builder.addError('root', 'Pagination must be an object').build();
  }

  const pagination = data as Record<string, unknown>;

  if (pagination.page !== undefined) {
    if (!isPositiveNumber(pagination.page) || !isInteger(pagination.page)) {
      builder.addError('page', 'Page must be a positive integer', 'INVALID_PAGE');
    }
  }

  if (pagination.pageSize !== undefined) {
    if (!isPositiveNumber(pagination.pageSize) || !isInteger(pagination.pageSize)) {
      builder.addError('pageSize', 'Page size must be a positive integer', 'INVALID_PAGE_SIZE');
    } else if ((pagination.pageSize as number) > 100) {
      builder.addError('pageSize', 'Page size must not exceed 100', 'PAGE_SIZE_TOO_LARGE');
    }
  }

  return builder.build();
}

// ===== Exports =====

export { ValidationResultBuilder };

/**
 * Create a validation result builder
 */
export function createValidationResult(): ValidationResultBuilder {
  return new ValidationResultBuilder();
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap((r) => r.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Assert validation result is valid (throws if not)
 */
export function assertValid(result: ValidationResult): void {
  if (!result.valid) {
    const messages = result.errors.map((e) => `${e.field}: ${e.message}`);
    throw new Error(`Validation failed:\n${messages.join('\n')}`);
  }
}
