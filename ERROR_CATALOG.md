# Error Catalog - Profiler Plugin

> **Error-Driven Development**: Define all possible errors BEFORE implementing features.

## Error Classification

### 1. **User Errors** (Recoverable)

User provided invalid input. Clear message + action to fix.

### 2. **System Errors** (Recoverable)

External dependency failed. Retry or fallback possible.

### 3. **Fatal Errors** (Non-recoverable)

Critical failure. Cannot continue, exit gracefully.

---

## Error Definitions

### **Retrieve Errors**

#### `ProfileNotFoundError` (User Error)

- **When**: Profile name doesn't exist in org
- **Message**: `Profile '{profileName}' not found in org '{orgAlias}'`
- **Actions**:
  - Run `sf profiler list` to see available profiles
  - Check spelling of profile name
  - Verify you're connected to the correct org
- **Exit Code**: 1
- **Recoverable**: No

#### `OrgNotAuthenticatedError` (User Error)

- **When**: Target org not authenticated
- **Message**: `Org '{orgAlias}' is not authenticated`
- **Actions**:
  - Run `sf org login web --alias {orgAlias}`
  - Run `sf org list` to see authenticated orgs
- **Exit Code**: 1
- **Recoverable**: No

#### `MetadataApiError` (System Error)

- **When**: Salesforce Metadata API returns error
- **Message**: `Metadata API failed: {apiError}`
- **Actions**:
  - Check your org connection: `sf org display`
  - Verify Metadata API access
  - Try again with `--api-version` flag
  - Check Salesforce status: status.salesforce.com
- **Exit Code**: 1
- **Recoverable**: Yes (retry)

#### `RetrieveTimeoutError` (System Error)

- **When**: Retrieve takes longer than timeout
- **Message**: `Retrieve timed out after {timeout}s`
- **Actions**:
  - Try with fewer profiles (reduce scope)
  - Increase timeout: `--timeout {seconds}`
  - Check network connection
- **Exit Code**: 1
- **Recoverable**: Yes (retry with smaller scope)

#### `InsufficientPermissionsError` (User Error)

- **When**: User doesn't have permission to retrieve metadata
- **Message**: `Insufficient permissions to retrieve {metadataType}`
- **Actions**:
  - Check your user permissions in Salesforce
  - Request "View All Data" or "Modify All Data" permission
  - Contact your Salesforce admin
- **Exit Code**: 1
- **Recoverable**: No

#### `InvalidProjectError` (User Error)

- **When**: Not run from valid Salesforce project
- **Message**: `Not a valid Salesforce project. Missing sfdx-project.json`
- **Actions**:
  - Run `sf project generate` to create a project
  - Navigate to your Salesforce project directory
- **Exit Code**: 1
- **Recoverable**: No

#### `DiskSpaceError` (System Error)

- **When**: Not enough disk space for retrieve
- **Message**: `Insufficient disk space. Need {required}MB, have {available}MB`
- **Actions**:
  - Free up disk space
  - Retrieve fewer profiles
- **Exit Code**: 1
- **Recoverable**: No

#### `ManagedPackageError` (System Error)

- **When**: Profile references unavailable managed package
- **Message**: `Profile references managed package '{namespace}' which is not installed`
- **Actions**:
  - Use `--exclude-managed` flag to filter out managed packages
  - Install the managed package in your org
  - Remove managed package references manually
- **Exit Code**: 1
- **Recoverable**: Yes (use --exclude-managed)

---

### **Compare Errors**

#### `NoLocalProfileError` (User Error)

- **When**: Local profile doesn't exist for comparison
- **Message**: `Local profile '{profileName}' not found in project`
- **Actions**:
  - Run `sf profiler retrieve` first to get the profile
  - Check profile exists in force-app/main/default/profiles/
- **Exit Code**: 1
- **Recoverable**: Yes (run retrieve first)

#### `NoOrgProfileError` (System Error)

- **When**: Profile doesn't exist in target org
- **Message**: `Profile '{profileName}' not found in org '{orgAlias}'`
- **Actions**:
  - Verify profile exists in org
  - Check spelling
  - Profile may have been deleted
- **Exit Code**: 1
- **Recoverable**: No

#### `InvalidXmlError` (User Error)

- **When**: Profile XML is malformed
- **Message**: `Invalid XML in profile '{profileName}': {parseError}`
- **Actions**:
  - Check XML syntax in profile file
  - Re-retrieve the profile: `sf profiler retrieve --name {profileName} --force`
  - Restore from backup if available
- **Exit Code**: 1
- **Recoverable**: Yes (re-retrieve)

#### `MultipleEnvironmentFailureError` (System Error)

- **When**: Multiple orgs failed in multi-source compare
- **Message**: `Failed to retrieve from {count} environments: {orgList}`
- **Details**: Individual errors for each failed org
- **Actions**:
  - Check connection to each org
  - Results shown for successful orgs
  - Retry failed orgs individually
- **Exit Code**: 1
- **Recoverable**: Partial (show successful results)

#### `ComparisonTimeoutError` (System Error)

- **When**: Comparison takes too long (large profiles)
- **Message**: `Comparison timed out after {timeout}s`
- **Actions**:
  - Use `--exclude-managed` to reduce profile size
  - Exclude field permissions: don't use `--all-fields`
  - Increase timeout: `--timeout {seconds}`
- **Exit Code**: 1
- **Recoverable**: Yes (retry with filters)

---

### **Merge Errors**

#### `MergeConflictError` (User Error)

- **When**: Manual changes conflict with merge
- **Message**: `Merge conflict detected in profile '{profileName}'`
- **Details**: List of conflicting permissions/objects
- **Actions**:
  - Review conflicts manually
  - Use `--force` to overwrite local changes
  - Use `--strategy selective` to choose specific changes
  - Restore from backup: `sf profiler merge --undo`
- **Exit Code**: 1
- **Recoverable**: Yes (manual resolution)

#### `BackupFailedError` (System Error)

- **When**: Cannot create backup before merge
- **Message**: `Failed to create backup of '{profileName}'`
- **Actions**:
  - Check disk space
  - Check write permissions in project directory
  - Manually backup profile before retrying
- **Exit Code**: 1
- **Recoverable**: No (safety mechanism)

#### `InvalidMergeStrategyError` (User Error)

- **When**: Invalid merge strategy specified
- **Message**: `Invalid merge strategy '{strategy}'. Must be: all, selective, or interactive`
- **Actions**:
  - Use valid strategy
  - See help: `sf profiler merge --help`
- **Exit Code**: 1
- **Recoverable**: Yes (fix command)

#### `NoChangesToMergeError` (User Error)

- **When**: No differences detected between local and org
- **Message**: `No changes to merge. Local and org profiles are identical.`
- **Actions**:
  - This is not an error, profiles are in sync
  - Use `sf profiler compare` to verify
- **Exit Code**: 0
- **Recoverable**: N/A (success case)

#### `MergeValidationError` (System Error)

- **When**: Merged profile fails validation
- **Message**: `Merged profile failed validation: {validationErrors}`
- **Actions**:
  - Backup restored automatically
  - Review validation errors
  - Fix issues and retry
  - Use `--skip-validation` to bypass (not recommended)
- **Exit Code**: 1
- **Recoverable**: Yes (auto-rollback)

---

### **Validation Errors**

#### `MissingMetadataReferenceError` (User Error)

- **When**: Profile references metadata that doesn't exist
- **Message**: `Profile references non-existent metadata: {metadataList}`
- **Actions**:
  - Deploy referenced metadata first
  - Remove references from profile
  - Use `--exclude-managed` if references are from managed packages
- **Exit Code**: 1
- **Recoverable**: Yes (fix references)

#### `DuplicateEntryError` (User Error)

- **When**: Profile has duplicate permissions/objects
- **Message**: `Duplicate entries found: {duplicates}`
- **Actions**:
  - Remove duplicates manually
  - Re-retrieve profile: `sf profiler retrieve --force`
- **Exit Code**: 1
- **Recoverable**: Yes (fix duplicates)

#### `InvalidPermissionError` (User Error)

- **When**: Profile has invalid permission value
- **Message**: `Invalid permission '{permission}': {reason}`
- **Actions**:
  - Check Salesforce documentation for valid values
  - Re-retrieve profile
- **Exit Code**: 1
- **Recoverable**: Yes (fix permission)

---

### **Cache Errors**

#### `CacheCorruptedError` (System Error)

- **When**: Cache file is corrupted
- **Message**: `Cache corrupted for org '{orgAlias}'. Clearing cache.`
- **Actions**:
  - Cache cleared automatically
  - Fresh metadata will be fetched
  - No user action needed
- **Exit Code**: 0 (warning only)
- **Recoverable**: Yes (auto-recovery)

#### `CacheWriteError` (System Error)

- **When**: Cannot write to cache directory
- **Message**: `Failed to write cache: {error}`
- **Actions**:
  - Check disk space
  - Check permissions on ~/.sf/profiler-cache/
  - Continue without caching (slower but works)
- **Exit Code**: 0 (warning only)
- **Recoverable**: Yes (continue without cache)

---

### **Pipeline Errors**

#### `PipelineStepFailedError` (System Error)

- **When**: A step in the pipeline fails
- **Message**: `Pipeline failed at step '{stepName}': {error}`
- **Details**: Full error from failed step
- **Actions**:
  - Review error from specific step
  - Fix issue and re-run pipeline
  - Run steps individually for debugging
- **Exit Code**: 1
- **Recoverable**: Depends on step error

#### `PipelineInterruptedError` (System Error)

- **When**: User cancels pipeline (Ctrl+C)
- **Message**: `Pipeline interrupted by user at step '{stepName}'`
- **Actions**:
  - Partial results may be available
  - Re-run pipeline from beginning
  - Use individual commands instead
- **Exit Code**: 130 (SIGINT)
- **Recoverable**: Yes (restart)

---

## Error Type Hierarchy

```typescript
// Base error
export class ProfilerError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly recoverable: boolean;
  readonly actions: string[];

  constructor(message: string, code: string, actions: string[], exitCode = 1, recoverable = false) {
    super(message);
    this.code = code;
    this.exitCode = exitCode;
    this.recoverable = recoverable;
    this.actions = actions;
    this.name = 'ProfilerError';
  }
}

// User Errors (input/usage issues)
export class UserError extends ProfilerError {
  constructor(message: string, code: string, actions: string[]) {
    super(message, code, actions, 1, false);
    this.name = 'UserError';
  }
}

// System Errors (external dependencies)
export class SystemError extends ProfilerError {
  constructor(message: string, code: string, actions: string[], recoverable = true) {
    super(message, code, actions, 1, recoverable);
    this.name = 'SystemError';
  }
}

// Fatal Errors (cannot continue)
export class FatalError extends ProfilerError {
  constructor(message: string, code: string) {
    super(message, code, ['Contact support', 'Report issue on GitHub'], 2, false);
    this.name = 'FatalError';
  }
}
```

---

## Error Testing Checklist

For EVERY feature, test ALL error cases:

### Retrieve Feature

- [ ] Profile not found
- [ ] Org not authenticated
- [ ] Metadata API error
- [ ] Retrieve timeout
- [ ] Insufficient permissions
- [ ] Invalid project
- [ ] Disk space error
- [ ] Managed package error

### Compare Feature

- [ ] No local profile
- [ ] No org profile
- [ ] Invalid XML
- [ ] Multiple environment failure
- [ ] Comparison timeout

### Merge Feature

- [ ] Merge conflict
- [ ] Backup failed
- [ ] Invalid merge strategy
- [ ] No changes to merge
- [ ] Merge validation error

### Validation Feature

- [ ] Missing metadata reference
- [ ] Duplicate entry
- [ ] Invalid permission

### Cache Feature

- [ ] Cache corrupted
- [ ] Cache write error

### Pipeline Feature

- [ ] Pipeline step failed
- [ ] Pipeline interrupted

---

## Error Message Template

````typescript
/**
 * Error: {ErrorName}
 *
 * When: {When this error occurs}
 *
 * Message: {User-facing message with context}
 *
 * Actions:
 * - {Specific action user can take}
 * - {Alternative action}
 * - {Last resort action}
 *
 * Example:
 * ```
 * Error: ProfileNotFoundError
 * Profile 'Admin' not found in org 'production'
 *
 * Actions to resolve:
 * 1. Run 'sf profiler list --target-org production' to see available profiles
 * 2. Check spelling of profile name (case-sensitive)
 * 3. Verify you're connected to the correct org
 * ```
 */
````

---

## Implementation Priority

1. **Phase 1**: Core errors (retrieve, compare)
2. **Phase 2**: Advanced errors (merge, validation)
3. **Phase 3**: Pipeline errors
4. **Phase 4**: Edge cases and rare errors

---

## Monitoring

Track error frequency to improve UX:

- Most common errors → better docs
- Recoverable errors → auto-recovery
- System errors → better error messages

