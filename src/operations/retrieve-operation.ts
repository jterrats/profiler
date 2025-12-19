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
import { ProfileNotFoundError } from '../core/errors/operation-errors.js';
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
  /** Force full retrieve, bypassing incremental optimization */
  forceFullRetrieve?: boolean;
  /** Dry run mode - show what would be retrieved without executing */
  dryRun?: boolean;
  /** Bypass metadata cache and fetch fresh data */
  noCache?: boolean;
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
  profileCount?: number;
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
  excludeManaged: boolean,
  noCache: boolean = false
): ProfilerMonad<string[]> {
  return new ProfilerMonad(async () => {
    try {
      // Try cache first (unless --no-cache flag is set)
      if (!noCache) {
        // Import cache dynamically
        const { getFilesystemMetadataCache } = await import('../core/cache/index.js');
        const cache = getFilesystemMetadataCache();

        // Try filesystem cache first
        const cached = await cache.get<string[]>(orgId, `${metadataType}:excludeManaged=${excludeManaged}`, apiVersion);

        if (cached !== null) {
          return success(cached);
        }
      }

      // Cache miss - make API call
      const metadata = await connection.metadata.list({ type: metadataType }, apiVersion);

      if (!metadata) {
        const emptyResult: string[] = [];
        // Store in cache (unless --no-cache flag is set)
        if (!noCache) {
          const { getFilesystemMetadataCache } = await import('../core/cache/index.js');
          const cache = getFilesystemMetadataCache();
          await cache.set(orgId, `${metadataType}:excludeManaged=${excludeManaged}`, apiVersion, emptyResult);
        }
        return success(emptyResult);
      }

      const metadataArray = Array.isArray(metadata) ? metadata : [metadata];
      let members = metadataArray.map((m) => m.fullName).sort();

      // Filter out managed package metadata if requested
      if (excludeManaged) {
        members = members.filter((member) => !member.includes('__') || member.endsWith('__c'));
      }

      // Store in cache (unless --no-cache flag is set)
      if (!noCache) {
        const { getFilesystemMetadataCache } = await import('../core/cache/index.js');
        const cache = getFilesystemMetadataCache();
        await cache.set(orgId, `${metadataType}:excludeManaged=${excludeManaged}`, apiVersion, members);
      }

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
    const { validateProfileCount, displayWarnings, canContinueOperation, RateLimiter, CircuitBreaker } = await import(
      '../core/performance/guardrails.js'
    );

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

        const monad = listMetadataType(
          connection,
          orgId,
          type,
          input.apiVersion,
          excludeManaged,
          input.noCache ?? false
        );
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
 * Read local metadata files from project for incremental comparison
 * NOTE: Incremental retrieve feature - reads local force-app to determine what has changed
 *
 * @param projectPath - Path to Salesforce project
 * @param metadataTypes - Types to scan for
 * @returns ProfilerMonad<MetadataListResult> - Falls back to empty list on error (triggers full retrieve)
 */
export function readLocalMetadata(projectPath: string, metadataTypes: string[]): ProfilerMonad<MetadataListResult> {
  return new ProfilerMonad(async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { LocalMetadataReadError } = await import('../core/errors/operation-errors.js');

    try {
      const resultTypes: MetadataTypeMembers[] = [];
      const forceAppPath = path.join(projectPath, 'force-app', 'main', 'default');

      // Type to directory mapping
      const typeToDir: Record<string, string> = {
        Profile: 'profiles',
        ApexClass: 'classes',
        CustomObject: 'objects',
        Flow: 'flows',
        Layout: 'layouts',
        ApexPage: 'pages',
        ConnectedApp: 'connectedApps',
        CustomApplication: 'applications',
        CustomPermission: 'customPermissions',
        CustomTab: 'tabs',
      };

      // Sequential await is intentional - we want to skip missing directories individually
      // eslint-disable-next-line no-await-in-loop
      for (const metadataType of metadataTypes) {
        const dirName = typeToDir[metadataType];
        if (!dirName) continue;

        const metadataDir = path.join(forceAppPath, dirName);

        try {
          // eslint-disable-next-line no-await-in-loop
          const stats = await fs.stat(metadataDir);
          if (!stats.isDirectory()) continue;

          // eslint-disable-next-line no-await-in-loop
          const files = await fs.readdir(metadataDir);
          const members: string[] = [];

          // Extract metadata names from files
          for (const file of files) {
            if (metadataType === 'Profile' && file.endsWith('.profile-meta.xml')) {
              members.push(file.replace('.profile-meta.xml', ''));
            } else if (metadataType === 'CustomObject' && file.endsWith('.object-meta.xml')) {
              members.push(file.replace('.object-meta.xml', ''));
            } else if (metadataType === 'ApexClass' && file.endsWith('.cls-meta.xml')) {
              members.push(file.replace('.cls-meta.xml', ''));
            } else if (metadataType === 'Flow' && file.endsWith('.flow-meta.xml')) {
              members.push(file.replace('.flow-meta.xml', ''));
            } else if (metadataType === 'Layout' && file.endsWith('.layout-meta.xml')) {
              members.push(file.replace('.layout-meta.xml', ''));
            }
          }

          if (members.length > 0) {
            resultTypes.push({ type: metadataType, members });
          }
        } catch (error) {
          // Directory doesn't exist or can't be read - skip this type
          continue;
        }
      }

      const totalMembers = resultTypes.reduce((sum, item) => sum + item.members.length, 0);

      return success({
        metadataTypes: resultTypes,
        totalMembers,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
      return failure(new LocalMetadataReadError(projectPath, err));
    }
  });
}

/**
 * Compare org metadata vs local to determine changed items
 * NOTE: Incremental retrieve feature - returns only new/changed metadata
 *
 * @param local - Local metadata list
 * @param org - Org metadata list
 * @returns ProfilerMonad<MetadataListResult> with only changed items
 */
export function compareMetadataLists(
  local: MetadataListResult,
  org: MetadataListResult
): ProfilerMonad<MetadataListResult> {
  return new ProfilerMonad(async () => {
    const { MetadataComparisonError } = await import('../core/errors/operation-errors.js');

    try {
      const resultTypes: MetadataTypeMembers[] = [];

      // Build local metadata map
      const localMap = new Map<string, Set<string>>();
      for (const item of local.metadataTypes) {
        localMap.set(item.type, new Set(item.members));
      }

      // Find new or changed items
      for (const orgItem of org.metadataTypes) {
        const localMembers = localMap.get(orgItem.type);

        if (!localMembers) {
          // Type doesn't exist locally - need all
          resultTypes.push(orgItem);
          continue;
        }

        // Find members not in local
        const newMembers = orgItem.members.filter((member: string) => !localMembers.has(member));

        if (newMembers.length > 0) {
          resultTypes.push({
            type: orgItem.type,
            members: newMembers,
          });
        }
      }

      const totalMembers = resultTypes.reduce((sum, item) => sum + item.members.length, 0);

      return success({
        metadataTypes: resultTypes,
        totalMembers,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
      return failure(new MetadataComparisonError('Failed to compare metadata', err));
    }
  });
}

/**
 * Executes sf project retrieve command with package.xml into a temporary directory
 * CRITICAL: This retrieves to a temp directory to avoid modifying user's local metadata
 *
 * @param org - Salesforce org
 * @param packageXmlPath - Path to package.xml file
 * @param tempRetrieveDir - Temporary directory for retrieve operation (NOT user's project)
 * @returns ProfilerMonad<void>
 */
export function executeRetrieve(org: Org, packageXmlPath: string, tempRetrieveDir: string): ProfilerMonad<void> {
  return new ProfilerMonad(async () => {
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const path = await import('node:path');
      const execAsync = promisify(exec);

      const username = org.getUsername() ?? org.getOrgId();
      // Use --output-dir with ABSOLUTE path to explicitly control where files are retrieved
      // This ensures complete isolation from parent projects
      // CRITICAL: Must be absolute path to prevent SF CLI from detecting parent projects
      const outputDir = path.resolve(tempRetrieveDir, 'force-app');
      const retrieveCmd = `sf project retrieve start --manifest "${packageXmlPath}" --target-org ${username} --output-dir "${outputDir}"`;

      // CRITICAL: Execute retrieve in temp directory, NOT in user's project
      // Set working directory explicitly and ensure no parent project is detected
      // Remove any SF-related environment variables that might point to user's project
      const isolatedEnv = {
        ...process.env,
        // Ensure SF CLI doesn't detect parent project directories
        SF_PROJECT_PATH: tempRetrieveDir,
        // Remove any project-related env vars that might interfere
        SFDX_PROJECT_PATH: tempRetrieveDir,
      };

      await execAsync(retrieveCmd, {
        cwd: tempRetrieveDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: isolatedEnv,
      });

      return success(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return failure(new Error(`Retrieve failed: ${err.message}`));
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

  // Step 1: ALWAYS validate input first (UserError - NO fallback)
  return validateProfileNames(input.profileNames).chain(() => {
    // Step 2: Determine metadata source strategy
    let metadataSource: ProfilerMonad<MetadataListResult>;

    // Force full retrieve OR fromProject → skip incremental
    if ((input.forceFullRetrieve ?? false) || (input.fromProject ?? false)) {
      metadataSource =
        input.fromProject ?? false
          ? buildMetadataFromProject(
              input.projectPath,
              metadataTypes,
              input.apiVersion,
              input.profileNames,
              input.excludeManaged
            )
          : listAllMetadata(input, metadataTypes);
    } else {
      // Step 3: Try incremental with automatic fallback
      metadataSource = new ProfilerMonad(async () => {
        // Try incremental path
        const localResult = await readLocalMetadata(input.projectPath, metadataTypes).run();

        if (!localResult.isSuccess()) {
          // Local read failed → fallback to full
          // eslint-disable-next-line no-console
          console.log(`⚠️  Incremental retrieve failed (local read): ${localResult.error.message}`);
          // eslint-disable-next-line no-console
          console.log('   Falling back to full retrieve for safety...');
          const fullResult = await listAllMetadata(input, metadataTypes).run();
          return fullResult;
        }

        const orgResult = await listAllMetadata(input, metadataTypes).run();
        if (!orgResult.isSuccess()) {
          // Org listing failed → return error (this is UserError)
          return orgResult;
        }

        const compareResult = await compareMetadataLists(localResult.value, orgResult.value).run();
        if (!compareResult.isSuccess()) {
          // Comparison failed → fallback to full
          // eslint-disable-next-line no-console
          console.log(`⚠️  Incremental retrieve failed (comparison): ${compareResult.error.message}`);
          // eslint-disable-next-line no-console
          console.log('   Falling back to full retrieve for safety...');
          const fullResult2 = await listAllMetadata(input, metadataTypes).run();
          return fullResult2;
        }

        // Success - return only changed metadata
        return compareResult;
      });
    }

    // Step 4: Process metadata and execute retrieve
    return metadataSource.chain((metadataList) => {
      // Check if there's anything to retrieve
      if (metadataList.totalMembers === 0) {
        // eslint-disable-next-line no-console
        console.log('✨ No changes detected. Profiles are up to date!');
        return new ProfilerMonad(() =>
          Promise.resolve(
            success({
              profilesRetrieved: input.profileNames ?? [],
              metadataTypes: [],
              totalComponents: 0,
              profileCount: 0,
            })
          )
        );
      }

      // Dry run mode - preview without executing
      if (input.dryRun ?? false) {
        // eslint-disable-next-line no-console
        console.log('\n🔍 Dry Run Mode - Would retrieve:');
        for (const item of metadataList.metadataTypes) {
          // eslint-disable-next-line no-console
          console.log(`   ${item.type}: ${item.members.length} items`);
        }
        // eslint-disable-next-line no-console
        console.log(`\n   Total: ${metadataList.totalMembers} components\n`);
        // eslint-disable-next-line no-console
        console.log('✨ Dry run completed - no files were modified');

        return new ProfilerMonad(() =>
          Promise.resolve(
            success({
              profilesRetrieved: input.profileNames ?? [],
              metadataTypes: metadataList.metadataTypes.map((m) => m.type),
              totalComponents: metadataList.totalMembers,
              profileCount: 0,
            })
          )
        );
      }

      // Execute actual retrieve
      return generatePackageXml(metadataList, input.apiVersion).chain((packageXmlResult: PackageXmlResult) =>
        liftAsync(async () => {
          const fs = await import('node:fs/promises');
          const path = await import('node:path');
          const os = await import('node:os');

          // Create isolated temp directory for retrieve operation
          const timestamp = Date.now();
          const tempDir = path.join(os.tmpdir(), `profiler-${timestamp}`);
          const tempRetrieveDir = path.join(tempDir, 'retrieve');

          // Create temp retrieve directory with minimal SFDX project structure
          await fs.mkdir(tempRetrieveDir, { recursive: true });
          // Create force-app directory (required by sf project retrieve)
          await fs.mkdir(path.join(tempRetrieveDir, 'force-app'), { recursive: true });

          // Create minimal sfdx-project.json in temp directory
          const sfdxProjectJson = {
            packageDirectories: [{ path: 'force-app', default: true }],
            namespace: '',
            sfdcLoginUrl: 'https://login.salesforce.com',
            sourceApiVersion: input.apiVersion,
          };
          await fs.writeFile(path.join(tempRetrieveDir, 'sfdx-project.json'), JSON.stringify(sfdxProjectJson, null, 2));

          // Write package.xml to temp directory
          const packageXmlPath = path.join(tempDir, 'package.xml');
          await fs.writeFile(packageXmlPath, packageXmlResult.content);

          return { tempDir, tempRetrieveDir, packageXmlPath, packageXmlResult };
        }).chain(
          (context: {
            tempDir: string;
            tempRetrieveDir: string;
            packageXmlPath: string;
            packageXmlResult: PackageXmlResult;
          }) =>
            // Execute retrieve in temp directory (NOT in user's project)
            executeRetrieve(input.org, context.packageXmlPath, context.tempRetrieveDir)
              .chain(() =>
                liftAsync(async () => {
                  const fs = await import('node:fs/promises');
                  const path = await import('node:path');

                  // Copy ONLY profiles from temp to user's project
                  const tempProfilesDir = path.join(
                    context.tempRetrieveDir,
                    'force-app',
                    'main',
                    'default',
                    'profiles'
                  );
                  const userProfilesDir = path.join(input.projectPath, 'force-app', 'main', 'default', 'profiles');

                  // Ensure user's profiles directory exists
                  await fs.mkdir(userProfilesDir, { recursive: true });

                  // Read profiles from temp directory
                  let profileFiles: string[] = [];
                  try {
                    profileFiles = await fs.readdir(tempProfilesDir);
                    profileFiles = profileFiles.filter((file) => file.endsWith('.profile-meta.xml'));
                  } catch (error) {
                    // Profiles directory doesn't exist in temp - no profiles retrieved
                    return { profileCount: 0, retrieveContext: context };
                  }

                  // Copy each profile to user's project (with optional FLS removal)
                  await Promise.all(
                    profileFiles.map(async (profileFile) => {
                      const tempProfilePath = path.join(tempProfilesDir, profileFile);
                      const userProfilePath = path.join(userProfilesDir, profileFile);

                      let profileContent = await fs.readFile(tempProfilePath, 'utf-8');

                      // Remove FLS if requested
                      if (!input.includeAllFields) {
                        profileContent = profileContent.replace(
                          /<fieldPermissions>[\s\S]*?<\/fieldPermissions>\n?/g,
                          ''
                        );
                      }

                      await fs.writeFile(userProfilePath, profileContent, 'utf-8');
                    })
                  );

                  return { profileCount: profileFiles.length, retrieveContext: context };
                })
              )
              .chain(({ profileCount, retrieveContext }) =>
                liftAsync(async () => {
                  const fs = await import('node:fs/promises');
                  // Clean up entire temp directory
                  await fs.rm(retrieveContext.tempDir, { recursive: true, force: true });
                  return { profileCount, retrieveContext };
                })
              )
              .map(
                ({ profileCount, retrieveContext }): RetrieveResult => ({
                  profilesRetrieved: input.profileNames ?? [],
                  metadataTypes: retrieveContext.packageXmlResult.metadataTypes,
                  totalComponents: retrieveContext.packageXmlResult.totalMembers,
                  profileCount,
                })
              )
        )
      );
    });
  });
}
