/*
 * Copyright (c) 2024, Jorge Terrats
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Worker Pool - Adaptive Concurrency Manager
 *
 * Automatically determines optimal concurrency based on:
 * - Available CPU cores
 * - Salesforce API limits
 * - Memory availability
 * - User configuration
 *
 * Follows Error-Driven Development (EDD) principles.
 */

import * as os from 'node:os';
import pLimit from 'p-limit';

/**
 * Salesforce API concurrent request limits
 * Based on: https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta/salesforce_app_limits_cheatsheet/salesforce_app_limits_platform_api.htm
 */
const SALESFORCE_LIMITS = {
  // Maximum concurrent API requests per org
  MAX_CONCURRENT_REQUESTS: 25,

  // Recommended safe limit (to leave room for other operations)
  SAFE_CONCURRENT_REQUESTS: 10,

  // Conservative limit for metadata operations (they're heavier)
  METADATA_CONCURRENT_REQUESTS: 5,
} as const;

/**
 * Worker pool configuration
 */
export type WorkerPoolConfig = {
  /** Maximum concurrent workers (overrides auto-detection) */
  maxWorkers?: number;

  /** Operation type (affects limits) */
  operationType?: 'metadata' | 'api' | 'file';

  /** Whether to log performance metrics */
  verbose?: boolean;
};

/**
 * System capabilities
 */
export type SystemCapabilities = {
  /** Number of CPU cores */
  cpuCores: number;

  /** Available memory in MB */
  availableMemoryMB: number;

  /** Total memory in MB */
  totalMemoryMB: number;

  /** Recommended worker count */
  recommendedWorkers: number;

  /** Maximum safe worker count */
  maxSafeWorkers: number;
};

/**
 * Detects system capabilities
 *
 * @returns System capabilities including CPU, memory, and recommended worker count
 */
export function detectSystemCapabilities(): SystemCapabilities {
  const cpuCores = os.cpus().length;
  const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
  const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);

  // Calculate recommended workers based on CPU cores
  // Rule: Use 50-75% of cores to leave room for other processes
  const recommendedWorkers = Math.max(1, Math.floor(cpuCores * 0.75));

  // Max safe workers: Don't exceed Salesforce API limits
  const maxSafeWorkers = Math.min(
    cpuCores, // Don't exceed CPU cores
    SALESFORCE_LIMITS.SAFE_CONCURRENT_REQUESTS // Don't exceed SF limits
  );

  return {
    cpuCores,
    availableMemoryMB: freeMemoryMB,
    totalMemoryMB,
    recommendedWorkers,
    maxSafeWorkers,
  };
}

/**
 * Calculates optimal worker count based on operation type and system capabilities
 *
 * @param operationType - Type of operation (metadata, api, file)
 * @param userOverride - User-specified worker count (takes precedence)
 * @returns Optimal worker count
 */
export function calculateOptimalWorkers(
  operationType: 'metadata' | 'api' | 'file' = 'metadata',
  userOverride?: number
): number {
  // If user specified a count, use it (but cap at safe limits)
  if (userOverride !== undefined && userOverride > 0) {
    const capabilities = detectSystemCapabilities();
    return Math.min(userOverride, capabilities.maxSafeWorkers);
  }

  const capabilities = detectSystemCapabilities();

  // Adjust based on operation type
  switch (operationType) {
    case 'metadata':
      // Metadata operations are heavy and hit SF API
      return Math.min(
        capabilities.recommendedWorkers,
        SALESFORCE_LIMITS.METADATA_CONCURRENT_REQUESTS
      );

    case 'api':
      // Regular API operations
      return Math.min(
        capabilities.recommendedWorkers,
        SALESFORCE_LIMITS.SAFE_CONCURRENT_REQUESTS
      );

    case 'file':
      // File operations are CPU/disk bound, can use more workers
      return capabilities.recommendedWorkers;

    default:
      return capabilities.recommendedWorkers;
  }
}

/**
 * Creates a worker pool with adaptive concurrency
 *
 * @param config - Worker pool configuration
 * @returns Concurrency limiter function and pool info
 *
 * @example
 * ```typescript
 * const pool = createWorkerPool({ operationType: 'metadata', verbose: true });
 *
 * console.log(`Using ${pool.workerCount} workers`);
 * console.log(`System: ${pool.capabilities.cpuCores} cores, ${pool.capabilities.availableMemoryMB}MB free`);
 *
 * // Use the limiter for parallel operations
 * const results = await Promise.all(
 *   items.map(item => pool.limit(() => processItem(item)))
 * );
 * ```
 */
export function createWorkerPool(config: WorkerPoolConfig = {}): {
  limit: ReturnType<typeof pLimit>;
  workerCount: number;
  capabilities: SystemCapabilities;
  salesforceLimits: typeof SALESFORCE_LIMITS;
  executeAll: <T>(tasks: Array<() => Promise<T>>) => Promise<T[]>;
  clearPending: () => void;
  getStats: () => { activeCount: number; pendingCount: number; workerCount: number };
} {
  const capabilities = detectSystemCapabilities();
  const workerCount = calculateOptimalWorkers(
    config.operationType ?? 'metadata',
    config.maxWorkers
  );

  const limit = pLimit(workerCount);

  if (config.verbose) {
    // eslint-disable-next-line no-console
    console.log('\n🔧 Worker Pool Configuration:');
    // eslint-disable-next-line no-console
    console.log(`   CPU Cores: ${capabilities.cpuCores}`);
    // eslint-disable-next-line no-console
    console.log(`   Available Memory: ${capabilities.availableMemoryMB}MB / ${capabilities.totalMemoryMB}MB`);
    // eslint-disable-next-line no-console
    console.log(`   Operation Type: ${config.operationType ?? 'metadata'}`);
    // eslint-disable-next-line no-console
    console.log(`   Workers: ${workerCount} (recommended: ${capabilities.recommendedWorkers}, max safe: ${capabilities.maxSafeWorkers})`);
    // eslint-disable-next-line no-console
    console.log('');
  }

  return {
    /** Concurrency limiter function */
    limit,

    /** Number of workers in the pool */
    workerCount,

    /** System capabilities */
    capabilities,

    /** Salesforce API limits */
    salesforceLimits: SALESFORCE_LIMITS,

    /**
     * Executes an array of tasks with concurrency limit
     *
     * @param tasks - Array of async functions to execute
     * @returns Promise of results array
     */
    async executeAll<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
      return Promise.all(tasks.map((task) => limit(task)));
    },

    /**
     * Clears all pending tasks
     */
    clearPending(): void {
      limit.clearQueue();
    },

    /**
     * Gets current pool stats
     */
    getStats(): { activeCount: number; pendingCount: number; workerCount: number } {
      return {
        activeCount: limit.activeCount,
        pendingCount: limit.pendingCount,
        workerCount,
      };
    },
  };
}

/**
 * Performance metrics tracker
 */
export class PerformanceTracker {
  private startTime: number;
  private apiCalls: number = 0;
  private operations: Map<string, { count: number; totalMs: number }> = new Map();

  public constructor() {
    this.startTime = Date.now();
  }

  /**
   * Records an API call
   */
  public recordApiCall(): void {
    this.apiCalls += 1;
  }

  /**
   * Records an operation with timing
   *
   * @param operationName - Name of the operation
   * @param durationMs - Duration in milliseconds
   */
  public recordOperation(operationName: string, durationMs: number): void {
    const existing = this.operations.get(operationName) ?? { count: 0, totalMs: 0 };
    this.operations.set(operationName, {
      count: existing.count + 1,
      totalMs: existing.totalMs + durationMs,
    });
  }

  /**
   * Gets performance summary
   */
  public getSummary(): {
    totalMs: number;
    totalSeconds: string;
    apiCalls: number;
    operations: Array<{ name: string; count: number; totalMs: number; avgMs: number }>;
    apiCallsPerSecond: string;
  } {
    const totalMs = Date.now() - this.startTime;
    const operations = Array.from(this.operations.entries()).map(([name, stats]) => ({
      name,
      count: stats.count,
      totalMs: stats.totalMs,
      avgMs: Math.round(stats.totalMs / stats.count),
    }));

    return {
      totalMs,
      totalSeconds: (totalMs / 1000).toFixed(2),
      apiCalls: this.apiCalls,
      operations,
      apiCallsPerSecond: totalMs > 0 ? (this.apiCalls / (totalMs / 1000)).toFixed(2) : '0',
    };
  }

  /**
   * Logs performance summary
   */
  public logSummary(): void {
    const summary = this.getSummary();

    /* eslint-disable no-console */
    console.log('\n📊 Performance Summary:');
    console.log(`   Total Time: ${summary.totalSeconds}s`);
    console.log(`   API Calls: ${summary.apiCalls} (${summary.apiCallsPerSecond}/s)`);

    if (summary.operations.length > 0) {
      console.log('   Operations:');
      for (const op of summary.operations) {
        console.log(`      - ${op.name}: ${op.count}x (avg: ${op.avgMs}ms)`);
      }
    }
    console.log('');
    /* eslint-enable no-console */
  }
}

/**
 * Wraps an async function with performance tracking
 *
 * @param fn - Async function to wrap
 * @param operationName - Name for tracking
 * @param tracker - Performance tracker instance
 * @returns Wrapped function
 */
export function withPerformanceTracking<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string,
  tracker: PerformanceTracker
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      tracker.recordOperation(operationName, Date.now() - start);
      return result;
    } catch (error) {
      tracker.recordOperation(`${operationName} (error)`, Date.now() - start);
      throw error;
    }
  };
}

