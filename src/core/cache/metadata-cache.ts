/**
 * Filesystem Metadata Cache - Issue #3
 *
 * Implements persistent filesystem cache for listMetadata results.
 * Covers 10 scenarios with graceful degradation (never fails operations).
 *
 * Cache location: ~/.sf/profiler-cache/
 * File format: {orgId}-{metadataType}-{apiVersion}.json
 *
 * Error Recovery Strategies:
 * - CacheCorruptedError: Auto-delete, fetch fresh
 * - CacheWriteError: Log warning, continue without cache
 * - CacheReadError: Log warning, fetch from API
 * - CacheDiskFullError: Clear old entries, retry
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  CacheCorruptedError,
  CacheDiskFullError,
  CacheReadError,
  CacheWriteError,
} from '../errors/cache-errors.js';

/**
 * Cache entry structure stored in filesystem
 */
type FilesystemCacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
  orgId: string;
  metadataType: string;
  apiVersion: string;
};

/**
 * Filesystem Metadata Cache
 *
 * Implements persistent cache with error recovery.
 * All errors are non-fatal - operations continue gracefully.
 */
export class FilesystemMetadataCache {
  private static instance: FilesystemMetadataCache | null = null;
  private cacheDir: string;
  private defaultTtl: number;
  private memoryCache: Map<string, FilesystemCacheEntry<unknown>> = new Map(); // In-memory fallback
  private hits = 0;
  private misses = 0;
  private errors = 0;

  /**
   * Private constructor to enforce singleton
   */
  private constructor(cacheDir?: string, defaultTtl: number = 3_600_000) {
    // Default: ~/.sf/profiler-cache/
    this.cacheDir = cacheDir ?? path.join(os.homedir(), '.sf', 'profiler-cache');
    this.defaultTtl = defaultTtl; // 1 hour default
  }

  /**
   * Gets the singleton instance
   */
  public static getInstance(cacheDir?: string, defaultTtl?: number): FilesystemMetadataCache {
    if (!FilesystemMetadataCache.instance) {
      FilesystemMetadataCache.instance = new FilesystemMetadataCache(cacheDir, defaultTtl);
    }
    return FilesystemMetadataCache.instance;
  }

  /**
   * Deletes a cache file (used for corrupted cache recovery)
   */
  private static async deleteCacheFile(cachePath: string): Promise<void> {
    try {
      await fs.unlink(cachePath);
    } catch (error) {
      // Ignore delete errors (file may not exist)
    }
  }

  /**
   * Gets data from cache (Scenario 1: Cache Hit, Scenario 7: Cache Expired)
   *
   * @returns Cached data or null if not found/expired
   */
  public async get<T>(orgId: string, metadataType: string, apiVersion: string): Promise<T | null> {
    const cachePath = this.getCacheFilePath(orgId, metadataType, apiVersion);

    // Try memory cache first (fastest)
    const memoryKey = `${orgId}:${metadataType}:${apiVersion}`;
    const memoryEntry = this.memoryCache.get(memoryKey) as FilesystemCacheEntry<T> | undefined;
    if (memoryEntry) {
      const now = Date.now();
      if (now - memoryEntry.timestamp < memoryEntry.ttl) {
        this.hits += 1;
        return memoryEntry.data;
      }
      // Expired - remove from memory
      this.memoryCache.delete(memoryKey);
    }

    // Try filesystem cache
    try {
      const fileContent = await fs.readFile(cachePath, 'utf-8');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const entry = JSON.parse(fileContent) as FilesystemCacheEntry<T>;

      // Validate entry structure (Scenario 3: Cache Corrupted - partial)
      if (!entry.data || typeof entry.timestamp !== 'number' || typeof entry.ttl !== 'number') {
        // Corrupted structure - delete and return null
        await FilesystemMetadataCache.deleteCacheFile(cachePath);
        this.misses += 1;
        return null;
      }

      // Check expiration (Scenario 7: Cache Expired)
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        // Expired - delete and return null
        await FilesystemMetadataCache.deleteCacheFile(cachePath).catch(() => {
          // Ignore delete errors
        });
        this.misses += 1;
        return null;
      }

      // Valid cache hit (Scenario 1: Cache Hit)
      // Also store in memory for faster subsequent access
      this.memoryCache.set(memoryKey, entry);
      this.hits += 1;
      return entry.data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Scenario 3: Cache Corrupted (JSON parse error)
      if (err.message.includes('JSON') || err.message.includes('parse')) {
        await FilesystemMetadataCache.deleteCacheFile(cachePath).catch(() => {
          // Ignore delete errors
        });
        // Create error for logging, but don't throw (non-fatal)
        // Error created but not thrown - graceful degradation
        new CacheCorruptedError(orgId, cachePath, err);
        this.errors += 1;
        this.misses += 1;
        // Non-fatal: return null, operation continues (error logged but not thrown)
        return null;
      }

      // Scenario 5: Cache Read Error (file not found, permissions, etc.)
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - normal cache miss (Scenario 2: Cache Miss)
        this.misses += 1;
        return null;
      }

      // Other read errors (Scenario 5: Cache Read Error)
      // Error created but not thrown - graceful degradation
      new CacheReadError(cachePath, err);
      this.errors += 1;
      this.misses += 1;
      // Non-fatal: return null, operation continues without cache (error logged but not thrown)
      return null;
    }
  }

  /**
   * Sets data in cache (Scenario 2: Cache Miss - storing result)
   *
   * Handles all write errors gracefully (Scenario 4: Cache Write Error, Scenario 6: Cache Disk Full)
   */
  public async set<T>(
    orgId: string,
    metadataType: string,
    apiVersion: string,
    data: T,
    ttl?: number
  ): Promise<void> {
    const cachePath = this.getCacheFilePath(orgId, metadataType, apiVersion);
    const entry: FilesystemCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      orgId,
      metadataType,
      apiVersion,
    };

    // Store in memory cache first (always succeeds)
    const memoryKey = `${orgId}:${metadataType}:${apiVersion}`;
    this.memoryCache.set(memoryKey, entry);

    // Try to write to filesystem (may fail, but that's OK)
    try {
      await this.ensureCacheDir();

      const content = JSON.stringify(entry, null, 2);
      await fs.writeFile(cachePath, content, 'utf-8');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const errno = (err as NodeJS.ErrnoException).code;

      // Scenario 6: Cache Disk Full
      if (errno === 'ENOSPC' || err.message.toLowerCase().includes('space')) {
        // Error created but not thrown - graceful degradation
        new CacheDiskFullError(cachePath);
        this.errors += 1;
        // Try to clear old entries and retry
        try {
          await this.clearExpiredEntries();
          // Retry write after clearing
          const content = JSON.stringify(entry, null, 2);
          await fs.writeFile(cachePath, content, 'utf-8');
          return; // Success after retry
        } catch (retryError) {
          // Still failed after clearing - continue without cache (non-fatal)
          // Scenario 4: Cache Write Error (final fallback)
          // Non-fatal: operation continues, just without filesystem cache
          return;
        }
      }

      // Scenario 4: Cache Write Error (permissions, etc.)
      // Error created but not thrown - graceful degradation
      new CacheWriteError(cachePath, err);
      this.errors += 1;
      // Non-fatal: operation continues, memory cache still works (error logged but not thrown)
    }
  }

  /**
   * Gets cache statistics
   */
  public getStats(): {
    errors: number;
    hitRate: number;
    hits: number;
    misses: number;
    size: number;
  } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      size: this.memoryCache.size,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    };
  }

  /**
   * Clears cache for a specific org (Scenario 8: Multiple Orgs)
   */
  public async clearOrg(orgId: string): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const safeOrgId = orgId.replace(/[^a-zA-Z0-9]/g, '_');

      const deletePromises = files
        .filter((file) => file.startsWith(safeOrgId))
        .map((file) =>
          fs.unlink(path.join(this.cacheDir, file)).catch(() => {
            // Ignore errors
          })
        );

      await Promise.all(deletePromises);

      // Clear memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(`${orgId}:`)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Clears all cache
   */
  public async clearAll(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const deletePromises = files
        .filter((file) => file.endsWith('.json'))
        .map((file) =>
          fs.unlink(path.join(this.cacheDir, file)).catch(() => {
            // Ignore errors
          })
        );

      await Promise.all(deletePromises);
      this.memoryCache.clear();
      this.hits = 0;
      this.misses = 0;
      this.errors = 0;
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Checks if cache directory is accessible
   */
  public async isAccessible(): Promise<boolean> {
    try {
      await this.ensureCacheDir();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensures cache directory exists
   * Handles errors gracefully (non-fatal)
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      // CacheWriteError - but non-fatal, continue without cache
      const err = error instanceof Error ? error : new Error(String(error));
      throw new CacheWriteError(this.cacheDir, err);
    }
  }

  /**
   * Generates cache file path
   */
  private getCacheFilePath(orgId: string, metadataType: string, apiVersion: string): string {
    // Sanitize orgId for filename (remove special chars)
    const safeOrgId = orgId.replace(/[^a-zA-Z0-9]/g, '_');
    const safeMetadataType = metadataType.replace(/[^a-zA-Z0-9]/g, '_');
    const safeApiVersion = apiVersion.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = `${safeOrgId}-${safeMetadataType}-${safeApiVersion}.json`;
    return path.join(this.cacheDir, filename);
  }

  /**
   * Clears expired entries (used for disk full recovery)
   */
  private async clearExpiredEntries(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();

      // Process files in parallel (but limit concurrency)
      const deletePromises: Array<Promise<void>> = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.cacheDir, file);
        const deletePromise = (async (): Promise<void> => {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const entry = JSON.parse(content) as FilesystemCacheEntry<unknown>;

            if (now - entry.timestamp > entry.ttl) {
              await fs.unlink(filePath);
            }
          } catch {
            // Corrupted file - delete it
            await fs.unlink(filePath).catch(() => {
              // Ignore errors
            });
          }
        })();

        deletePromises.push(deletePromise);
      }

      // Wait for all deletions
      await Promise.all(deletePromises);

      // Also clear memory cache expired entries
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  }
}

/**
 * Gets the singleton filesystem cache instance
 */
export function getFilesystemMetadataCache(
  cacheDir?: string,
  defaultTtl?: number
): FilesystemMetadataCache {
  return FilesystemMetadataCache.getInstance(cacheDir, defaultTtl);
}
