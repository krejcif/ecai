/**
 * API Key Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  apiKey?: string;
  userId?: string;
}

/**
 * API key authentication middleware
 * Validates API key from Authorization header or query parameter
 */
export function authenticateApiKey(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Extract API key from Authorization header or query parameter
    const authHeader = req.headers.authorization;
    const queryKey = req.query.apiKey as string;

    let apiKey: string | undefined;

    if (authHeader) {
      // Support both "Bearer <key>" and "<key>" formats
      const parts = authHeader.split(' ');
      apiKey = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : authHeader;
    } else if (queryKey) {
      apiKey = queryKey;
    }

    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Provide it in Authorization header or apiKey query parameter.'
      });
      return;
    }

    // Validate API key (in production, check against database or environment)
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || ['dev-key-123'];

    if (!validApiKeys.includes(apiKey)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid API key'
      });
      return;
    }

    // Attach API key and user ID to request
    req.apiKey = apiKey;
    req.userId = `user-${apiKey.substring(0, 8)}`;

    next();
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional authentication middleware
 * Authenticates if API key is present, but allows request to continue if not
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const queryKey = req.query.apiKey as string;

  if (authHeader || queryKey) {
    authenticateApiKey(req, res, next);
  } else {
    next();
  }
}

/**
 * Admin authentication middleware
 * Requires specific admin API key
 */
export function authenticateAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const parts = authHeader?.split(' ') || [];
    const apiKey = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : authHeader;

    const adminKeys = process.env.ADMIN_API_KEYS?.split(',') || ['admin-key-456'];

    if (!apiKey || !adminKeys.includes(apiKey)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin privileges required'
      });
      return;
    }

    req.apiKey = apiKey;
    req.userId = 'admin';
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Admin authentication failed'
    });
  }
}
