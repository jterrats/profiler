/*
 * Copyright (c) 2024, Jorge Terrats
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Metadata Cache - Singleton Pattern
 *
 * Prevents redundant API calls by caching metadata list results.
 * Uses singleton pattern to share cache across all operations in the same session.
 *
 * Benefits:
 * - Reduces API calls to Salesforce
 * - Faster subsequent operations
 * - Respects Salesforce API limits
 *
 * Follows Error-Driven Development (EDD) principles.
 */

/**
 * Cache entry with TTL
 */
type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

/**
 * Cache statistics
 */
export type CacheStats = {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
};

/**
 * Metadata cache singleton
 *
 * Singleton pattern ensures one cache instance per Node.js process
 */
export class MetadataCache {
  private static instance: MetadataCache | null = null;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private hits = 0;
  private misses = 0;

  /**
   * Private constructor to enforce singleton
   */
  private constructor() {}

  /**
   * Gets the singleton instance
   *
   * @returns The singleton cache instance
   */
  public static getInstance(): MetadataCache {
    if (!MetadataCache.instance) {
      MetadataCache.instance = new MetadataCache();
    }
    return MetadataCache.instance;
  }

  /**
   * Generates cache key
   *
   * @param orgId - Salesforce org ID
   * @param metadataType - Type of metadata
   * @param apiVersion - API version
   * @returns Cache key
   */
  private static generateKey(orgId: string, metadataType: string, apiVersion: string): string {
    return `${orgId}:${metadataType}:${apiVersion}`;
  }

  /**
   * Gets data from cache
   *
   * @param orgId - Salesforce org ID
   * @param metadataType - Type of metadata
   * @param apiVersion - API version
   * @returns Cached data or null if not found/expired
   */
  public get<T>(orgId: string, metadataType: string, apiVersion: string): T | null {
    const key = MetadataCache.generateKey(orgId, metadataType, apiVersion);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.misses += 1;
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses += 1;
      return null;
    }

    this.hits += 1;
    return entry.data;
  }

  /**
   * Sets data in cache
   *
   * @param orgId - Salesforce org ID
   * @param metadataType - Type of metadata
   * @param apiVersion - API version
   * @param data - Data to cache
   * @param ttl - Time to live in ms (default: 5 minutes)
   */
  public set<T>(
    orgId: string,
    metadataType: string,
    apiVersion: string,
    data: T,
    ttl: number = 300_000 // 5 minutes
  ): void {
    const key = MetadataCache.generateKey(orgId, metadataType, apiVersion);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Checks if data exists in cache
   *
   * @param orgId - Salesforce org ID
   * @param metadataType - Type of metadata
   * @param apiVersion - API version
   * @returns True if data exists and not expired
   */
  public has(orgId: string, metadataType: string, apiVersion: string): boolean {
    return this.get(orgId, metadataType, apiVersion) !== null;
  }

  /**
   * Clears cache for a specific org
   *
   * @param orgId - Salesforce org ID
   */
  public clearOrg(orgId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${orgId}:`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clears all cache
   */
  public clearAll(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Gets cache statistics
   *
   * @returns Cache stats
   */
  public getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    };
  }

  /**
   * Logs cache statistics
   */
  public logStats(): void {
    const stats = this.getStats();

    /* eslint-disable no-console */
    console.log('\n📦 Cache Statistics:');
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Misses: ${stats.misses}`);
    console.log(`   Size: ${stats.size} entries`);
    console.log(`   Hit Rate: ${stats.hitRate.toFixed(1)}%`);
    console.log('');
    /* eslint-enable no-console */
  }

  /**
   * Cleans up expired entries
   */
  public cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
}

/**
 * Gets the singleton cache instance
 *
 * Convenience function for easier imports
 *
 * @returns Singleton cache instance
 */
export function getMetadataCache(): MetadataCache {
  return MetadataCache.getInstance();
}

/**
 * Wraps an async function with caching
 *
 * @param fn - Function to wrap
 * @param orgId - Salesforce org ID
 * @param metadataType - Type of metadata
 * @param apiVersion - API version
 * @param ttl - Cache TTL in ms (default: 5 minutes)
 * @returns Wrapped function result (from cache or fresh)
 *
 * @example
 * ```typescript
 * const cache = getMetadataCache();
 *
 * const result = await withCache(
 *   () => connection.metadata.list({ type: 'Profile' }),
 *   orgId,
 *   'Profile',
 *   '60.0'
 * );
 * ```
 */
export async function withCache<T>(
  fn: () => Promise<T>,
  orgId: string,
  metadataType: string,
  apiVersion: string,
  ttl?: number
): Promise<T> {
  const cache = getMetadataCache();

  // Try to get from cache
  const cached = cache.get<T>(orgId, metadataType, apiVersion);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute function
  const result = await fn();

  // Store in cache
  cache.set(orgId, metadataType, apiVersion, result, ttl);

  return result;
}

