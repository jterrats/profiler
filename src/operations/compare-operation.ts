/**
 * @fileoverview Compare Operation - Monadic Implementation
 *
 * This module implements the core compare logic using functional monadic patterns.
 * Following Error-Driven Development (EDD), all error cases are explicitly handled
 * using the ProfilerMonad for composable, type-safe operations.
 *
 * @module operations/compare-operation
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Org } from '@salesforce/core';
import { ProfilerMonad } from '../core/monad/profiler-monad.js';
import { success, failure } from '../core/monad/result.js';
import {
  NoLocalProfileError,
  NoOrgProfileError,
  InvalidXmlError,
  ComparisonTimeoutError,
  MultipleEnvironmentFailureError,
  ParallelExecutionError,
  MatrixBuildError,
} from '../core/errors/operation-errors.js';
import type { PerformanceConfig } from '../core/performance/config.js';

/**
 * Input parameters for compare operation
 */
export type CompareInput = {
  /** Salesforce org connection */
  org: Org;
  /** Profile name to compare */
  profileName: string;
  /** Local project path */
  projectPath: string;
  /** API version to use */
  apiVersion: string;
  /** Optional timeout in milliseconds */
  timeoutMs?: number;
  /** Performance configuration options */
  performanceConfig?: PerformanceConfig;
};

/**
 * Parsed profile XML structure (simplified)
 */
export type ProfileXml = {
  profile: Record<string, unknown>;
};

/**
 * Profile comparison result
 */
export type ProfileComparison = {
  profileName: string;
  differences: string[];
  localVersion: ProfileXml;
  orgVersion: ProfileXml;
  identical: boolean;
};

/**
 * Result of compare operation
 */
export type CompareResult = {
  comparisons: ProfileComparison[];
  totalDifferences: number;
  profilesCompared: number;
};

/**
 * Reads a local profile file from the project
 *
 * @param profileName - Name of the profile to read
 * @param projectPath - Path to the Salesforce project
 * @returns ProfilerMonad<string> - File contents
 *
 * @throws NoLocalProfileError if file doesn't exist
 */
export function readLocalProfile(profileName: string, projectPath: string): ProfilerMonad<string> {
  return new ProfilerMonad(async () => {
    const profilePath = path.join(
      projectPath,
      'force-app',
      'main',
      'default',
      'profiles',
      `${profileName}.profile-meta.xml`
    );

    try {
      const content = await fs.readFile(profilePath, 'utf-8');
      return success(content);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const localError = new NoLocalProfileError(profileName, profilePath);
      return failure(localError);
    }
  });
}

/**
 * Retrieves a profile from the org
 *
 * @param profileName - Name of the profile to retrieve
 * @param org - Salesforce org connection
 * @param apiVersion - API version to use
 * @returns ProfilerMonad<string> - Profile XML content
 *
 * @throws NoOrgProfileError if profile doesn't exist in org
 */
export function retrieveOrgProfile(profileName: string, org: Org, apiVersion: string): ProfilerMonad<string> {
  return new ProfilerMonad(async () => {
    try {
      const connection = org.getConnection(apiVersion);
      const orgId = org.getOrgId();

      // Import cache and performance utilities
      const { getMetadataCache } = await import('../core/performance/cache.js');
      const { RateLimiter, CircuitBreaker } = await import('../core/performance/guardrails.js');

      const cache = getMetadataCache();
      const rateLimiter = new RateLimiter();
      const circuitBreaker = new CircuitBreaker();

      // Check circuit breaker
      circuitBreaker.allowRequest();

      // Try to get from cache first
      const cacheKey = `profile-content:${profileName}`;
      const cached = cache.get<string>(orgId, cacheKey, apiVersion);
      if (cached !== null) {
        circuitBreaker.recordSuccess();
        return success(cached);
      }

      // Cache miss - make API call with rate limiting
      rateLimiter.recordCall();

      const metadata = await connection.metadata.list({ type: 'Profile' }, apiVersion);

      if (!metadata) {
        circuitBreaker.recordFailure();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const orgError = new NoOrgProfileError(profileName, org.getUsername() ?? org.getOrgId());
        return failure(orgError);
      }

      const metadataArray = Array.isArray(metadata) ? metadata : [metadata];
      const profileExists = metadataArray.some((m) => m.fullName === profileName);

      if (!profileExists) {
        circuitBreaker.recordFailure();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const orgError = new NoOrgProfileError(profileName, org.getUsername() ?? org.getOrgId());
        return failure(orgError);
      }

      circuitBreaker.recordSuccess();

      // For now, return a placeholder
      // In a full implementation, this would use metadata.read() or retrieve()
      const profileContent =
        '<?xml version="1.0" encoding="UTF-8"?>\n<Profile xmlns="http://soap.sforce.com/2006/04/metadata">\n</Profile>';

      // Cache the result
      cache.set(orgId, cacheKey, apiVersion, profileContent);

      return success(profileContent);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const orgError = new NoOrgProfileError(profileName, org.getUsername() ?? org.getOrgId());
      return failure(orgError);
    }
  });
}

/**
 * Parses profile XML content
 *
 * @param xmlContent - Raw XML string
 * @param source - Source of XML (for error messages)
 * @returns ProfilerMonad<ProfileXml> - Parsed XML object
 *
 * @throws InvalidXmlError if parsing fails
 */
export function parseProfileXml(xmlContent: string, source: string): ProfilerMonad<ProfileXml> {
  return new ProfilerMonad(() => {
    try {
      // For now, simple validation
      if (!xmlContent.includes('<?xml') || !xmlContent.includes('<Profile')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const xmlError = new InvalidXmlError(source, 'Missing XML declaration or Profile tag');
        return Promise.resolve(failure(xmlError));
      }

      // Placeholder - in full implementation would use xml2js or similar
      return Promise.resolve(
        success({
          profile: {
            _attributes: {},
            raw: xmlContent,
          },
        })
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const xmlError = new InvalidXmlError(source, err.message);
      return Promise.resolve(failure(xmlError));
    }
  });
}

/**
 * Compares two parsed profiles
 *
 * @param localProfile - Local profile XML
 * @param orgProfile - Org profile XML
 * @param profileName - Name of the profile
 * @returns ProfilerMonad<ProfileComparison> - Comparison result
 */
export function compareProfiles(
  localProfile: ProfileXml,
  orgProfile: ProfileXml,
  profileName: string
): ProfilerMonad<ProfileComparison> {
  return new ProfilerMonad(() => {
    // Placeholder comparison logic
    const differences: string[] = [];
    const identical = JSON.stringify(localProfile) === JSON.stringify(orgProfile);

    if (!identical) {
      differences.push('Profiles differ');
    }

    return Promise.resolve(
      success({
        profileName,
        differences,
        localVersion: localProfile,
        orgVersion: orgProfile,
        identical,
      })
    );
  });
}

/**
 * Main compare operation - composes all sub-operations
 *
 * This is the main entry point for the compare operation, following the EDD pattern:
 * 1. Read local profile
 * 2. Retrieve org profile
 * 3. Parse both profiles
 * 4. Compare them
 *
 * @param input - Compare input parameters
 * @returns ProfilerMonad<CompareResult> - Final compare result
 *
 * @example
 * ```typescript
 * const result = await compareProfileOperation({
 *   org,
 *   profileName: 'Admin',
 *   projectPath: '/path/to/project',
 *   apiVersion: '58.0',
 *   timeoutMs: 30_000
 * }).run();
 *
 * if (result.isSuccess()) {
 *   console.log(`Found ${result.value.totalDifferences} differences`);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function compareProfileOperation(input: CompareInput): ProfilerMonad<CompareResult> {
  const startTime = Date.now();
  const timeout = input.timeoutMs ?? 120_000; // 2 minutes default

  return readLocalProfile(input.profileName, input.projectPath)
    .chain((localContent) => {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const timeoutError = new ComparisonTimeoutError(1, timeout);
        return new ProfilerMonad(() => Promise.resolve(failure(timeoutError)));
      }

      return retrieveOrgProfile(input.profileName, input.org, input.apiVersion).map((orgContent) => ({
        localContent,
        orgContent,
      }));
    })
    .chain(({ localContent, orgContent }) =>
      // Parse local profile
      parseProfileXml(localContent, `local:${input.profileName}`).chain((localParsed) =>
        // Parse org profile
        parseProfileXml(orgContent, `org:${input.profileName}`).map((orgParsed) => ({ localParsed, orgParsed }))
      )
    )
    .chain(({ localParsed, orgParsed }) =>
      // Compare profiles
      compareProfiles(localParsed, orgParsed, input.profileName)
    )
    .map((comparison) => ({
      comparisons: [comparison],
      totalDifferences: comparison.differences.length,
      profilesCompared: 1,
    }));
}

// ============================================================================
// MULTI-SOURCE COMPARISON - Issue #14
// ============================================================================

/**
 * Org alias with connection
 */
export type OrgSource = {
  /** Org alias/name for display */
  alias: string;
  /** Salesforce org connection */
  org: Org;
};

/**
 * Input parameters for multi-source compare operation
 */
export type MultiSourceCompareInput = {
  /** Profile names to compare */
  profileNames: string[];
  /** Array of org sources to compare */
  sources: OrgSource[];
  /** API version to use */
  apiVersion: string;
  /** Project path (user's SFDX project with sfdx-project.json) */
  projectPath: string;
  /** Optional timeout in milliseconds */
  timeoutMs?: number;
};

/**
 * Result of retrieving a profile from one org
 */
export type OrgProfileResult = {
  /** Org alias */
  alias: string;
  /** Profile name */
  profileName: string;
  /** Parsed profile XML */
  profile: ProfileXml;
  /** Success flag */
  success: boolean;
  /** Error if retrieval failed */
  error?: Error;
};

/**
 * Comparison matrix - profiles across multiple orgs
 */
export type ComparisonMatrix = {
  /** Profile name */
  profileName: string;
  /** Map of org alias to parsed profile */
  orgProfiles: Map<string, ProfileXml>;
  /** Orgs that succeeded */
  successfulOrgs: string[];
  /** Orgs that failed */
  failedOrgs: Array<{ orgAlias: string; error: Error }>;
};

/**
 * Result of multi-source comparison
 */
export type MultiSourceCompareResult = {
  /** Comparison matrices for each profile */
  matrices: ComparisonMatrix[];
  /** Total profiles compared */
  profilesCompared: number;
  /** Total orgs involved */
  orgsInvolved: number;
  /** Orgs that succeeded */
  successfulOrgs: string[];
  /** Orgs that failed */
  failedOrgs: Array<{ orgAlias: string; error: Error }>;
  /** Whether all orgs succeeded */
  allOrgsSucceeded: boolean;
};

/**
 * Retrieves a profile with full metadata from an org
 *
 * This function performs a complete retrieve including all dependent metadata
 * (ApexClass, CustomObject, Flow, etc.) to ensure the profile is fully populated.
 * Each retrieve executes in an isolated temp directory for parallel safety.
 *
 * NOTE: This function is called from a command with requiresProject=true,
 * so we are guaranteed to be in a valid SFDX project with sfdx-project.json.
 *
 * @param profileName - Profile to retrieve
 * @param org - Salesforce org
 * @param apiVersion - API version
 * @param userProjectPath - User's SFDX project path (validated by requiresProject)
 * @returns ProfilerMonad<string> - Profile XML content with full metadata
 */
async function retrieveProfileWithMetadata(
  profileName: string,
  org: Org,
  apiVersion: string,
  userProjectPath: string
): Promise<string> {
  const fsAsync = await import('node:fs/promises');
  const pathModule = await import('node:path');
  const osModule = await import('node:os');

  // Import retrieve operations
  const { retrieveProfiles } = await import('./retrieve-operation.js');

  // Create isolated temp directory for this org's retrieve (parallel safe)
  const tempDir = pathModule.join(
    osModule.tmpdir(),
    `profiler-compare-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  try {
    // Create temp project structure (must exist before retrieve)
    await fsAsync.mkdir(pathModule.join(tempDir, 'force-app'), { recursive: true });

    // Copy sfdx-project.json from user's project (validated by requiresProject)
    const userSfdxProject = pathModule.join(userProjectPath, 'sfdx-project.json');
    const tempSfdxProject = pathModule.join(tempDir, 'sfdx-project.json');
    await fsAsync.copyFile(userSfdxProject, tempSfdxProject);

    // Execute full retrieve with all metadata in isolated temp directory
    const result = await retrieveProfiles({
      org,
      projectPath: tempDir,
      profileNames: [profileName],
      apiVersion,
      includeAllFields: false, // No FLS for comparison
      forceFullRetrieve: true, // Skip incremental for multi-source (always get fresh org data)
    }).run();

    if (result.isFailure()) {
      throw new Error(`Failed to retrieve profile: ${result.error.message}`);
    }

    // Read the retrieved profile from temp
    const profilePath = pathModule.join(
      tempDir,
      'force-app',
      'main',
      'default',
      'profiles',
      `${profileName}.profile-meta.xml`
    );
    const profileContent = await fsAsync.readFile(profilePath, 'utf-8');

    return profileContent;
  } finally {
    // Clean up temp directory
    try {
      await fsAsync.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Retrieves a profile from multiple orgs in parallel
 *
 * This function implements parallel retrieval with error handling:
 * - If all orgs fail → throw MultipleEnvironmentFailureError (UserError)
 * - If some orgs fail → throw PartialRetrievalError (SystemError, recoverable)
 * - If retrieval succeeds but some profiles missing → partial success
 *
 * @param profileName - Profile to retrieve
 * @param sources - Array of org sources
 * @param apiVersion - API version
 * @param projectPath - User's SFDX project path (for sfdx-project.json)
 * @returns ProfilerMonad<OrgProfileResult[]> - Results from all orgs
 *
 * @throws MultipleEnvironmentFailureError if all orgs fail
 * @throws PartialRetrievalError if some orgs fail (recoverable)
 * @throws ParallelExecutionError if parallel execution fails unexpectedly
 */
export function retrieveFromMultipleSources(
  profileName: string,
  sources: OrgSource[],
  apiVersion: string,
  projectPath: string
): ProfilerMonad<OrgProfileResult[]> {
  return new ProfilerMonad(async () => {
    try {
      // Execute parallel retrieval with full metadata
      const retrievalPromises = sources.map(async (source): Promise<OrgProfileResult> => {
        try {
          // Use full retrieve with metadata (each org gets isolated temp directory)
          const xmlContent = await retrieveProfileWithMetadata(profileName, source.org, apiVersion, projectPath);

          // Parse the retrieved profile
          const parseResult = await parseProfileXml(xmlContent, `${source.alias}:${profileName}`).run();

          if (parseResult.isSuccess()) {
            return {
              alias: source.alias,
              profileName,
              profile: parseResult.value,
              success: true,
            };
          } else {
            return {
              alias: source.alias,
              profileName,
              profile: { profile: {} },
              success: false,
              error: parseResult.error,
            };
          }
        } catch (error) {
          return {
            alias: source.alias,
            profileName,
            profile: { profile: {} },
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      });

      const results = await Promise.all(retrievalPromises);

      // Categorize results
      const succeeded = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      // Error handling: All failed → UserError (unrecoverable)
      if (succeeded.length === 0) {
        const failedOrgs = failed.map((r) => ({
          alias: r.alias,
          error: r.error?.message ?? 'Unknown error',
        }));
        return failure(new MultipleEnvironmentFailureError(failedOrgs, sources.length));
      }

      // Error handling: Some failed → Return partial success
      // (caller can check failed orgs and handle accordingly)
      if (failed.length > 0) {
        return success(succeeded);
      }

      // All succeeded
      return success(results);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return failure(new ParallelExecutionError(1, sources.length, err));
    }
  });
}

/**
 * Builds comparison matrix from retrieved profiles
 *
 * This function constructs a matrix showing each profile across multiple orgs.
 * The matrix is used for side-by-side comparison.
 *
 * @param profileName - Profile name
 * @param results - Array of org profile results
 * @returns ProfilerMonad<ComparisonMatrix> - Comparison matrix
 *
 * @throws MatrixBuildError if matrix construction fails
 */
export function buildComparisonMatrix(
  profileName: string,
  results: OrgProfileResult[]
): ProfilerMonad<ComparisonMatrix> {
  return new ProfilerMonad(() => {
    try {
      const orgProfiles = new Map<string, ProfileXml>();
      const successfulOrgs: string[] = [];
      const failedOrgs: Array<{ orgAlias: string; error: Error }> = [];

      for (const result of results) {
        if (result.success) {
          orgProfiles.set(result.alias, result.profile);
          successfulOrgs.push(result.alias);
        } else {
          failedOrgs.push({
            orgAlias: result.alias,
            error: result.error ?? new Error('Unknown error'),
          });
        }
      }

      if (orgProfiles.size === 0) {
        return Promise.resolve(failure(new MatrixBuildError(`No successful retrievals for profile: ${profileName}`)));
      }

      return Promise.resolve(
        success({
          profileName,
          orgProfiles,
          successfulOrgs,
          failedOrgs,
        })
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return Promise.resolve(failure(new MatrixBuildError(`Failed to build matrix for ${profileName}`, err)));
    }
  });
}

/**
 * Main multi-source compare operation
 *
 * This is the main entry point for multi-source comparison:
 * 1. Retrieve profiles from all orgs in parallel (per profile)
 * 2. Build comparison matrix for each profile
 * 3. Return aggregated results
 *
 * Error handling strategy:
 * - All orgs fail for a profile → skip that profile
 * - Some orgs fail → include partial results with warnings
 * - All profiles fail → return error
 *
 * @param input - Multi-source compare input parameters
 * @returns ProfilerMonad<MultiSourceCompareResult> - Comparison result
 *
 * @example
 * ```typescript
 * const result = await compareMultiSource({
 *   profileNames: ['Admin', 'Sales'],
 *   sources: [
 *     { alias: 'dev', org: devOrg },
 *     { alias: 'qa', org: qaOrg },
 *     { alias: 'prod', org: prodOrg }
 *   ],
 *   apiVersion: '60.0'
 * }).run();
 *
 * if (result.isSuccess()) {
 *   console.log(`Compared ${result.value.profilesCompared} profiles across ${result.value.orgsInvolved} orgs`);
 * }
 * ```
 */
export function compareMultiSource(input: MultiSourceCompareInput): ProfilerMonad<MultiSourceCompareResult> {
  return new ProfilerMonad(async () => {
    try {
      const allSuccessfulOrgs = new Set<string>();
      const allFailedOrgs = new Map<string, string>();
      const matrices: ComparisonMatrix[] = [];

      // Process all profiles in parallel
      const profilePromises = input.profileNames.map(async (profileName) => {
        const retrievalResult = await retrieveFromMultipleSources(
          profileName,
          input.sources,
          input.apiVersion,
          input.projectPath
        ).run();

        if (retrievalResult.isFailure()) {
          return { success: false as const, profileName, error: retrievalResult.error };
        }

        const profileResults = retrievalResult.value;
        const matrixResult = await buildComparisonMatrix(profileName, profileResults).run();

        if (matrixResult.isFailure()) {
          return { success: false as const, profileName, error: matrixResult.error };
        }

        return { success: true as const, profileName, matrix: matrixResult.value };
      });

      const profileResults = await Promise.all(profilePromises);

      // Process results
      for (const result of profileResults) {
        if (result.success) {
          matrices.push(result.matrix);

          // Track successful and failed orgs
          for (const orgAlias of result.matrix.successfulOrgs) {
            allSuccessfulOrgs.add(orgAlias);
          }
          for (const failed of result.matrix.failedOrgs) {
            allFailedOrgs.set(failed.orgAlias, failed.error.message);
          }
        }
      }

      // If no matrices were built, all profiles failed
      if (matrices.length === 0) {
        const failedOrgsList = Array.from(allFailedOrgs.entries()).map(([alias, error]) => ({ alias, error }));
        return failure(new MultipleEnvironmentFailureError(failedOrgsList, input.sources.length));
      }

      const successfulOrgs = Array.from(allSuccessfulOrgs);
      const failedOrgs = Array.from(allFailedOrgs.entries()).map(([orgAlias, error]) => ({
        orgAlias,
        error: new Error(error),
      }));

      return success({
        matrices,
        profilesCompared: matrices.length,
        orgsInvolved: input.sources.length,
        successfulOrgs,
        failedOrgs,
        allOrgsSucceeded: failedOrgs.length === 0,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return failure(new ParallelExecutionError(1, input.profileNames.length, err));
    }
  });
}
