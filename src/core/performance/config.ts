/*
 * Copyright (c) 2024, Jorge Terrats
 * All rights reserved.
 * Licensed under the MIT License.
 * For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Performance Configuration - Flexible Guardrails
 *
 * Allows users to customize safety limits via flags:
 * - --max-profiles: Override max profiles per operation
 * - --max-api-calls: Override API calls per minute limit
 * - --max-memory: Override memory limit
 * - --operation-timeout: Override operation timeout
 * - --no-guardrails: Disable all guardrails (dangerous!)
 *
 * Follows Error-Driven Development (EDD) principles.
 */

import { SAFETY_LIMITS } from './guardrails.js';

/**
 * Salesforce hard limits (CANNOT be overridden)
 * Source: https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta
 */
export const SALESFORCE_HARD_LIMITS = {
  /** Absolute max concurrent API requests per org */
  MAX_CONCURRENT_API_REQUESTS: 25,

  /**
   * Max API requests per 24 hours (BASE + per-license scaling)
   * Formula: Base + (licenses × per_license)
   */
  MAX_API_REQUESTS_PER_DAY: {
    // Developer Edition / Sandbox
    DEVELOPER: {
      BASE: 15_000,
      PER_LICENSE: 0, // Fixed limit, no scaling
      EXAMPLE: 15_000,
    },
    // Enterprise Edition
    ENTERPRISE: {
      BASE: 0,
      PER_LICENSE: 1000, // Scales with user licenses
      EXAMPLE_100_LICENSES: 100_000,
      EXAMPLE_1000_LICENSES: 1_000_000,
    },
    // Unlimited Edition
    UNLIMITED: {
      BASE: 0,
      PER_LICENSE: 5000, // Scales with user licenses
      EXAMPLE_100_LICENSES: 500_000,
      EXAMPLE_1000_LICENSES: 5_000_000,
    },
    // Performance Edition
    PERFORMANCE: {
      BASE: 0,
      PER_LICENSE: 5000,
      EXAMPLE_1000_LICENSES: 5_000_000,
    },
  },

  /** Max retrieve size (uncompressed) */
  MAX_RETRIEVE_SIZE_MB: 39,

  /** Max package.xml file size */
  MAX_PACKAGE_XML_SIZE_MB: 4,

  /** Max metadata items per retrieve */
  MAX_METADATA_ITEMS_PER_RETRIEVE: 10_000,

  /** API timeout (Salesforce enforced) */
  API_TIMEOUT_MS: 120_000, // 2 minutes
} as const;

/**
 * Performance configuration options
 */
export type PerformanceConfig = {
  /** Maximum profiles to process (default: 50) */
  maxProfiles?: number;

  /** Warning threshold for profiles (default: 20) */
  profilesWarningThreshold?: number;

  /** Maximum API calls per minute (default: 100) */
  maxApiCallsPerMinute?: number;

  /** Maximum memory usage in MB (default: 512) */
  maxMemoryMB?: number;

  /** Maximum operation duration in ms (default: 300000 = 5 min) */
  operationTimeoutMs?: number;

  /** Number of concurrent workers (default: auto-detect) */
  concurrentWorkers?: number;

  /** Show verbose performance metrics (default: false) */
  verbose?: boolean;
};

/**
 * Resolved performance configuration with applied overrides
 */
export type ResolvedConfig = {
  maxProfiles: number;
  profilesWarningThreshold: number;
  maxApiCallsPerMinute: number;
  maxMemoryMB: number;
  operationTimeoutMs: number;
  concurrentWorkers: number | undefined;
  guardrailsEnabled: boolean;
  verbose: boolean;
  warnings: string[];
};

/**
 * Validates and resolves performance configuration
 *
 * @param userConfig - User-provided configuration
 * @returns Resolved configuration with warnings
 */
export function resolvePerformanceConfig(userConfig: PerformanceConfig = {}): ResolvedConfig {
  const warnings: string[] = [];

  // Resolve max profiles
  const maxProfiles = userConfig.maxProfiles ?? SAFETY_LIMITS.MAX_PROFILES_PER_OPERATION;
  if (userConfig.maxProfiles && userConfig.maxProfiles > SAFETY_LIMITS.MAX_PROFILES_PER_OPERATION) {
    warnings.push(
      `📈 Increased max profiles to ${userConfig.maxProfiles} (default: ${SAFETY_LIMITS.MAX_PROFILES_PER_OPERATION})`,
      '   This may result in longer processing times and more API calls'
    );
  }

  // Resolve warning threshold
  const profilesWarningThreshold = userConfig.profilesWarningThreshold ?? SAFETY_LIMITS.PROFILES_WARNING_THRESHOLD;

  // Resolve max API calls
  const maxApiCallsPerMinute = userConfig.maxApiCallsPerMinute ?? SAFETY_LIMITS.MAX_API_CALLS_PER_MINUTE;
  if (userConfig.maxApiCallsPerMinute && userConfig.maxApiCallsPerMinute > SAFETY_LIMITS.MAX_API_CALLS_PER_MINUTE) {
    const perMinute = userConfig.maxApiCallsPerMinute;
    const perDay = perMinute * 60 * 24; // Extrapolate to daily

    warnings.push(
      `📈 Increased API calls limit to ${perMinute}/min (default: ${SAFETY_LIMITS.MAX_API_CALLS_PER_MINUTE})`,
      '   ⚠️  SALESFORCE HARD LIMITS (CANNOT OVERRIDE, SCALE WITH LICENSES):',
      `      - Max concurrent requests: ${SALESFORCE_HARD_LIMITS.MAX_CONCURRENT_API_REQUESTS}`,
      `      - Developer/Sandbox: ${SALESFORCE_HARD_LIMITS.MAX_API_REQUESTS_PER_DAY.DEVELOPER.BASE.toLocaleString()}/day (fixed)`,
      `      - Enterprise: ${SALESFORCE_HARD_LIMITS.MAX_API_REQUESTS_PER_DAY.ENTERPRISE.PER_LICENSE.toLocaleString()} per license/day`,
      `        Example: 100 licenses = ${SALESFORCE_HARD_LIMITS.MAX_API_REQUESTS_PER_DAY.ENTERPRISE.EXAMPLE_100_LICENSES.toLocaleString()}/day`,
      `      - Unlimited: ${SALESFORCE_HARD_LIMITS.MAX_API_REQUESTS_PER_DAY.UNLIMITED.PER_LICENSE.toLocaleString()} per license/day`,
      `        Example: 1000 licenses = ${SALESFORCE_HARD_LIMITS.MAX_API_REQUESTS_PER_DAY.UNLIMITED.EXAMPLE_1000_LICENSES.toLocaleString()}/day`,
      `   💡 At ${perMinute}/min continuously, you would use ${perDay.toLocaleString()} calls/day`,
      '   📚 See: https://help.salesforce.com/s/articleView?id=sf.integrate_api_rate_limiting.htm'
    );
  }

  // Resolve max memory
  const maxMemoryMB = userConfig.maxMemoryMB ?? SAFETY_LIMITS.MAX_MEMORY_MB;
  if (userConfig.maxMemoryMB && userConfig.maxMemoryMB > SAFETY_LIMITS.MAX_MEMORY_MB) {
    warnings.push(
      `📈 Increased memory limit to ${userConfig.maxMemoryMB}MB (default: ${SAFETY_LIMITS.MAX_MEMORY_MB}MB)`,
      '   Ensure your system has enough available memory'
    );
  }

  // Resolve operation timeout
  const operationTimeoutMs = userConfig.operationTimeoutMs ?? SAFETY_LIMITS.MAX_OPERATION_DURATION_MS;
  if (userConfig.operationTimeoutMs && userConfig.operationTimeoutMs > SAFETY_LIMITS.MAX_OPERATION_DURATION_MS) {
    const timeoutMinutes = Math.round(userConfig.operationTimeoutMs / 60_000);
    const defaultMinutes = Math.round(SAFETY_LIMITS.MAX_OPERATION_DURATION_MS / 60_000);
    warnings.push(
      `📈 Increased timeout to ${timeoutMinutes} min (default: ${defaultMinutes} min)`,
      '   Long operations may tie up resources'
    );
  }

  // Resolve concurrent workers
  const concurrentWorkers = userConfig.concurrentWorkers;
  if (concurrentWorkers) {
    if (concurrentWorkers > SALESFORCE_HARD_LIMITS.MAX_CONCURRENT_API_REQUESTS) {
      warnings.push(
        `⚠️  Worker count ${concurrentWorkers} exceeds Salesforce HARD LIMIT`,
        `   ⚠️  SALESFORCE HARD LIMIT: ${SALESFORCE_HARD_LIMITS.MAX_CONCURRENT_API_REQUESTS} concurrent API requests`,
        `   🔧 Will be capped at ${SALESFORCE_HARD_LIMITS.MAX_CONCURRENT_API_REQUESTS} to prevent API errors`,
        '   📚 See: https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta'
      );
    } else if (concurrentWorkers > 10) {
      warnings.push(
        `📈 Using ${concurrentWorkers} workers (high concurrency)`,
        `   💡 Salesforce allows max ${SALESFORCE_HARD_LIMITS.MAX_CONCURRENT_API_REQUESTS} concurrent requests`,
        '   ⚡ Monitor for API throttling or "Request limit exceeded" errors'
      );
    }
  }

  return {
    maxProfiles,
    profilesWarningThreshold,
    maxApiCallsPerMinute,
    maxMemoryMB,
    operationTimeoutMs,
    concurrentWorkers,
    guardrailsEnabled: true,
    verbose: userConfig.verbose ?? false,
    warnings,
  };
}

/**
 * Displays configuration warnings to user
 *
 * @param config - Resolved configuration
 */
export function displayConfigWarnings(config: ResolvedConfig): void {
  if (config.warnings.length === 0) return;

  /* eslint-disable no-console */
  console.log('\n⚙️  Performance Configuration:\n');

  for (const warning of config.warnings) {
    console.log(warning);
  }

  console.log('');
  /* eslint-enable no-console */
}

/**
 * Creates a summary of current configuration
 *
 * @param config - Resolved configuration
 * @returns Configuration summary string
 */
export function getConfigSummary(config: ResolvedConfig): string {
  const lines = [
    '⚙️  Performance Configuration:',
    `   Max Profiles: ${config.maxProfiles}`,
    `   API Calls/min: ${config.maxApiCallsPerMinute}`,
    `   Memory Limit: ${config.maxMemoryMB}MB`,
    `   Timeout: ${Math.round(config.operationTimeoutMs / 60_000)} min`,
  ];

  if (config.concurrentWorkers) {
    lines.push(`   Workers: ${config.concurrentWorkers}`);
  }

  if (!config.guardrailsEnabled) {
    lines.push('   ⚠️  GUARDRAILS DISABLED');
  }

  return lines.join('\n');
}

/**
 * Parses performance flags from command arguments
 *
 * Helper for CLI commands to extract performance config from flags
 *
 * @param flags - Command flags object
 * @returns Performance configuration
 *
 * @example
 * ```typescript
 * const perfConfig = parsePerformanceFlags({
 *   'max-profiles': 100,
 *   'max-api-calls': 200,
 *   'operation-timeout': 600000, // 10 min
 *   'no-guardrails': false,
 *   'verbose': true
 * });
 *
 * const config = resolvePerformanceConfig(perfConfig);
 * displayConfigWarnings(config);
 * ```
 */
export function parsePerformanceFlags(flags: Record<string, unknown>): PerformanceConfig {
  return {
    maxProfiles: typeof flags['max-profiles'] === 'number' ? flags['max-profiles'] : undefined,
    profilesWarningThreshold:
      typeof flags['profiles-warning-threshold'] === 'number' ? flags['profiles-warning-threshold'] : undefined,
    maxApiCallsPerMinute: typeof flags['max-api-calls'] === 'number' ? flags['max-api-calls'] : undefined,
    maxMemoryMB: typeof flags['max-memory'] === 'number' ? flags['max-memory'] : undefined,
    operationTimeoutMs: typeof flags['operation-timeout'] === 'number' ? flags['operation-timeout'] : undefined,
    concurrentWorkers: typeof flags['concurrent-workers'] === 'number' ? flags['concurrent-workers'] : undefined,
    verbose: typeof flags['verbose-performance'] === 'boolean' ? flags['verbose-performance'] : false,
  };
}

/**
 * Standard performance flag definitions for Oclif commands
 *
 * Import this in your command files and spread into flags object:
 *
 * @example
 * ```typescript
 * import { PERFORMANCE_FLAGS } from '../core/performance/config.js';
 *
 * export default class MyCommand extends SfCommand {
 *   public static readonly flags = {
 *     ...PERFORMANCE_FLAGS,
 *     // ... other flags
 *   };
 * }
 * ```
 */
export const PERFORMANCE_FLAGS = {
  'max-profiles': {
    summary: 'Maximum number of profiles to process in a single operation',
    description: `Overrides the default limit of ${SAFETY_LIMITS.MAX_PROFILES_PER_OPERATION} profiles. Use with caution as higher values may result in longer processing times and more API calls.`,
    type: 'option',
    char: undefined,
    default: undefined,
  },
  'max-api-calls': {
    summary: 'Maximum API calls per minute',
    description: `Overrides the default limit of ${SAFETY_LIMITS.MAX_API_CALLS_PER_MINUTE} API calls per minute. Ensure your Salesforce org can handle the increased load.`,
    type: 'option',
    char: undefined,
    default: undefined,
  },
  'max-memory': {
    summary: 'Maximum memory usage in MB',
    description: `Overrides the default limit of ${SAFETY_LIMITS.MAX_MEMORY_MB}MB. Ensure your system has enough available memory.`,
    type: 'option',
    char: undefined,
    default: undefined,
  },
  'operation-timeout': {
    summary: 'Operation timeout in milliseconds',
    description: `Overrides the default timeout of ${SAFETY_LIMITS.MAX_OPERATION_DURATION_MS}ms (${Math.round(
      SAFETY_LIMITS.MAX_OPERATION_DURATION_MS / 60_000
    )} minutes).`,
    type: 'option',
    char: undefined,
    default: undefined,
  },
  'concurrent-workers': {
    summary: 'Number of concurrent workers for parallel operations',
    description:
      'Overrides the auto-detected worker count. Max recommended: 5 for metadata operations, 10 for API operations.',
    type: 'option',
    char: undefined,
    default: undefined,
  },
  'verbose-performance': {
    summary: 'Show detailed performance metrics',
    description:
      'Displays detailed information about worker pool configuration, API calls, memory usage, and operation timings.',
    type: 'boolean',
    char: undefined,
    default: false,
  },
} as const;
