/**
 * Express Server Setup for E-Commerce AI API
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Import routes
import productsRouter from './routes/products';
import intelligenceRouter from './routes/intelligence';
import dataRouter from './routes/data';

// Import middleware
import { optionalAuth } from './middleware/auth';
import { sanitizeInput } from './middleware/validation';
import { rateLimiters } from './middleware/rate-limit';

export interface ServerConfig {
  port?: number;
  host?: string;
  corsOrigins?: string[];
  trustProxy?: boolean;
  logLevel?: 'combined' | 'common' | 'dev' | 'short' | 'tiny';
}

export class ApiServer {
  private app: Application;
  private server: any;
  private config: Required<ServerConfig>;

  constructor(config: ServerConfig = {}) {
    this.config = {
      port: config.port || parseInt(process.env.PORT || '3000', 10),
      host: config.host || process.env.HOST || '0.0.0.0',
      corsOrigins: config.corsOrigins || process.env.CORS_ORIGINS?.split(',') || ['*'],
      trustProxy: config.trustProxy ?? (process.env.TRUST_PROXY === 'true'),
      logLevel: config.logLevel || (process.env.NODE_ENV === 'production' ? 'combined' : 'dev')
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware stack
   */
  private setupMiddleware(): void {
    // Trust proxy if behind reverse proxy (e.g., nginx, ALB)
    if (this.config.trustProxy) {
      this.app.set('trust proxy', 1);
    }

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:']
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        if (this.config.corsOrigins.includes('*') || this.config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan(this.config.logLevel));
    }

    // Input sanitization
    this.app.use(sanitizeInput);

    // Request ID and timing
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      (req as any).id = requestId;
      res.setHeader('X-Request-ID', requestId);

      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${duration}ms`);
      });

      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint (no auth required)
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Readiness check endpoint
    this.app.get('/ready', async (req: Request, res: Response) => {
      try {
        // TODO: Add actual readiness checks (database connection, etc.)
        const checks = {
          database: true,
          cache: true
        };

        const isReady = Object.values(checks).every(check => check === true);

        if (isReady) {
          res.json({
            status: 'ready',
            checks
          });
        } else {
          res.status(503).json({
            status: 'not ready',
            checks
          });
        }
      } catch (error) {
        res.status(503).json({
          status: 'error',
          message: 'Readiness check failed'
        });
      }
    });

    // API version and info
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        name: 'E-Commerce AI Intelligence API',
        version: '1.0.0',
        description: 'RESTful API for e-commerce intelligence platform',
        endpoints: {
          products: '/api/products',
          intelligence: '/api/intelligence',
          data: '/api/data'
        },
        documentation: '/api/docs'
      });
    });

    // Mount API routes with optional authentication
    this.app.use('/api/products', optionalAuth, productsRouter);
    this.app.use('/api/intelligence', optionalAuth, intelligenceRouter);
    this.app.use('/api/data', dataRouter); // Data routes have their own auth

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        path: req.path,
        method: req.method
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        requestId: (req as any).id
      });

      // Handle specific error types
      if (err.name === 'ValidationError') {
        res.status(400).json({
          error: 'Validation Error',
          message: err.message,
          details: err.details
        });
        return;
      }

      if (err.name === 'UnauthorizedError') {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid authentication credentials'
        });
        return;
      }

      if (err.message === 'Not allowed by CORS') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'CORS policy violation'
        });
        return;
      }

      // Default error response
      const statusCode = err.statusCode || err.status || 500;
      const message = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message;

      res.status(statusCode).json({
        error: err.name || 'Internal Server Error',
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      this.shutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown('UNHANDLED_REJECTION');
    });

    // Graceful shutdown signals
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM signal');
      this.shutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT signal');
      this.shutdown('SIGINT');
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          console.log(`
╔═══════════════════════════════════════════════════════╗
║  E-Commerce AI Intelligence API Server                ║
╠═══════════════════════════════════════════════════════╣
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(38)} ║
║  Host: ${this.config.host.padEnd(45)} ║
║  Port: ${this.config.port.toString().padEnd(45)} ║
║  URL: http://${this.config.host}:${this.config.port.toString().padEnd(34)} ║
╚═══════════════════════════════════════════════════════╝
          `);
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`Port ${this.config.port} is already in use`);
          } else {
            console.error('Server error:', error);
          }
          reject(error);
        });
      } catch (error) {
        console.error('Failed to start server:', error);
        reject(error);
      }
    });
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(signal: string): Promise<void> {
    console.log(`\nShutdown initiated by ${signal}...`);

    if (!this.server) {
      console.log('Server not running, exiting');
      process.exit(0);
    }

    // Stop accepting new requests
    this.server.close(async () => {
      console.log('HTTP server closed');

      try {
        // TODO: Close database connections
        // TODO: Finish pending operations
        // TODO: Clear caches

        console.log('Cleanup completed, exiting');
        process.exit(0);
      } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }

  /**
   * Get Express application instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get server configuration
   */
  public getConfig(): Required<ServerConfig> {
    return this.config;
  }
}

/**
 * Create and start server (if run directly)
 */
if (require.main === module) {
  const server = new ApiServer();
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default ApiServer;
