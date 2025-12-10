/**
 * Core Operation Errors
 *
 * Errors for retrieve, compare, merge, and validate operations.
 * Following Error-Driven Development methodology.
 */

import { UserError, SystemError } from './base-errors.js';

// ============================================================================
// RETRIEVE OPERATION ERRORS (11 total)
// ============================================================================

/**
 * ProfileNotFoundError - Profile doesn't exist in org
 * When: listMetadata returns empty or retrieve fails
 * Recoverable: No (user must fix profile name)
 */
export class ProfileNotFoundError extends UserError {
  public constructor(profileName: string) {
    super(`Profile '${profileName}' not found in the org`, 'PROFILE_NOT_FOUND', [
      'Verify the profile name is correct',
      'Run: sf data query -q "SELECT Id,Name FROM Profile" -o <org>',
      'Check for typos or case sensitivity',
    ]);
  }
}

/**
 * OrgNotAuthenticatedError - Org connection not found
 * When: No valid auth for target org
 * Recoverable: Yes (user can authenticate)
 */
export class OrgNotAuthenticatedError extends UserError {
  public constructor(orgAlias: string) {
    super(`Org '${orgAlias}' is not authenticated`, 'ORG_NOT_AUTHENTICATED', [
      `Run: sf org login web -a ${orgAlias}`,
      'Or use: sf org list to see authenticated orgs',
    ]);
  }
}

/**
 * MetadataApiError - Salesforce Metadata API failure
 * When: API call fails (network, server error, etc.)
 * Recoverable: Yes (retry possible)
 */
export class MetadataApiError extends SystemError {
  public constructor(message: string, cause?: Error) {
    super(
      `Metadata API error: ${message}`,
      'METADATA_API_ERROR',
      [
        'Check your internet connection',
        'Verify org is accessible',
        'Try again in a few moments',
        'Check Salesforce status: https://status.salesforce.com',
      ],
      true // recoverable
    );
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * RetrieveTimeoutError - Retrieve operation exceeded timeout
 * When: Operation takes too long
 * Recoverable: Yes (can retry with longer timeout)
 */
export class RetrieveTimeoutError extends SystemError {
  public constructor(timeoutMs: number) {
    super(
      `Retrieve operation timed out after ${timeoutMs}ms`,
      'RETRIEVE_TIMEOUT',
      [
        'The org may be slow or under heavy load',
        'Try again with --timeout flag: profiler retrieve --timeout 120000',
        'Reduce the number of profiles being retrieved',
      ],
      true // recoverable
    );
  }
}

/**
 * InsufficientPermissionsError - User lacks required permissions
 * When: User doesn't have ViewAllProfiles or API access
 * Recoverable: No (admin must grant permissions)
 */
export class InsufficientPermissionsError extends UserError {
  public constructor(missingPermission: string) {
    super(`Insufficient permissions: ${missingPermission}`, 'INSUFFICIENT_PERMISSIONS', [
      'Contact your Salesforce administrator',
      'Required permission: View All Profiles',
      'Ensure API Enabled is checked on your user',
    ]);
  }
}

/**
 * InvalidProjectError - Not a valid Salesforce project
 * When: Missing sfdx-project.json or force-app directory
 * Recoverable: No (user must fix project structure)
 */
export class InvalidProjectError extends UserError {
  public constructor(missingItem: string) {
    super(`Invalid Salesforce project: ${missingItem} not found`, 'INVALID_PROJECT', [
      'Ensure you are in a valid Salesforce project directory',
      'Create project with: sf project generate',
      `Required: ${missingItem}`,
    ]);
  }
}

/**
 * DiskSpaceError - Insufficient disk space
 * When: Cannot write files due to disk space
 * Recoverable: Yes (user can free up space)
 */
export class DiskSpaceError extends SystemError {
  public constructor(requiredBytes: number, availableBytes: number) {
    const requiredMB = (requiredBytes / 1024 / 1024).toFixed(2);
    const availableMB = (availableBytes / 1024 / 1024).toFixed(2);

    super(
      `Insufficient disk space: need ${requiredMB}MB, have ${availableMB}MB`,
      'DISK_SPACE_ERROR',
      [
        'Free up disk space on your system',
        `At least ${requiredMB}MB required`,
        'Delete unnecessary files or move to a different location',
      ],
      true // recoverable
    );
  }
}

/**
 * ManagedPackageError - Error with managed package metadata
 * When: Attempting to retrieve managed package profile elements
 * Recoverable: Yes (use --exclude-managed flag)
 */
export class ManagedPackageError extends UserError {
  public constructor(packageNamespace: string) {
    super(`Cannot retrieve managed package metadata from '${packageNamespace}'`, 'MANAGED_PACKAGE_ERROR', [
      'Use --exclude-managed flag to skip managed packages',
      'Managed package metadata cannot be retrieved or modified',
      'Example: profiler retrieve --exclude-managed',
    ]);
  }
}

/**
 * LocalMetadataReadError - Cannot read local metadata files
 * When: Error reading local force-app directory or profile files
 * Recoverable: Yes (fallback to full retrieve)
 */
export class LocalMetadataReadError extends SystemError {
  public constructor(path: string, cause?: Error) {
    super(
      `Failed to read local metadata from '${path}'`,
      'LOCAL_METADATA_READ_ERROR',
      [
        'Check file permissions on your project directory',
        'Ensure force-app directory exists and is readable',
        'Will fallback to full retrieve for safety',
      ],
      true // recoverable - fallback to full retrieve
    );
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * MetadataComparisonError - Error comparing local vs org metadata
 * When: Diff/comparison logic fails
 * Recoverable: Yes (fallback to full retrieve)
 */
export class MetadataComparisonError extends SystemError {
  public constructor(message: string, cause?: Error) {
    super(
      `Metadata comparison failed: ${message}`,
      'METADATA_COMPARISON_ERROR',
      [
        'Could not determine changed metadata',
        'Will fallback to full retrieve for safety',
        'This ensures all metadata is up to date',
      ],
      true // recoverable - fallback to full retrieve
    );
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * IncrementalRetrieveError - Incremental retrieve logic failed
 * When: Any error during incremental retrieve process
 * Recoverable: Yes (fallback to full retrieve)
 */
export class IncrementalRetrieveError extends SystemError {
  public constructor(reason: string, cause?: Error) {
    super(
      `Incremental retrieve failed: ${reason}`,
      'INCREMENTAL_RETRIEVE_ERROR',
      [
        'Incremental retrieve strategy failed',
        'Falling back to full retrieve for safety',
        'Use --force flag to always perform full retrieve',
      ],
      true // recoverable - fallback to full retrieve
    );
    if (cause) {
      this.cause = cause;
    }
  }
}

// ============================================================================
// COMPARE OPERATION ERRORS (4 total)
// ============================================================================

/**
 * NoLocalProfileError - Local profile file not found
 * When: Comparing but local profile doesn't exist
 * Recoverable: Yes (retrieve first)
 */
export class NoLocalProfileError extends UserError {
  public constructor(profileName: string, expectedPath: string) {
    super(`Local profile '${profileName}' not found at ${expectedPath}`, 'NO_LOCAL_PROFILE', [
      'Retrieve the profile first: profiler retrieve --target-org <org>',
      `Expected location: ${expectedPath}`,
      'Ensure the profile exists in your local project',
    ]);
  }
}

/**
 * NoOrgProfileError - Profile not found in org during compare
 * When: Comparing but org profile doesn't exist
 * Recoverable: No (profile must exist in org)
 */
export class NoOrgProfileError extends UserError {
  public constructor(profileName: string, orgAlias: string) {
    super(`Profile '${profileName}' not found in org '${orgAlias}'`, 'NO_ORG_PROFILE', [
      'Verify the profile exists in the org',
      `Run: sf data query -q "SELECT Name FROM Profile WHERE Name='${profileName}'" -o ${orgAlias}`,
      'The profile may have been deleted or renamed',
    ]);
  }
}

/**
 * InvalidXmlError - Profile XML is malformed
 * When: Cannot parse profile XML file
 * Recoverable: No (XML must be fixed)
 */
export class InvalidXmlError extends UserError {
  public constructor(filePath: string, parseError: string) {
    super(`Invalid XML in ${filePath}: ${parseError}`, 'INVALID_XML', [
      'Check the XML file for syntax errors',
      'Ensure all tags are properly closed',
      'Validate XML: Use an XML validator tool',
      'Re-retrieve the profile if corrupted',
    ]);
  }
}

/**
 * ComparisonTimeoutError - Compare operation exceeded timeout
 * When: Comparison takes too long (large profiles)
 * Recoverable: Yes (can retry)
 */
export class ComparisonTimeoutError extends SystemError {
  public constructor(profileCount: number, timeoutMs: number) {
    super(
      `Comparison of ${profileCount} profiles timed out after ${timeoutMs}ms`,
      'COMPARISON_TIMEOUT',
      [
        'Reduce the number of profiles being compared',
        'Try comparing profiles one at a time',
        'Increase timeout if profiles are very large',
      ],
      true // recoverable
    );
  }
}

// ============================================================================
// MERGE OPERATION ERRORS (5 total)
// ============================================================================

/**
 * MergeConflictError - Cannot automatically merge changes
 * When: Conflicting changes between local and org
 * Recoverable: Yes (manual resolution required)
 */
export class MergeConflictError extends UserError {
  public constructor(profileName: string, conflictingElements: string[]) {
    super(
      `Merge conflict in profile '${profileName}': ${conflictingElements.length} conflicting elements`,
      'MERGE_CONFLICT',
      [
        'Review conflicts manually',
        `Conflicting elements: ${conflictingElements.slice(0, 5).join(', ')}${
          conflictingElements.length > 5 ? '...' : ''
        }`,
        'Use --strategy=local or --strategy=org to force merge',
        'Or resolve conflicts manually in the XML file',
      ]
    );
  }
}

/**
 * BackupFailedError - Failed to create backup before merge
 * When: Cannot write backup file
 * Recoverable: No (backup is required for safety)
 */
export class BackupFailedError extends SystemError {
  public constructor(backupPath: string, cause?: Error) {
    super(
      `Failed to create backup at ${backupPath}`,
      'BACKUP_FAILED',
      ['Ensure you have write permissions', 'Check available disk space', 'Verify the directory exists'],
      false // not recoverable - backup is mandatory
    );
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * InvalidMergeStrategyError - Unknown merge strategy specified
 * When: User provides invalid --strategy value
 * Recoverable: No (user must fix command)
 */
export class InvalidMergeStrategyError extends UserError {
  public constructor(providedStrategy: string, validStrategies: string[]) {
    super(`Invalid merge strategy '${providedStrategy}'`, 'INVALID_MERGE_STRATEGY', [
      `Valid strategies: ${validStrategies.join(', ')}`,
      'Example: profiler merge --strategy=local',
      'Default strategy is "prompt" (interactive)',
    ]);
  }
}

/**
 * MergeValidationError - Merged profile fails validation
 * When: Result of merge is invalid XML or has errors
 * Recoverable: Yes (can revert to backup)
 */
export class MergeValidationError extends SystemError {
  public constructor(profileName: string, validationErrors: string[]) {
    super(
      `Merged profile '${profileName}' failed validation`,
      'MERGE_VALIDATION_ERROR',
      [
        'The merge produced an invalid profile',
        'Backup has been preserved',
        `Validation errors: ${validationErrors.join(', ')}`,
        'Review the merge strategy or resolve conflicts manually',
      ],
      true // recoverable - can try again
    );
  }
}

/**
 * NoChangesToMergeError - No differences found
 * When: Local and org profiles are identical
 * Recoverable: N/A (not really an error, more of an info)
 */
export class NoChangesToMergeError extends UserError {
  public constructor(profileName: string) {
    super(`No changes to merge for profile '${profileName}' - local and org are identical`, 'NO_CHANGES_TO_MERGE', [
      'The profile is already up to date',
      'No action needed',
    ]);
  }
}

// ============================================================================
// VALIDATE OPERATION ERRORS (3 total)
// ============================================================================

/**
 * MissingMetadataReferenceError - Profile references non-existent metadata
 * When: Profile has permissions for deleted objects/fields
 * Recoverable: Yes (can be cleaned up)
 */
export class MissingMetadataReferenceError extends SystemError {
  public constructor(profileName: string, missingReferences: Array<{ type: string; name: string }>) {
    const refList = missingReferences.map((r) => `${r.type}: ${r.name}`).slice(0, 5);

    super(
      `Profile '${profileName}' references ${missingReferences.length} missing metadata items`,
      'MISSING_METADATA_REFERENCE',
      [
        'These metadata items may have been deleted',
        `Examples: ${refList.join(', ')}${missingReferences.length > 5 ? '...' : ''}`,
        'Run profiler validate --fix to clean up',
        'Or manually remove the references from the profile',
      ],
      true // recoverable
    );
  }
}

/**
 * DuplicateEntryError - Profile has duplicate entries
 * When: Same permission appears multiple times
 * Recoverable: Yes (can be deduplicated)
 */
export class DuplicateEntryError extends SystemError {
  public constructor(profileName: string, duplicates: Array<{ type: string; name: string }>) {
    const dupList = duplicates.map((d) => `${d.type}: ${d.name}`).slice(0, 5);

    super(
      `Profile '${profileName}' has ${duplicates.length} duplicate entries`,
      'DUPLICATE_ENTRY',
      [
        'Duplicate permissions can cause deployment errors',
        `Examples: ${dupList.join(', ')}${duplicates.length > 5 ? '...' : ''}`,
        'Run profiler validate --fix to remove duplicates',
      ],
      true // recoverable
    );
  }
}

/**
 * InvalidPermissionError - Permission configuration is invalid
 * When: Permission has invalid combination (e.g., Create without Read)
 * Recoverable: Yes (can be corrected)
 */
export class InvalidPermissionError extends SystemError {
  public constructor(profileName: string, invalidPerms: Array<{ object: string; issue: string }>) {
    const permList = invalidPerms.map((p) => `${p.object}: ${p.issue}`).slice(0, 5);

    super(
      `Profile '${profileName}' has ${invalidPerms.length} invalid permissions`,
      'INVALID_PERMISSION',
      [
        'Some permission combinations are not allowed by Salesforce',
        `Examples: ${permList.join(', ')}${invalidPerms.length > 5 ? '...' : ''}`,
        'Common issue: Create/Edit/Delete without Read',
        'Run profiler validate --fix to auto-correct',
      ],
      true // recoverable
    );
  }
}

// ============================================================================
// MULTI-SOURCE COMPARISON ERRORS (4 total)
// ============================================================================

/**
 * MultipleEnvironmentFailureError - Multiple orgs failed during parallel retrieval
 * When: All or most environments failed to retrieve
 * Recoverable: No (requires fixing org connections)
 */
export class MultipleEnvironmentFailureError extends UserError {
  public constructor(failedOrgs: Array<{ alias: string; error: string }>, totalOrgs: number) {
    const failedList = failedOrgs.map((org) => `${org.alias}: ${org.error}`).slice(0, 3);
    const failureCount = failedOrgs.length;

    super(`${failureCount} of ${totalOrgs} environments failed to retrieve profiles`, 'MULTIPLE_ENVIRONMENT_FAILURE', [
      'Multiple org connections failed',
      `Failed environments: ${failedList.join(', ')}${failureCount > 3 ? '...' : ''}`,
      'Check org authentication and network connection',
      'Verify org aliases are correct',
      'Try authenticating again: sf org login web --alias <alias>',
    ]);
  }
}

/**
 * PartialRetrievalError - Some orgs succeeded, some failed (partial success)
 * When: Not all environments retrieved successfully
 * Recoverable: Yes (show partial results with warnings)
 */
export class PartialRetrievalError extends SystemError {
  public constructor(successOrgs: string[], failedOrgs: Array<{ alias: string; error: string }>) {
    const successList = successOrgs.join(', ');
    const failedList = failedOrgs.map((org) => org.alias).join(', ');

    super(
      `Partial retrieval: ${successOrgs.length} succeeded, ${failedOrgs.length} failed`,
      'PARTIAL_RETRIEVAL',
      [
        'Some environments retrieved successfully',
        `Successful: ${successList}`,
        `Failed: ${failedList}`,
        'Comparison will show available data with warnings',
        'Check failed org connections and retry',
      ],
      true // recoverable - show partial results
    );
  }
}

/**
 * MatrixBuildError - Error building comparison matrix
 * When: Cannot construct comparison matrix from profiles
 * Recoverable: Yes (can retry)
 */
export class MatrixBuildError extends SystemError {
  public constructor(reason: string, cause?: Error) {
    super(
      `Failed to build comparison matrix: ${reason}`,
      'MATRIX_BUILD_ERROR',
      [
        'Could not construct comparison matrix',
        'Profiles may have incompatible structure',
        'Try comparing fewer environments',
        'Verify profile XML is valid',
      ],
      true // recoverable
    );
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * ParallelExecutionError - Parallel retrieval failed
 * When: Promise.all() or parallel execution encounters error
 * Recoverable: Yes (can retry sequentially)
 */
export class ParallelExecutionError extends SystemError {
  public constructor(errorCount: number, totalTasks: number, cause?: Error) {
    super(
      `Parallel execution failed: ${errorCount} of ${totalTasks} tasks failed`,
      'PARALLEL_EXECUTION_ERROR',
      [
        'Parallel retrieval encountered errors',
        'Will retry failed tasks sequentially',
        'This may take longer but will be more reliable',
        'Consider reducing --max-parallel value',
      ],
      true // recoverable - fallback to sequential
    );
    if (cause) {
      this.cause = cause;
    }
  }
}
