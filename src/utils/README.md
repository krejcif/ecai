# Utilities Module

A comprehensive collection of utility modules for logging, caching, retry logic, and validation.

## Modules

- [Logger](#logger) - Colored console and file logging
- [Cache](#cache) - In-memory LRU cache with TTL
- [Retry](#retry) - Retry logic with exponential backoff and circuit breaker
- [Validation](#validation) - Common validators and sanitization

---

## Logger

Provides colored console output, multiple log levels, file logging, and structured logging.

### Usage

```typescript
import { logger } from './utils/logger';

// Basic logging
logger.info('Application started');
logger.debug('Debug information', { userId: '123' });
logger.warn('Warning message');
logger.error('Error occurred', new Error('Something went wrong'));

// With context
logger.info('User logged in', {
  userId: '123',
  timestamp: Date.now()
});

// Create child logger with persistent context
const userLogger = logger.child({ userId: '123', service: 'auth' });
userLogger.info('Login successful'); // Automatically includes userId and service
```

### Features

- **Log Levels**: debug, info, warn, error
- **Colored Output**: Different colors for each log level
- **File Logging**: Optional file output
- **Structured Logging**: JSON format for log aggregation
- **Context**: Add contextual data to log entries
- **Child Loggers**: Create loggers with persistent context

### Configuration

```typescript
import { createLogger } from './utils/logger';

const customLogger = createLogger({
  level: 'debug',
  file: './logs/custom.log',
  console: true,
  structured: false,
  colorize: true,
});
```

### Performance Timing

```typescript
import { logTimed, createTimer } from './utils/logger';

// Async timing
await logTimed(logger, 'Database query', async () => {
  return await db.query('SELECT * FROM products');
});

// Manual timing
const timer = createTimer(logger, 'Processing');
// ... do work ...
timer(); // Logs duration
```

---

## Cache

In-memory LRU (Least Recently Used) cache with TTL support and statistics.

### Usage

```typescript
import { cache } from './utils/cache';

// Set value
cache.set('user:123', userData, 3600); // TTL in seconds

// Get value
const user = cache.get('user:123');

// Check existence
if (cache.has('user:123')) {
  // ...
}

// Delete
cache.delete('user:123');

// Clear all
cache.clear();
```

### Lazy Initialization

```typescript
// Get or set (async)
const user = await cache.getOrSet('user:123', async () => {
  return await db.getUser('123');
}, 3600);

// Get or set (sync)
const config = cache.getOrSetSync('config', () => {
  return loadConfig();
});
```

### Bulk Operations

```typescript
// Get multiple
const users = cache.getMany(['user:123', 'user:456']);

// Set multiple
const entries = new Map([
  ['user:123', userData1],
  ['user:456', userData2],
]);
cache.setMany(entries, 3600);

// Delete multiple
cache.deleteMany(['user:123', 'user:456']);
```

### Statistics

```typescript
const stats = cache.getStats();
console.log(`Hit rate: ${stats.hitRate * 100}%`);
console.log(`Cache size: ${stats.size} bytes`);
console.log(`Entries: ${stats.entries}`);

// Reset stats
cache.resetStats();
```

### Memoization

```typescript
import { memoize } from './utils/cache';

const expensiveFunction = memoize(
  (input: string) => {
    // Expensive computation
    return result;
  },
  { ttl: 3600 }
);
```

### Decorator

```typescript
import { Cached } from './utils/cache';

class ProductService {
  @Cached(3600) // Cache for 1 hour
  async getProduct(id: string) {
    return await db.getProduct(id);
  }
}
```

---

## Retry

Retry logic with exponential backoff and circuit breaker pattern.

### Basic Retry

```typescript
import { retry } from './utils/retry';

// Retry with default options
const result = await retry(async () => {
  return await fetch('https://api.example.com/data');
});

// Custom retry options
const result = await retry(
  async () => {
    return await fetch('https://api.example.com/data');
  },
  {
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 3,
    shouldRetry: (error) => error.message.includes('timeout'),
  }
);
```

### Retry with Jitter

Prevents thundering herd problem by adding randomness to delays.

```typescript
import { retryWithJitter } from './utils/retry';

const result = await retryWithJitter(async () => {
  return await apiCall();
});
```

### Retry Manager

Manages retry logic with integrated circuit breaker.

```typescript
import { retryManager } from './utils/retry';

// Execute with retry and circuit breaker
const result = await retryManager.execute(async () => {
  return await apiCall();
});

// Check circuit state
const state = retryManager.getCircuitState();
console.log(state.state); // 'closed', 'open', or 'half-open'

// Reset circuit
retryManager.resetCircuit();
```

### Circuit Breaker

Prevents cascading failures by opening circuit after threshold failures.

```typescript
import { CircuitBreaker } from './utils/retry';

const breaker = new CircuitBreaker({
  enabled: true,
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
});

const result = await breaker.execute(async () => {
  return await apiCall();
});

// Check state
const state = breaker.getState();

// Manual control
breaker.open();  // Force open
breaker.close(); // Force close
breaker.reset(); // Reset to closed
```

### Decorators

```typescript
import { Retry, WithCircuitBreaker } from './utils/retry';

class ApiService {
  @Retry({ maxRetries: 3 })
  async fetchData() {
    return await fetch('/api/data');
  }

  @WithCircuitBreaker({ failureThreshold: 5 })
  async criticalOperation() {
    return await performOperation();
  }
}
```

### Preset Options

```typescript
import { networkRetryOptions, rateLimitRetryOptions } from './utils/retry';

// For network errors
await retry(apiCall, networkRetryOptions());

// For rate limit errors
await retry(apiCall, rateLimitRetryOptions());
```

---

## Validation

Common validators, sanitization, and type guards.

### Validators

```typescript
import {
  isValidEmail,
  isValidUrl,
  isValidPhone,
  isValidUuid,
  isValidPrice,
  isValidRating,
  isValidDate,
} from './utils/validation';

if (isValidEmail('user@example.com')) {
  // Valid email
}

if (isValidUrl('https://example.com')) {
  // Valid URL
}

if (isValidPrice(99.99)) {
  // Valid price
}

if (isValidRating(4.5, 0, 5)) {
  // Valid rating between 0 and 5
}
```

### Sanitization

```typescript
import {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizePhone,
  stripHtml,
  normalizeWhitespace,
  truncate,
} from './utils/validation';

const clean = sanitizeString('<script>alert("xss")</script>');
// "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"

const email = sanitizeEmail(' USER@EXAMPLE.COM ');
// "user@example.com"

const text = stripHtml('<p>Hello <b>World</b></p>');
// "Hello World"

const phone = sanitizePhone('(123) 456-7890');
// "1234567890"

const short = truncate('Long text here', 10);
// "Long te..."
```

### Type Guards

```typescript
import {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isNullish,
  isEmpty,
  isNonEmptyString,
  isPositiveNumber,
  isInteger,
} from './utils/validation';

if (isNonEmptyString(value)) {
  // TypeScript knows value is string
  console.log(value.toUpperCase());
}

if (isPositiveNumber(value)) {
  // TypeScript knows value is number > 0
  console.log(value * 2);
}
```

### Complex Validators

```typescript
import {
  validateProduct,
  validateReview,
  validateSupplier,
  validateSearchQuery,
  validatePagination,
} from './utils/validation';

// Validate product data
const result = validateProduct({
  title: 'Product Name',
  description: 'Description',
  price: 99.99,
  url: 'https://example.com/product',
});

if (result.valid) {
  // Product is valid
} else {
  // Show errors
  result.errors.forEach((error) => {
    console.log(`${error.field}: ${error.message}`);
  });
}
```

### Validation Result Builder

```typescript
import { createValidationResult, assertValid } from './utils/validation';

const builder = createValidationResult();

if (!value) {
  builder.addError('field', 'Field is required', 'REQUIRED');
}

if (value < 0) {
  builder.addError('field', 'Must be positive', 'INVALID_VALUE');
}

const result = builder.build();

// Throw if not valid
assertValid(result);
```

### Combine Validations

```typescript
import { combineValidationResults } from './utils/validation';

const result1 = validateProduct(product);
const result2 = validateReview(review);

const combined = combineValidationResults(result1, result2);

if (!combined.valid) {
  // Handle all errors together
  console.log(combined.errors);
}
```

---

## Import All Utilities

```typescript
// Import everything
import * from './utils';

// Or import specific modules
import { logger } from './utils';
import { cache } from './utils';
import { retryManager } from './utils';
import { validateProduct } from './utils';
```

## Configuration

All utilities can be configured via environment variables or programmatically:

```bash
# Logger
LOG_LEVEL=debug
LOG_FILE=./logs/app.log
LOG_CONSOLE=true
LOG_STRUCTURED=false
LOG_COLORIZE=true

# Cache
CACHE_ENABLED=true
CACHE_MAX_SIZE=1000
CACHE_TTL=3600

# Retry
RETRY_MAX_RETRIES=3
RETRY_INITIAL_DELAY=1000
RETRY_MAX_DELAY=30000
RETRY_BACKOFF_MULTIPLIER=2

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=60000
```
