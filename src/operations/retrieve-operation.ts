/**
 * @fileoverview Retrieve Operation - Monadic Implementation
 *
 * This module implements the core retrieve logic using functional monadic patterns.
 * Following Error-Driven Development (EDD), all error cases are explicitly handled
 * using the ProfilerMonad for composable, type-safe operations.
 *
 * @module operations/retrieve-operation
 */

import type { Connection, Org } from '@salesforce/core';
import { ProfilerMonad, success, failure, liftAsync } from '../core/monad/index.js';
import {
  ProfileNotFoundError,
} from '../core/errors/operation-errors.js';
import type { PerformanceConfig } from '../core/performance/config.js';

/**
 * Input parameters for retrieve operation
 */
export type RetrieveInput = {
  /** Salesforce org connection */
  org: Org;
  /** Optional array of profile names to retrieve */
  profileNames?: string[];
  /** API version to use */
  apiVersion: string;
  /** Whether to exclude managed package metadata */
  excludeManaged?: boolean;
  /** Path to Salesforce project */
  projectPath: string;
  /** Whether to include field-level security (FLS) */
  includeAllFields?: boolean;
  /** Whether to build package.xml from local project files instead of org metadata */
  fromProject?: boolean;
  /** Performance configuration options */
  performanceConfig?: PerformanceConfig;
};

/**
 * Metadata type with members
 */
export type MetadataTypeMembers = {
  type: string;
  members: string[];
};

/**
 * Result of listing metadata from org
 */
export type MetadataListResult = {
  metadataTypes: MetadataTypeMembers[];
  totalMembers: number;
};

/**
 * Result of package.xml generation
 */
export type PackageXmlResult = {
  content: string;
  metadataTypes: string[];
  totalMembers: number;
};

/**
 * Final result of retrieve operation
 */
export type RetrieveResult = {
  profilesRetrieved: string[];
  metadataTypes: string[];
  totalComponents: number;
};

/**
 * Validates profile names format
 *
 * @param profileNames - Array of profile names to validate
 * @returns ProfilerMonad<string[]> - Validated profile names
 *
 * @remarks For now, this just filters empty names. Detailed validation
 * can be added in a future step.
 */
export function validateProfileNames(profileNames?: string[]): ProfilerMonad<string[] | undefined> {
  return new ProfilerMonad(() => {
    if (!profileNames || profileNames.length === 0) {
      return Promise.resolve(success<string[] | undefined>(undefined));
    }

    // Filter out empty names
    const validNames = profileNames.filter((name) => name && name.trim().length > 0);

    return Promise.resolve(success<string[] | undefined>(validNames.length > 0 ? validNames : undefined));
  });
}

/**
 * Lists all metadata of a specific type from the org with caching
 *
 * @param connection - Salesforce connection
 * @param orgId - Org ID for cache key
 * @param metadataType - Type of metadata to list
 * @param apiVersion - API version to use
 * @param excludeManaged - Whether to exclude managed package metadata
 * @returns ProfilerMonad<string[]> - Array of metadata member names
 *
 * @throws MetadataListError if listing fails
 */
export function listMetadataType(
  connection: Connection,
  orgId: string,
  metadataType: string,
  apiVersion: string,
  excludeManaged: boolean
): ProfilerMonad<string[]> {
  return new ProfilerMonad(async () => {
    try {
      // Import cache dynamically
      const { getMetadataCache } = await import('../core/performance/cache.js');
      const cache = getMetadataCache();

      // Try cache first
      const cached = cache.get<string[]>(orgId, `${metadataType}:excludeManaged=${excludeManaged}`, apiVersion);

      if (cached !== null) {
        return success(cached);
      }

      // Cache miss - make API call
      const metadata = await connection.metadata.list({ type: metadataType }, apiVersion);

      if (!metadata) {
        const emptyResult: string[] = [];
        cache.set(orgId, `${metadataType}:excludeManaged=${excludeManaged}`, apiVersion, emptyResult);
        return success(emptyResult);
      }

      const metadataArray = Array.isArray(metadata) ? metadata : [metadata];
      let members = metadataArray.map((m) => m.fullName).sort();

      // Filter out managed package metadata if requested
      if (excludeManaged) {
        members = members.filter((member) => !member.includes('__') || member.endsWith('__c'));
      }

      // Store in cache
      cache.set(orgId, `${metadataType}:excludeManaged=${excludeManaged}`, apiVersion, members);

      return success(members);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const listError = new Error(`Failed to list metadata type '${metadataType}': ${err.message}`);
      return failure(listError);
    }
  });
}

/**
 * Lists all metadata types from the org in parallel
 *
 * @param input - Retrieve input parameters
 * @param metadataTypes - Array of metadata types to list
 * @returns ProfilerMonad<MetadataListResult> - Result with all metadata
 *
 * @throws MetadataListError if listing fails for any type
 */
export function listAllMetadata(input: RetrieveInput, metadataTypes: string[]): ProfilerMonad<MetadataListResult> {
  return new ProfilerMonad(async () => {
    // Import performance utilities
    const { createWorkerPool, PerformanceTracker } = await import('../core/performance/worker-pool.js');
    const { validateProfileCount, displayWarnings, canContinueOperation, RateLimiter, CircuitBreaker } = await import('../core/performance/guardrails.js');

    const connection = input.org.getConnection(input.apiVersion);
    const excludeManaged = input.excludeManaged ?? false;
    const orgId = input.org.getOrgId();

    // Validate profile count first
    if (input.profileNames && input.profileNames.length > 0) {
      const profileWarnings = validateProfileCount(input.profileNames.length);
      if (profileWarnings.length > 0) {
        displayWarnings(profileWarnings);

        if (!canContinueOperation(profileWarnings)) {
          return failure(new Error(`Too many profiles requested: ${input.profileNames.length}. Maximum allowed: 50`));
        }
      }
    }

    // Create worker pool for controlled concurrency
    const pool = createWorkerPool({
      operationType: 'metadata',
      verbose: false,
    });

    const tracker = new PerformanceTracker();
    const rateLimiter = new RateLimiter();
    const circuitBreaker = new CircuitBreaker();

    // Create tasks with guardrails
    const tasks = metadataTypes.map((type) => async (): Promise<MetadataTypeMembers | null> => {
      try {
        // Check circuit breaker
        circuitBreaker.allowRequest();

        // Check rate limit
        rateLimiter.recordCall();
        tracker.recordApiCall();

        const monad = listMetadataType(connection, orgId, type, input.apiVersion, excludeManaged);
        const result = await monad.run();

        if (result.isFailure()) {
          circuitBreaker.recordFailure();
          return null;
        }

        circuitBreaker.recordSuccess();
        const members = result.value;

        // Filter profiles if profile names are specified
        if (type === 'Profile' && input.profileNames && input.profileNames.length > 0) {
          const filteredMembers = members.filter((member) => input.profileNames!.includes(member));

          if (filteredMembers.length === 0) {
            return null;
          }

          return {
            type,
            members: filteredMembers,
          };
        }

        return members.length > 0 ? { type, members } : null;
      } catch (error) {
        circuitBreaker.recordFailure();
        throw error;
      }
    });

    // Execute with controlled concurrency
    const results = await pool.executeAll(tasks);
    const metadataTypeMembers = results.filter((r): r is MetadataTypeMembers => r !== null);

    // Check if we have any Profile metadata when profiles were requested
    if (input.profileNames && input.profileNames.length > 0) {
      const profileMetadata = metadataTypeMembers.find((m) => m.type === 'Profile');
      if (!profileMetadata) {
        const profileError = new ProfileNotFoundError(input.profileNames.join(', '));
        return failure(profileError);
      }
    }

    const totalMembers = metadataTypeMembers.reduce((sum, m) => sum + m.members.length, 0);

    return success({
      metadataTypes: metadataTypeMembers,
      totalMembers,
    });
  });
}

/**
 * Generates package.xml content from metadata list
 *
 * @param metadataList - List of metadata with members
 * @param apiVersion - API version for package.xml
 * @returns ProfilerMonad<PackageXmlResult> - Generated package.xml content
 *
 * @throws PackageXmlGenerationError if generation fails
 * @throws EmptyRetrieveError if no metadata to retrieve
 */
export function generatePackageXml(
  metadataList: MetadataListResult,
  apiVersion: string
): ProfilerMonad<PackageXmlResult> {
  return new ProfilerMonad(() => {
    try {
      if (metadataList.metadataTypes.length === 0) {
        const emptyError = new Error('No metadata found to retrieve');
        return Promise.resolve(failure(emptyError));
      }

      let packageXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      packageXml += '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';

      for (const typeMembers of metadataList.metadataTypes) {
        packageXml += '  <types>\n';
        for (const member of typeMembers.members) {
          packageXml += `    <members>${member}</members>\n`;
        }
        packageXml += `    <name>${typeMembers.type}</name>\n`;
        packageXml += '  </types>\n';
      }

      packageXml += `  <version>${apiVersion}</version>\n`;
      packageXml += '</Package>\n';

      return Promise.resolve(
        success({
          content: packageXml,
          metadataTypes: metadataList.metadataTypes.map((m) => m.type),
          totalMembers: metadataList.totalMembers,
        })
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const pkgError = new Error(`Failed to generate package.xml: ${err.message}`);
      return Promise.resolve(failure(pkgError));
    }
  });
}

/**
 * Main retrieve operation - composes all sub-operations
 *
 * This is the main entry point for the retrieve operation, following the EDD pattern:
 * 1. Validate inputs
 * 2. List metadata from org
 * 3. Generate package.xml
 * 4. Retrieve metadata (placeholder for now)
 *
 * @param input - Retrieve input parameters
 * @returns ProfilerMonad<RetrieveResult> - Final retrieve result
 *
 * @example
 * ```typescript
 * const result = await retrieveProfiles({
 *   org,
 *   profileNames: ['Admin', 'Standard User'],
 *   apiVersion: '58.0',
 *   excludeManaged: true
 * }).run();
 *
 * if (result.isSuccess()) {
 *   console.log(`Retrieved ${result.value.totalComponents} components`);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
/**
 * Builds package.xml from local project files instead of org metadata
 *
 * @param projectPath - Path to project root
 * @param metadataTypes - Array of metadata types to include
 * @param apiVersion - API version
 * @param profileNames - Optional profile name filter
 * @param excludeManaged - Whether to exclude managed packages
 * @returns ProfilerMonad<MetadataListResult>
 */
export function buildMetadataFromProject(
  projectPath: string,
  metadataTypes: string[],
  apiVersion: string,
  profileNames?: string[],
  excludeManaged = false
): ProfilerMonad<MetadataListResult> {
  return new ProfilerMonad(async () => {
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const metadataTypeMap: Record<string, { folder: string; extension: string }> = {
        ApexClass: { folder: 'classes', extension: '.cls' },
        ApexPage: { folder: 'pages', extension: '.page' },
        ConnectedApp: { folder: 'connectedApps', extension: '.connectedApp-meta.xml' },
        CustomApplication: { folder: 'applications', extension: '.app-meta.xml' },
        CustomObject: { folder: 'objects', extension: '' },
        CustomPermission: { folder: 'customPermissions', extension: '.customPermission-meta.xml' },
        CustomTab: { folder: 'tabs', extension: '.tab-meta.xml' },
        Flow: { folder: 'flows', extension: '.flow-meta.xml' },
        Layout: { folder: 'layouts', extension: '.layout-meta.xml' },
        Profile: { folder: 'profiles', extension: '.profile-meta.xml' },
      };

      const metadataTypeMembers: MetadataTypeMembers[] = [];
      let totalMembers = 0;

      // Process metadata types in parallel
      const results = await Promise.all(
        metadataTypes.map(async (metadataType) => {
          const config = metadataTypeMap[metadataType];
          if (!config) return null;

          const metadataDir = path.join(projectPath, 'force-app', 'main', 'default', config.folder);

          try {
            const files = await fs.readdir(metadataDir);
            let members: string[] = [];

            if (metadataType === 'CustomObject') {
              // For objects, check which entries are directories
              const statResults = await Promise.all(
                files.map(async (file) => ({
                  file,
                  isDir: (await fs.stat(path.join(metadataDir, file))).isDirectory(),
                }))
              );
              members = statResults.filter((r) => r.isDir).map((r) => r.file);
            } else if (config.extension) {
              // For other types, filter files by extension
              members = files
                .filter((file) => file.endsWith(config.extension))
                .map((file) => file.replace(config.extension, ''));
            }

            // Filter managed packages
            if (excludeManaged) {
              members = members.filter((member) => !member.includes('__') || member.endsWith('__c'));
            }

            // Filter profiles if specified
            if (metadataType === 'Profile' && profileNames && profileNames.length > 0) {
              members = members.filter((member) => profileNames.includes(member));
              if (members.length === 0) {
                // Return special error marker
                return { error: profileNames.join(', '), type: '', members: [] };
              }
            }

            if (members.length > 0) {
              return {
                type: metadataType,
                members: members.sort(),
              };
            }
            return null;
          } catch {
            // Directory doesn't exist - skip
            return null;
          }
        })
      );

      // Check for profile not found errors
      const errorResult = results.find((r) => r && 'error' in r && r.error);
      if (errorResult && 'error' in errorResult && errorResult.error) {
        return failure(new ProfileNotFoundError(errorResult.error));
      }

      // Collect successful results
      for (const result of results) {
        if (result?.type && result?.members) {
          metadataTypeMembers.push({ type: result.type, members: result.members });
          totalMembers += result.members.length;
        }
      }

      return success({
        metadataTypes: metadataTypeMembers,
        totalMembers,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return failure(err);
    }
  });
}

/**
 * Executes sf project retrieve command with package.xml
 *
 * @param org - Salesforce org
 * @param packageXmlPath - Path to package.xml file
 * @param projectPath - Path to project root
 * @returns ProfilerMonad<void>
 */
export function executeRetrieve(org: Org, packageXmlPath: string, projectPath: string): ProfilerMonad<void> {
  return new ProfilerMonad(async () => {
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      const username = org.getUsername() ?? org.getOrgId();
      const retrieveCmd = `sf project retrieve start --manifest "${packageXmlPath}" --target-org ${username}`;

      await execAsync(retrieveCmd, {
        cwd: projectPath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return success(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return failure(new Error(`Retrieve failed: ${err.message}`));
    }
  });
}

/**
 * Removes field-level security from profile XML
 *
 * @param profileContent - Profile XML content
 * @returns ProfilerMonad<string> - Profile without FLS
 */
export function removeFieldLevelSecurity(profileContent: string): ProfilerMonad<string> {
  return new ProfilerMonad(() => {
    const withoutFls = profileContent.replace(/<fieldPermissions>[\s\S]*?<\/fieldPermissions>\n?/g, '');
    return Promise.resolve(success(withoutFls));
  });
}

/**
 * Copies profiles from project to final destination
 *
 * @param projectPath - Path to project root
 * @param includeAllFields - Whether to keep field permissions
 * @returns ProfilerMonad<number> - Number of profiles copied
 */
export function copyProfiles(projectPath: string, includeAllFields: boolean): ProfilerMonad<number> {
  return new ProfilerMonad(async () => {
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const profilesDir = path.join(projectPath, 'force-app', 'main', 'default', 'profiles');

      // Check if profiles directory exists
      try {
        await fs.access(profilesDir);
      } catch {
        return success(0);
      }

      const files = await fs.readdir(profilesDir);
      const profileFiles = files.filter((f) => f.endsWith('.profile-meta.xml'));

      // If not including all fields, remove FLS
      if (!includeAllFields) {
        await Promise.all(
          profileFiles.map(async (file) => {
            const filePath = path.join(profilesDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const flsResult = await removeFieldLevelSecurity(content).run();

            if (flsResult.isSuccess()) {
              await fs.writeFile(filePath, flsResult.value);
            }
          })
        );
      }

      return success(profileFiles.length);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return failure(err);
    }
  });
}

export function retrieveProfiles(input: RetrieveInput): ProfilerMonad<RetrieveResult> {
  const metadataTypes = [
    'ApexClass',
    'ApexPage',
    'ConnectedApp',
    'CustomApplication',
    'CustomObject',
    'CustomPermission',
    'CustomTab',
    'Flow',
    'Layout',
    'Profile',
  ];

  // Choose metadata source: project files or org API
  const metadataSource = input.fromProject
    ? buildMetadataFromProject(input.projectPath, metadataTypes, input.apiVersion, input.profileNames, input.excludeManaged)
    : listAllMetadata(input, metadataTypes);

  return validateProfileNames(input.profileNames)
    .chain(() => metadataSource)
    .chain((metadataList) => generatePackageXml(metadataList, input.apiVersion))
    .chain((packageXmlResult: PackageXmlResult) =>
      liftAsync(async () => {
        // Write package.xml to temp directory
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const os = await import('node:os');

        const tempDir = path.join(os.tmpdir(), `profiler-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        const packageXmlPath = path.join(tempDir, 'package.xml');
        await fs.writeFile(packageXmlPath, packageXmlResult.content);

        return { tempDir, packageXmlPath, packageXmlResult };
      })
        .chain(
          (context: { tempDir: string; packageXmlPath: string; packageXmlResult: PackageXmlResult }) =>
            executeRetrieve(input.org, context.packageXmlPath, input.projectPath)
              .chain(() =>
                liftAsync(async () => {
                  const fs = await import('node:fs/promises');
                  // Clean up temp dir
                  await fs.rm(context.tempDir, { recursive: true, force: true });
                  return undefined;
                })
              )
              .chain(() =>
                copyProfiles(input.projectPath, input.includeAllFields ?? false).map(
                  (): RetrieveResult => ({
                    profilesRetrieved: input.profileNames ?? [],
                    metadataTypes: context.packageXmlResult.metadataTypes,
                    totalComponents: context.packageXmlResult.totalMembers,
                  })
                )
              )
        )
    );
}
