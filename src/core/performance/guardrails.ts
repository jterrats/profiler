/*
 * Copyright (c) 2024, Jorge Terrats
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Guardrails - Safety Limits & Circuit Breaker
 *
 * Prevents:
 * - Infinite loops / runaway processes
 * - Excessive API calls to Salesforce
 * - Memory exhaustion
 * - User mistakes (retrieving 1000+ profiles)
 *
 * Follows Error-Driven Development (EDD) principles.
 */

/**
 * Safety thresholds for metadata operations
 */
export const SAFETY_LIMITS = {
  /** Maximum profiles to process in a single operation */
  MAX_PROFILES_PER_OPERATION: 50,
  
  /** Threshold to show warning */
  PROFILES_WARNING_THRESHOLD: 20,
  
  /** Maximum API calls before circuit breaker opens */
  MAX_API_CALLS_PER_MINUTE: 100,
  
  /** Maximum memory usage (MB) before throttling */
  MAX_MEMORY_MB: 512,
  
  /** Maximum operation duration (ms) */
  MAX_OPERATION_DURATION_MS: 300_000, // 5 minutes
  
  /** Maximum retries for failed operations */
  MAX_RETRIES: 3,
} as const;

/**
 * Warning levels
 */
export enum WarningLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

/**
 * Warning message
 */
export type GuardrailWarning = {
  level: WarningLevel;
  message: string;
  suggestion: string;
  canContinue: boolean;
};

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN',     // Too many errors, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker for Salesforce API calls
 * 
 * Prevents cascading failures by stopping requests when error rate is too high
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private resetTimeout: NodeJS.Timeout | null = null;
  
  public constructor(
    private readonly threshold: number = 5, // Open circuit after 5 failures
    private readonly timeout: number = 60_000 // Try to close after 60s
  ) {}
  
  /**
   * Records a successful operation
   */
  public recordSuccess(): void {
    this.failureCount = 0;
    this.successCount += 1;
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Recovered! Close the circuit
      this.state = CircuitState.CLOSED;
      /* eslint-disable no-console */
      console.log('✅ Circuit breaker CLOSED - Service recovered');
      /* eslint-enable no-console */
    }
  }
  
  /**
   * Records a failed operation
   */
  public recordFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold && this.state === CircuitState.CLOSED) {
      // Too many failures - open the circuit
      this.state = CircuitState.OPEN;
      
      /* eslint-disable no-console */
      console.error(`🔴 Circuit breaker OPEN - Too many failures (${this.failureCount})`);
      console.error('   Waiting ${this.timeout}ms before retry...');
      /* eslint-enable no-console */
      
      // Schedule circuit reset
      this.resetTimeout = setTimeout(() => {
        this.state = CircuitState.HALF_OPEN;
        this.failureCount = 0;
        /* eslint-disable no-console */
        console.log('🟡 Circuit breaker HALF_OPEN - Testing recovery...');
        /* eslint-enable no-console */
      }, this.timeout);
    }
  }
  
  /**
   * Checks if requests are allowed
   * 
   * @returns True if circuit is closed or half-open
   * @throws Error if circuit is open
   */
  public allowRequest(): boolean {
    if (this.state === CircuitState.OPEN) {
      throw new Error(
        'Circuit breaker is OPEN - Too many failures. ' +
        'Please wait before retrying. ' +
        `Last failure: ${this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : 'unknown'}`
      );
    }
    
    return true;
  }
  
  /**
   * Gets circuit state
   */
  public getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Resets circuit manually
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
  }
  
  /**
   * Gets circuit stats
   */
  public getStats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: number | null;
  } {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailure: this.lastFailureTime,
    };
  }
}

/**
 * Validates profile count and returns warnings
 * 
 * @param profileCount - Number of profiles to process
 * @returns Array of warnings (empty if safe)
 */
export function validateProfileCount(profileCount: number): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = [];
  
  if (profileCount > SAFETY_LIMITS.MAX_PROFILES_PER_OPERATION) {
    warnings.push({
      level: WarningLevel.CRITICAL,
      message: `Too many profiles (${profileCount}). Maximum allowed: ${SAFETY_LIMITS.MAX_PROFILES_PER_OPERATION}`,
      suggestion: 'Split into multiple smaller operations or use --name to filter specific profiles',
      canContinue: false,
    });
  } else if (profileCount > SAFETY_LIMITS.PROFILES_WARNING_THRESHOLD) {
    warnings.push({
      level: WarningLevel.WARNING,
      message: `Processing ${profileCount} profiles may take significant time and API calls`,
      suggestion: 'Consider filtering to specific profiles with --name flag for faster results',
      canContinue: true,
    });
  }
  
  return warnings;
}

/**
 * Validates metadata list size and returns warnings
 * 
 * @param metadataTypes - Object with metadata type counts
 * @returns Array of warnings
 */
export function validateMetadataSize(metadataTypes: Record<string, number>): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = [];
  const total = Object.values(metadataTypes).reduce((sum, count) => sum + count, 0);
  
  // Warn about large metadata sets
  if (total > 1000) {
    warnings.push({
      level: WarningLevel.WARNING,
      message: `Large metadata set detected (${total} items). This will make multiple API calls.`,
      suggestion: 'Consider using --exclude-managed to reduce size, or process in batches',
      canContinue: true,
    });
  }
  
  // Warn about specific large types
  for (const [type, count] of Object.entries(metadataTypes)) {
    if (count > 500) {
      warnings.push({
        level: WarningLevel.INFO,
        message: `${type}: ${count} items (API call will be slow)`,
        suggestion: `Consider if all ${type} are needed for profile operations`,
        canContinue: true,
      });
    }
  }
  
  return warnings;
}

/**
 * Checks memory usage and returns warning if high
 * 
 * @returns Warning if memory usage is concerning
 */
export function checkMemoryUsage(): GuardrailWarning | null {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  
  if (heapUsedMB > SAFETY_LIMITS.MAX_MEMORY_MB) {
    return {
      level: WarningLevel.CRITICAL,
      message: `High memory usage: ${heapUsedMB}MB (threshold: ${SAFETY_LIMITS.MAX_MEMORY_MB}MB)`,
      suggestion: 'Consider processing fewer items at once or increasing Node.js memory limit',
      canContinue: false,
    };
  }
  
  if (heapUsedMB > SAFETY_LIMITS.MAX_MEMORY_MB * 0.8) {
    return {
      level: WarningLevel.WARNING,
      message: `Memory usage at ${heapUsedMB}MB (80% of limit)`,
      suggestion: 'Monitor memory usage, may need to reduce batch size',
      canContinue: true,
    };
  }
  
  return null;
}

/**
 * Rate limiter to prevent excessive API calls
 */
export class RateLimiter {
  private callTimestamps: number[] = [];
  
  public constructor(
    private readonly maxCallsPerMinute: number = SAFETY_LIMITS.MAX_API_CALLS_PER_MINUTE
  ) {}
  
  /**
   * Records an API call
   * 
   * @throws Error if rate limit exceeded
   */
  public recordCall(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    
    // Remove calls older than 1 minute
    this.callTimestamps = this.callTimestamps.filter((timestamp) => timestamp > oneMinuteAgo);
    
    // Check if we're over the limit
    if (this.callTimestamps.length >= this.maxCallsPerMinute) {
      throw new Error(
        `Rate limit exceeded: ${this.callTimestamps.length} API calls in the last minute. ` +
        `Maximum: ${this.maxCallsPerMinute}. Please wait before retrying.`
      );
    }
    
    this.callTimestamps.push(now);
  }
  
  /**
   * Gets current rate
   */
  public getCurrentRate(): { callsLastMinute: number; limit: number; percentUsed: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    
    this.callTimestamps = this.callTimestamps.filter((timestamp) => timestamp > oneMinuteAgo);
    
    return {
      callsLastMinute: this.callTimestamps.length,
      limit: this.maxCallsPerMinute,
      percentUsed: (this.callTimestamps.length / this.maxCallsPerMinute) * 100,
    };
  }
  
  /**
   * Resets the rate limiter
   */
  public reset(): void {
    this.callTimestamps = [];
  }
}

/**
 * Displays warnings to the user
 * 
 * @param warnings - Array of warnings to display
 */
export function displayWarnings(warnings: GuardrailWarning[]): void {
  if (warnings.length === 0) return;
  
  /* eslint-disable no-console */
  console.log('\n⚠️  Safety Warnings:\n');
  
  for (const warning of warnings) {
    const icon = warning.level === WarningLevel.CRITICAL ? '🔴' : 
                 warning.level === WarningLevel.WARNING ? '🟡' : '🔵';
    
    console.log(`${icon} [${warning.level}] ${warning.message}`);
    console.log(`   💡 ${warning.suggestion}`);
    
    if (!warning.canContinue) {
      console.log('   ❌ Cannot continue - fix this issue first\n');
    } else {
      console.log('');
    }
  }
  /* eslint-enable no-console */
}

/**
 * Checks if operation can continue based on warnings
 * 
 * @param warnings - Array of warnings
 * @returns True if operation can continue
 */
export function canContinueOperation(warnings: GuardrailWarning[]): boolean {
  return !warnings.some((w) => !w.canContinue);
}

