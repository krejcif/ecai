/**
 * Request Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';

export type ValidationRule = {
  field: string;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
};

export interface ValidationSchema {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
}

/**
 * Validate a single value against a rule
 */
function validateValue(value: any, rule: ValidationRule): string | null {
  const { field, type, required, min, max, minLength, maxLength, pattern, enum: enumValues, custom } = rule;

  // Check required
  if (required && (value === undefined || value === null || value === '')) {
    return `${field} is required`;
  }

  // Skip further validation if value is not provided and not required
  if (value === undefined || value === null) {
    return null;
  }

  // Check type
  if (type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== type) {
      return `${field} must be of type ${type}`;
    }
  }

  // Number validations
  if (type === 'number') {
    if (min !== undefined && value < min) {
      return `${field} must be at least ${min}`;
    }
    if (max !== undefined && value > max) {
      return `${field} must be at most ${max}`;
    }
  }

  // String validations
  if (type === 'string') {
    if (minLength !== undefined && value.length < minLength) {
      return `${field} must be at least ${minLength} characters`;
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return `${field} must be at most ${maxLength} characters`;
    }
    if (pattern && !pattern.test(value)) {
      return `${field} format is invalid`;
    }
  }

  // Array validations
  if (type === 'array') {
    if (min !== undefined && value.length < min) {
      return `${field} must have at least ${min} items`;
    }
    if (max !== undefined && value.length > max) {
      return `${field} must have at most ${max} items`;
    }
  }

  // Enum validation
  if (enumValues && !enumValues.includes(value)) {
    return `${field} must be one of: ${enumValues.join(', ')}`;
  }

  // Custom validation
  if (custom) {
    const result = custom(value);
    if (result === false) {
      return `${field} validation failed`;
    }
    if (typeof result === 'string') {
      return result;
    }
  }

  return null;
}

/**
 * Validate request data against schema
 */
export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      for (const rule of schema.body) {
        const error = validateValue(req.body?.[rule.field], rule);
        if (error) errors.push(error);
      }
    }

    // Validate query
    if (schema.query) {
      for (const rule of schema.query) {
        let value = req.query[rule.field];

        // Convert query params to proper types
        if (value !== undefined && rule.type === 'number') {
          value = Number(value);
          if (isNaN(value as number)) {
            errors.push(`${rule.field} must be a valid number`);
            continue;
          }
        } else if (value !== undefined && rule.type === 'boolean') {
          value = value === 'true' || value === '1';
        } else if (value !== undefined && rule.type === 'array') {
          value = Array.isArray(value) ? value : [value];
        }

        req.query[rule.field] = value;
        const error = validateValue(value, rule);
        if (error) errors.push(error);
      }
    }

    // Validate params
    if (schema.params) {
      for (const rule of schema.params) {
        const error = validateValue(req.params[rule.field], rule);
        if (error) errors.push(error);
      }
    }

    // Return errors if any
    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Request validation failed',
        details: errors
      });
      return;
    }

    next();
  };
}

/**
 * Common validation rules
 */
export const commonRules = {
  // ID validation
  id: (field = 'id'): ValidationRule => ({
    field,
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100
  }),

  // Pagination
  limit: (): ValidationRule => ({
    field: 'limit',
    type: 'number',
    min: 1,
    max: 100
  }),

  offset: (): ValidationRule => ({
    field: 'offset',
    type: 'number',
    min: 0
  }),

  // Search query
  query: (required = true): ValidationRule => ({
    field: 'query',
    type: 'string',
    required,
    minLength: 1,
    maxLength: 500
  }),

  // Category
  category: (required = false): ValidationRule => ({
    field: 'category',
    type: 'string',
    required,
    minLength: 1,
    maxLength: 100
  }),

  // Price range
  minPrice: (): ValidationRule => ({
    field: 'minPrice',
    type: 'number',
    min: 0
  }),

  maxPrice: (): ValidationRule => ({
    field: 'maxPrice',
    type: 'number',
    min: 0
  }),

  // Sort
  sortBy: (allowedFields: string[]): ValidationRule => ({
    field: 'sortBy',
    type: 'string',
    enum: allowedFields
  }),

  sortOrder: (): ValidationRule => ({
    field: 'sortOrder',
    type: 'string',
    enum: ['asc', 'desc']
  })
};

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potentially dangerous characters
      return obj.replace(/[<>]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
}
