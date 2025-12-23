/**
 * Abstract base class for data connectors
 * Provides common functionality: retry logic, rate limiting, caching
 */

export interface ConnectorMetadata {
  name: string;
  source: string;
  version: string;
  description: string;
  rateLimit?: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
}

export interface FetchOptions {
  useCache?: boolean;
  cacheTTL?: number; // Time to live in milliseconds
  timeout?: number;
  retries?: number;
}

export interface RateLimitConfig {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
}

export abstract class BaseConnector<T = any> {
  protected cache: Map<string, { data: any; timestamp: number }>;
  protected requestQueue: number[];
  protected rateLimitConfig: RateLimitConfig;
  private lastRequestTime: number = 0;
  private minRequestInterval: number;

  constructor(rateLimitConfig?: RateLimitConfig) {
    this.cache = new Map();
    this.requestQueue = [];
    this.rateLimitConfig = rateLimitConfig || {
      requestsPerSecond: 10,
      requestsPerMinute: 100,
    };
    this.minRequestInterval = 1000 / (this.rateLimitConfig.requestsPerSecond || 10);
  }

  /**
   * Abstract method to fetch data from the source
   */
  abstract fetch(params?: any, options?: FetchOptions): Promise<T>;

  /**
   * Abstract method to transform raw data into standardized format
   */
  abstract transform(rawData: any): T;

  /**
   * Abstract method to get connector metadata
   */
  abstract getMetadata(): ConnectorMetadata;

  /**
   * Fetch data with retry logic
   */
  protected async fetchWithRetry(
    url: string,
    options: FetchOptions = {}
  ): Promise<any> {
    const { retries = 3, timeout = 30000, useCache = true, cacheTTL = 300000 } = options;

    // Check cache first
    if (useCache) {
      const cached = this.getFromCache(url, cacheTTL);
      if (cached) {
        return cached;
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Apply rate limiting
        await this.applyRateLimit();

        // Make the request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'ECAI-Connector/1.0',
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache the result
        if (useCache) {
          this.setCache(url, data);
        }

        return data;
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `Failed to fetch after ${retries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Apply rate limiting before making a request
   */
  protected async applyRateLimit(): Promise<void> {
    const now = Date.now();

    // Clean up old request timestamps (older than 1 minute)
    this.requestQueue = this.requestQueue.filter(
      timestamp => now - timestamp < 60000
    );

    // Check requests per minute limit
    if (
      this.rateLimitConfig.requestsPerMinute &&
      this.requestQueue.length >= this.rateLimitConfig.requestsPerMinute
    ) {
      const oldestRequest = this.requestQueue[0];
      const waitTime = 60000 - (now - oldestRequest);
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }

    // Check requests per second limit
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await this.sleep(this.minRequestInterval - timeSinceLastRequest);
    }

    // Update tracking
    this.lastRequestTime = Date.now();
    this.requestQueue.push(this.lastRequestTime);
  }

  /**
   * Get data from cache if not expired
   */
  protected getFromCache(key: string, ttl: number): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set data in cache
   */
  protected setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build URL with query parameters
   */
  protected buildUrl(baseUrl: string, params: Record<string, any>): string {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return url.toString();
  }
}
