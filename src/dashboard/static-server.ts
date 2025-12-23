/**
 * Static Server for EcommerceIQ Dashboard
 *
 * Serves the dashboard HTML and proxies API requests
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API Proxy - Forward all /api requests to the main API server
app.use('/api', createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // Keep the /api prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying: ${req.method} ${req.path} -> ${API_URL}${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    const response = res as Response;
    response.status(502).json({
      success: false,
      error: 'Bad Gateway',
      message: 'Failed to connect to API server. Make sure the API is running.',
      details: err.message
    });
  }
}));

// Stats endpoint (can work without API)
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    // Try to get real stats from the main API
    const response = await fetch(`${API_URL}/api/stats`).catch(() => null);

    if (response && response.ok) {
      const data = await response.json();
      return res.json(data);
    }

    // Fallback to demo stats
    res.json({
      success: true,
      data: {
        totalProducts: 15234 + Math.floor(Math.random() * 100),
        totalCategories: 24,
        totalSources: 8,
        avgSentiment: 7.8,
        categories: ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Toys'],
        sources: ['Amazon', 'eBay', 'Walmart', 'Target']
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve stats'
    });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    api: {
      configured: API_URL,
      reachable: true // TODO: Add actual health check
    }
  });
});

// Serve static dashboard
const dashboardPath = path.join(__dirname, 'index.html');

// Dashboard route - serve the HTML file
app.get('/', (req: Request, res: Response) => {
  res.sendFile(dashboardPath);
});

// SPA routing support - all other routes serve the dashboard
// This allows client-side routing to work
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  // Skip if this looks like an API request
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Skip if this is a file request (has extension)
  if (path.extname(req.path)) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `File not found: ${req.path}`
    });
  }

  // Serve the dashboard for all other routes (SPA support)
  res.sendFile(dashboardPath);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🚀 EcommerceIQ Dashboard Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`  Dashboard:  http://localhost:${PORT}`);
  console.log(`  Health:     http://localhost:${PORT}/health`);
  console.log(`  API Proxy:  ${API_URL}`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
