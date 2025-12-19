/**
 * Cache Operation Errors
 *
 * Errors for metadata cache operations.
 * Following Error-Driven Development methodology.
 * All cache errors are recoverable (graceful degradation).
 */

import { SystemError } from './base-errors.js';

// ============================================================================
// CACHE OPERATION ERRORS (4 total)
// ============================================================================

/**
 * CacheCorruptedError - Cache file is corrupted
 * When: Cache file exists but cannot be parsed
 * Recoverable: Yes (auto-delete, fetch fresh)
 */
export class CacheCorruptedError extends SystemError {
  public constructor(orgAlias: string, cachePath: string, cause?: Error) {
    super(
      `Cache corrupted for org '${orgAlias}'. Clearing cache.`,
      'CACHE_CORRUPTED',
      [
        'Cache cleared automatically',
        'Fresh metadata will be fetched',
        'No user action needed',
      ],
      true // recoverable
    );
    if (cause) {
      this.cause = cause;
    }
    // Store additional context
    (this as unknown as { cachePath: string }).cachePath = cachePath;
  }
}

/**
 * CacheWriteError - Cannot write to cache
 * When: Disk full, permissions issue, or I/O error
 * Recoverable: Yes (continue without cache)
 */
export class CacheWriteError extends SystemError {
  public constructor(cachePath: string, cause?: Error) {
    super(
      `Failed to write cache: ${cause?.message ?? 'Unknown error'}`,
      'CACHE_WRITE_ERROR',
      [
        'Check disk space',
        `Check permissions on ${cachePath}`,
        'Continue without caching (slower but works)',
      ],
      true // recoverable
    );
    if (cause) {
      this.cause = cause;
    }
    // Store additional context
    (this as unknown as { cachePath: string }).cachePath = cachePath;
  }
}

/**
 * CacheReadError - Cannot read from cache
 * When: File missing, permissions issue, or I/O error
 * Recoverable: Yes (fetch from API)
 */
export class CacheReadError extends SystemError {
  public constructor(cachePath: string, cause?: Error) {
    super(
      `Failed to read cache: ${cause?.message ?? 'Unknown error'}`,
      'CACHE_READ_ERROR',
      [
        `Check permissions on ${cachePath}`,
        'Metadata will be fetched from API',
        'No user action needed',
      ],
      true // recoverable
    );
    if (cause) {
      this.cause = cause;
    }
    // Store additional context
    (this as unknown as { cachePath: string }).cachePath = cachePath;
  }
}

/**
 * CacheDiskFullError - No space for cache
 * When: Disk is full or quota exceeded
 * Recoverable: Yes (clear old entries, retry)
 */
export class CacheDiskFullError extends SystemError {
  public constructor(cachePath: string, availableSpace?: number) {
    const spaceInfo = availableSpace !== undefined ? ` (${availableSpace} bytes available)` : '';
    super(
      `Disk full: Cannot write cache${spaceInfo}`,
      'CACHE_DISK_FULL',
      [
        'Old cache entries will be cleared automatically',
        'Free up disk space if issue persists',
        'Continue without caching if clearing fails',
      ],
      true // recoverable
    );
    // Store additional context
    (this as unknown as { cachePath: string; availableSpace?: number }).cachePath = cachePath;
    (this as unknown as { cachePath: string; availableSpace?: number }).availableSpace = availableSpace;
  }
}


