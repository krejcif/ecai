/**
 * Retry Utility
 *
 * Provides retry logic with exponential backoff and circuit breaker pattern
 */

import { RetryOptions, RetryConfig, CircuitBreakerState } from '../types';

// ===== Retry with Exponential Backoff =====

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (attempt === opts.maxRetries || !opts.shouldRetry(lastError)) {
        throw lastError;
      }

      // Wait before next attempt
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Retry with jitter to avoid thundering herd
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  let baseDelay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxRetries || !opts.shouldRetry(lastError)) {
        throw lastError;
      }

      // Add jitter (random value between 0 and baseDelay)
      const jitter = Math.random() * baseDelay;
      const delay = Math.min(baseDelay + jitter, opts.maxDelay);

      await sleep(delay);

      baseDelay = Math.min(baseDelay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError!;
}

// ===== Circuit Breaker =====

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: Required<RetryConfig['circuitBreaker']>;

  constructor(config: Partial<RetryConfig['circuitBreaker']> = {}) {
    this.config = {
      enabled: config.enabled !== false,
      failureThreshold: config.failureThreshold || 5,
      resetTimeout: config.resetTimeout || 60000,
    };

    this.state = {
      state: 'closed',
      failures: 0,
    };
  }

  /**
   * Execute function with circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return fn();
    }

    // Check if circuit is open
    if (this.state.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = {
      state: 'closed',
      failures: 0,
    };
  }

  /**
   * Force open circuit
   */
  open(): void {
    this.state.state = 'open';
    this.state.lastFailureTime = Date.now();
    this.state.nextRetryTime = Date.now() + this.config.resetTimeout;
  }

  /**
   * Force close circuit
   */
  close(): void {
    this.reset();
  }

  // ===== Private Methods =====

  private onSuccess(): void {
    if (this.state.state === 'half-open') {
      this.reset();
    }
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.config.failureThreshold) {
      this.state.state = 'open';
      this.state.nextRetryTime = Date.now() + this.config.resetTimeout;
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.state.state === 'open' &&
      this.state.nextRetryTime !== undefined &&
      Date.now() >= this.state.nextRetryTime
    );
  }
}

// ===== Retry Manager =====

export class RetryManager {
  private circuitBreaker: CircuitBreaker;
  private config: Required<RetryOptions>;

  constructor(config: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 60000,
    },
  }) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      initialDelay: config.initialDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      backoffMultiplier: config.backoffMultiplier || 2,
      shouldRetry: () => true,
    };

    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
  }

  /**
   * Execute function with retry and circuit breaker
   */
  async execute<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
    return this.circuitBreaker.execute(() =>
      retry(fn, { ...this.config, ...options })
    );
  }

  /**
   * Execute with jitter
   */
  async executeWithJitter<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
    return this.circuitBreaker.execute(() =>
      retryWithJitter(fn, { ...this.config, ...options })
    );
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuit(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Update configuration
   */
  configure(config: Partial<RetryConfig>): void {
    if (config.maxRetries !== undefined) this.config.maxRetries = config.maxRetries;
    if (config.initialDelay !== undefined) this.config.initialDelay = config.initialDelay;
    if (config.maxDelay !== undefined) this.config.maxDelay = config.maxDelay;
    if (config.backoffMultiplier !== undefined) {
      this.config.backoffMultiplier = config.backoffMultiplier;
    }
    if (config.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    }
  }
}

// ===== Default Retry Manager =====

export const retryManager = new RetryManager({
  maxRetries: parseInt(process.env.RETRY_MAX_RETRIES || '3', 10),
  initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY || '1000', 10),
  maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '30000', 10),
  backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
  circuitBreaker: {
    enabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000', 10),
  },
});

// ===== Exports =====

export default retryManager;

// ===== Utility Functions =====

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a retry manager
 */
export function createRetryManager(config?: RetryConfig): RetryManager {
  return new RetryManager(config);
}

/**
 * Retry decorator for methods
 */
export function Retry(options?: RetryOptions) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return retry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Circuit breaker decorator
 */
export function WithCircuitBreaker(config?: Partial<RetryConfig['circuitBreaker']>) {
  const breaker = new CircuitBreaker(config);

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return breaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const retryableErrors = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENETUNREACH',
    'EAI_AGAIN',
  ];

  return retryableErrors.some((code) => error.message.includes(code));
}

/**
 * Create retry options for network errors
 */
export function networkRetryOptions(overrides?: Partial<RetryOptions>): RetryOptions {
  return {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: isRetryableError,
    ...overrides,
  };
}

/**
 * Create retry options for rate limiting
 */
export function rateLimitRetryOptions(overrides?: Partial<RetryOptions>): RetryOptions {
  return {
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 3,
    shouldRetry: (error) => error.message.includes('429') || error.message.includes('rate limit'),
    ...overrides,
  };
}
