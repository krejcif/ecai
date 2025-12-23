/**
 * Caching Utility
 *
 * Provides in-memory LRU cache with TTL support, cache invalidation, and statistics
 */

import { CacheStats, CacheConfig } from '../types';

// ===== Cache Node for LRU Implementation =====

class CacheNode<T = unknown> {
  constructor(
    public key: string,
    public value: T,
    public expiresAt: number,
    public size: number = 1,
    public prev: CacheNode<T> | null = null,
    public next: CacheNode<T> | null = null
  ) {}
}

// ===== LRU Cache =====

export class Cache<T = unknown> {
  private map: Map<string, CacheNode<T>>;
  private head: CacheNode<T> | null = null;
  private tail: CacheNode<T> | null = null;
  private currentSize: number = 0;
  private stats: CacheStats;
  private config: Required<CacheConfig>;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      ttl: config.ttl || 3600,
      enabled: config.enabled !== false,
    };

    this.map = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
    };
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    if (!this.config.enabled) {
      this.stats.misses++;
      return undefined;
    }

    const node = this.map.get(key);

    if (!node) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check if expired
    if (Date.now() > node.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Move to front (most recently used)
    this.moveToFront(node);
    this.stats.hits++;
    this.updateHitRate();

    return node.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    if (!this.config.enabled) {
      return;
    }

    // Delete existing key if present
    if (this.map.has(key)) {
      this.delete(key);
    }

    const expiresAt = Date.now() + (ttl || this.config.ttl) * 1000;
    const size = this.calculateSize(value);
    const node = new CacheNode(key, value, expiresAt, size);

    // Add to map and front of list
    this.map.set(key, node);
    this.addToFront(node);
    this.currentSize += size;
    this.stats.entries++;
    this.stats.size = this.currentSize;

    // Evict if necessary
    while (this.currentSize > this.config.maxSize && this.tail) {
      this.removeTail();
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const node = this.map.get(key);
    if (!node) {
      return false;
    }

    if (Date.now() > node.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const node = this.map.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.map.delete(key);
    this.currentSize -= node.size;
    this.stats.entries--;
    this.stats.size = this.currentSize;

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
    this.currentSize = 0;
    this.stats.entries = 0;
    this.stats.size = 0;
  }

  /**
   * Get or set value (lazy initialization)
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get or set value (sync version)
   */
  getOrSetSync(key: string, factory: () => T, ttl?: number): T {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get multiple values
   */
  getMany(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();

    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Set multiple values
   */
  setMany(entries: Map<string, T>, ttl?: number): void {
    Array.from(entries).forEach(([key, value]) => {
      this.set(key, value, ttl);
    });
  }

  /**
   * Delete multiple keys
   */
  deleteMany(keys: string[]): number {
    let deleted = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.map.keys());
  }

  /**
   * Get all values
   */
  values(): T[] {
    this.cleanExpired();
    return Array.from(this.map.values()).map((node) => node.value);
  }

  /**
   * Get all entries
   */
  entries(): Array<[string, T]> {
    this.cleanExpired();
    return Array.from(this.map.entries()).map(([key, node]) => [key, node.value]);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.updateHitRate();
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    let cleaned = 0;
    const now = Date.now();

    Array.from(this.map.entries()).forEach(([key, node]) => {
      if (now > node.expiresAt) {
        this.delete(key);
        cleaned++;
      }
    });

    return cleaned;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.map.size;
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable cache
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable cache
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };

    // Evict if new maxSize is smaller
    while (this.currentSize > this.config.maxSize && this.tail) {
      this.removeTail();
    }
  }

  // ===== Private Methods =====

  private moveToFront(node: CacheNode<T>): void {
    if (node === this.head) {
      return;
    }

    this.removeNode(node);
    this.addToFront(node);
  }

  private addToFront(node: CacheNode<T>): void {
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private removeTail(): void {
    if (!this.tail) {
      return;
    }

    const key = this.tail.key;
    this.delete(key);
  }

  private calculateSize(value: T): number {
    // Simple size calculation - can be enhanced
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// ===== Default Cache Instance =====

export const cache = new Cache({
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
  ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
  enabled: process.env.CACHE_ENABLED !== 'false',
});

// ===== Exports =====

export default cache;

// ===== Utility Functions =====

/**
 * Create a cache instance
 */
export function createCache<T = unknown>(config?: Partial<CacheConfig>): Cache<T> {
  return new Cache<T>(config);
}

/**
 * Cache decorator for methods
 */
export function Cached(ttl?: number) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cacheKey = `${target?.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: unknown[]) {
      const key = `${cacheKey}:${JSON.stringify(args)}`;
      const cached = cache.get(key);

      if (cached !== undefined) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result, ttl);
      return result;
    };

    return descriptor;
  };
}

/**
 * Memoize function with cache
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: { ttl?: number; keyGen?: (...args: Parameters<T>) => string } = {}
): T {
  const fnCache = createCache();

  return ((...args: Parameters<T>) => {
    const key = options.keyGen
      ? options.keyGen(...args)
      : JSON.stringify(args);

    return fnCache.getOrSetSync(key, () => fn(...args), options.ttl);
  }) as T;
}
