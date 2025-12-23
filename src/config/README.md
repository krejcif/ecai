# Configuration Module

A comprehensive configuration management system with environment-based settings, validation, and type safety.

## Features

- Environment-based configuration with `.env` support
- Zod schema validation for type safety
- Default values for all settings
- Runtime configuration updates
- Safe configuration export (hiding sensitive data)
- Path resolution for database and backup paths

## Usage

### Basic Usage

```typescript
import { config, getConfig } from './config';

// Get entire configuration
const appConfig = config.get();

// Get specific values
const port = config.getValue('api', 'port');
const dbPath = config.getDatabasePath();

// Update configuration at runtime
config.update({
  logging: {
    level: 'debug',
  },
});
```

### Environment Variables

All configuration can be controlled via environment variables. See `.env.example` for available options.

Key environment variables:

```bash
# Database
DATABASE_PATH=./data/ecommerce.db
DATABASE_BACKUP=true

# API
API_PORT=3000
API_HOST=localhost

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Cache
CACHE_ENABLED=true
CACHE_MAX_SIZE=1000
CACHE_TTL=3600

# AI
AI_PROVIDER=openai
AI_API_KEY=your-key-here
AI_MODEL=gpt-4
```

### Configuration Schema

The configuration is validated using Zod schemas defined in `schema.ts`:

```typescript
import { validateConfig } from './config/schema';

const config = {
  environment: 'development',
  database: {
    path: './data/ecommerce.db',
    backup: true,
  },
  // ... other settings
};

// Validate configuration
const validatedConfig = validateConfig(config);
```

## Configuration Sections

### Database Configuration

- `path`: Database file path
- `backup`: Enable automatic backups
- `backupPath`: Backup directory path

### API Configuration

- `port`: API server port
- `host`: API server host
- `corsOrigins`: Allowed CORS origins
- `rateLimit`: Rate limiting settings

### Logging Configuration

- `level`: Log level (debug, info, warn, error)
- `file`: Log file path (optional)
- `console`: Enable console logging
- `structured`: Use structured JSON logging
- `colorize`: Enable colored output

### Cache Configuration

- `maxSize`: Maximum cache entries
- `ttl`: Time to live in seconds
- `enabled`: Enable/disable caching

### Retry Configuration

- `maxRetries`: Maximum retry attempts
- `initialDelay`: Initial delay in ms
- `maxDelay`: Maximum delay in ms
- `backoffMultiplier`: Backoff multiplier
- `circuitBreaker`: Circuit breaker settings

### AI Configuration

- `provider`: AI provider (openai, anthropic, local)
- `apiKey`: API key
- `model`: Model name
- `temperature`: Temperature (0-2)
- `maxTokens`: Maximum tokens
- `timeout`: Request timeout

### Search Configuration

- `enabled`: Enable search
- `indexPath`: Search index path
- `rebuildOnStart`: Rebuild index on startup
- `fuzzyThreshold`: Fuzzy match threshold
- `maxResults`: Maximum results

### Scraping Configuration

- `enabled`: Enable web scraping
- `userAgent`: User agent string
- `timeout`: Request timeout
- `maxConcurrent`: Max concurrent requests
- `retryOnFailure`: Retry failed requests
- `respectRobotsTxt`: Respect robots.txt
- `delayBetweenRequests`: Delay between requests in ms

## Helper Functions

```typescript
import {
  getConfig,
  getConfigValue,
  updateConfig,
  isProduction,
  isDevelopment,
  isTest,
} from './config';

// Environment checks
if (isProduction()) {
  // Production-specific logic
}

// Get specific value
const logLevel = getConfigValue('logging').level;

// Update config
updateConfig({ cache: { enabled: false } });
```

## Type Safety

All configuration is fully typed using TypeScript and validated at runtime using Zod schemas.

```typescript
import type { Config, LogConfig, CacheConfig } from './config';

// Type-safe configuration access
const config: Config = getConfig();
const logging: LogConfig = config.logging;
```
