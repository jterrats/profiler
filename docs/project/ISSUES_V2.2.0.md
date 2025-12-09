# GitHub Issues - v2.2.0 (Error-Driven Development)

> **Methodology**: All issues follow Error-Driven Development (EDD)
> **Rule**: Define ALL errors BEFORE writing any implementation code

---

## Issue #1: Result Monad (Foundation)

**Labels:** `enhancement`, `architecture`, `v2.2.0`, `edd-foundation`
**Priority:** Critical
**Points:** 3

### User Story

As a developer, I want type-safe error handling with Result monad
So that errors are explicit and compiler-enforced

### Error-Driven Approach

#### Errors to Handle

1. **UnwrapError** - Attempting to unwrap a Failure
2. **TypeGuardError** - Incorrect type narrowing

#### Error Tests (Write FIRST)

```typescript
describe('Result Monad Errors', () => {
  it('should throw UnwrapError when unwrapping Failure', () => {
    const result = failure(new Error('test'));
    expect(() => result.unsafeUnwrap()).toThrow(UnwrapError);
  });

  it('should prevent invalid type guards', () => {
    const result: Result<number> = success(42);

    if (result.isSuccess()) {
      // TypeScript must know this is Success<number>
      const value: number = result.value; // Must compile
    }
  });
});
```

### Implementation Steps (EDD Order)

1. **Define Error Types**

   ```typescript
   // src/core/errors/monad-errors.ts
   export class UnwrapError extends FatalError {
     constructor(error: Error) {
       super(`Attempted to unwrap Failure: ${error.message}`, 'UNWRAP_FAILURE');
     }
   }
   ```

2. **Write Error Tests** (must fail initially)
3. **Implement Result Type** to pass error tests
4. **Write Success Tests** (happy path)
5. **Verify All Tests Pass**

### Acceptance Criteria

- [ ] UnwrapError defined and tested
- [ ] Result<T, E> type with discriminated union
- [ ] Type guards work correctly
- [ ] Error tests pass BEFORE implementation
- [ ] 100% test coverage
- [ ] Documentation with error scenarios

### Error Catalog Entry

- [ ] Added to ERROR_CATALOG.md

---

## Issue #2: ProfilerMonad (Foundation)

**Labels:** `enhancement`, `architecture`, `v2.2.0`, `edd-foundation`
**Priority:** Critical
**Points:** 5

### User Story

As a developer, I want composable monadic operations
So that I can build error-safe pipelines

### Error-Driven Approach

#### Errors to Handle

1. **ComputationError** - Error during monad execution
2. **FlatMapError** - Error in flatMap transformation
3. **RecoveryError** - Error during recovery function
4. **ChainError** - Error propagating through chain

#### Error Tests (Write FIRST)

```typescript
describe('ProfilerMonad Errors', () => {
  it('should capture computation errors', async () => {
    const monad = liftAsync(() => {
      throw new Error('Computation failed');
    });

    const result = await monad.run();

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(ComputationError);
  });

  it('should capture flatMap errors', async () => {
    const monad = pure(5).flatMap(() => {
      throw new Error('FlatMap failed');
    });

    const result = await monad.run();

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(FlatMapError);
  });

  it('should handle recovery function errors', async () => {
    const monad = liftAsync(() => {
      throw new Error('Initial error');
    }).recover(() => {
      throw new Error('Recovery failed');
    });

    const result = await monad.run();

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(RecoveryError);
  });

  it('should propagate errors through chain', async () => {
    const monad = pure(5)
      .map((x) => x * 2)
      .flatMap(() =>
        liftAsync(() => {
          throw new Error('Step 2 failed');
        })
      )
      .map((x) => x + 1); // Should not execute

    const result = await monad.run();

    expect(result.isFailure()).toBe(true);
  });
});
```

### Implementation Steps (EDD Order)

1. **Define All Error Types**
2. **Write ALL Error Tests** (10+ tests)
3. **Implement ProfilerMonad** to pass error tests
4. **Write Happy Path Tests**
5. **Verify 100% Coverage**

### Acceptance Criteria

- [ ] All 4 error types defined
- [ ] Error tests written FIRST
- [ ] All error tests pass
- [ ] Lazy evaluation works
- [ ] Type inference works
- [ ] Happy path tests pass
- [ ] Documentation includes error scenarios

### Error Catalog Entry

- [ ] Added to ERROR_CATALOG.md

---

## Issue #3: Refactor Core Operations (Monadic + EDD)

**Labels:** `refactor`, `architecture`, `v2.2.0`, `edd-migration`
**Priority:** Critical
**Points:** 8

### User Story

As a developer, I want core operations as pure monadic functions
So that errors are handled consistently and composably

### Error-Driven Approach

#### ALL Errors to Handle (Define FIRST)

**Retrieve Operation:**

- ProfileNotFoundError
- OrgNotAuthenticatedError
- MetadataApiError
- RetrieveTimeoutError
- InsufficientPermissionsError
- InvalidProjectError
- DiskSpaceError
- ManagedPackageError

**Compare Operation:**

- NoLocalProfileError
- NoOrgProfileError
- InvalidXmlError
- ComparisonTimeoutError

**Merge Operation:**

- MergeConflictError
- BackupFailedError
- InvalidMergeStrategyError
- MergeValidationError
- NoChangesToMergeError

**Validate Operation:**

- MissingMetadataReferenceError
- DuplicateEntryError
- InvalidPermissionError

#### Error Tests (Write FIRST - 20+ tests!)

```typescript
// test/core/retrieve.errors.test.ts
describe('retrieve() Error Handling', () => {
  it('returns ProfileNotFoundError when profile missing', async () => {
    mockOrg.getProfile.mockResolvedValue(null);

    const result = await retrieve({ org: mockOrg, profileNames: ['Fake'] }).run();

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(ProfileNotFoundError);
    expect(result.error.code).toBe('PROFILE_NOT_FOUND');
    expect(result.error.actions).toContain('Run sf profiler list');
  });

  it('returns OrgNotAuthenticatedError when not logged in', async () => {
    mockOrg.isAuthenticated.mockReturnValue(false);

    const result = await retrieve({ org: mockOrg }).run();

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(OrgNotAuthenticatedError);
    expect(result.error.exitCode).toBe(1);
  });

  // ... 18 more error tests
});

// test/core/compare.errors.test.ts
describe('compare() Error Handling', () => {
  it('returns NoLocalProfileError when local file missing', async () => {
    // ...
  });

  // ... more error tests
});

// test/core/merge.errors.test.ts (NEW!)
describe('merge() Error Handling', () => {
  it('returns MergeConflictError when conflicts detected', async () => {
    // ...
  });

  // ... more error tests
});

// test/core/validate.errors.test.ts (NEW!)
describe('validate() Error Handling', () => {
  it('returns MissingMetadataReferenceError for invalid refs', async () => {
    // ...
  });

  // ... more error tests
});
```

### Implementation Steps (STRICT EDD Order)

1. **Define ALL 20+ Error Classes** (2 days)

   - Create error hierarchy
   - Add to ERROR_CATALOG.md
   - Document each error

2. **Write ALL Error Tests** (3 days)

   - Retrieve: 8 error tests
   - Compare: 4 error tests
   - Merge: 5 error tests
   - Validate: 3 error tests
   - Run tests → ALL MUST FAIL

3. **Extract retrieve() Operation** (2 days)

   - Implement to pass error tests
   - Then implement happy path
   - Verify tests pass

4. **Extract compare() Operation** (2 days)

   - Same process

5. **Implement merge() Operation** (3 days)

   - New feature, error-first

6. **Implement validate() Operation** (2 days)

   - New feature, error-first

7. **Integration Tests** (2 days)
   - Error propagation through composition
   - Recovery strategies

### Acceptance Criteria

**Error Handling:**

- [ ] ALL 20+ errors defined in ERROR_CATALOG.md
- [ ] ALL error classes created
- [ ] ALL error tests written BEFORE implementation
- [ ] ALL error tests pass
- [ ] Error messages are actionable
- [ ] Exit codes correct

**Operations:**

- [ ] retrieve() returns ProfilerMonad<ProfileData[]>
- [ ] compare() returns ProfilerMonad<CompareResult>
- [ ] merge() returns ProfilerMonad<MergeResult>
- [ ] validate() returns ProfilerMonad<ValidationResult>
- [ ] All operations handle errors with Result type

**Testing:**

- [ ] 100% coverage on error paths
- [ ] Integration tests for error propagation
- [ ] Recovery strategy tests

**Migration:**

- [ ] Commands updated to use new operations
- [ ] Backward compatible
- [ ] No regression in functionality

### Error Catalog Entries

- [ ] All 20+ errors documented

---

## Issue #4: Metadata Cache (with Error Handling)

**Labels:** `enhancement`, `performance`, `v2.2.0`, `edd-feature`
**Priority:** High
**Points:** 3

### User Story

As a developer, I want cached metadata
So that repeated retrievals are faster

### Error-Driven Approach

#### Errors to Handle

1. **CacheCorruptedError** - Cache file corrupted
2. **CacheWriteError** - Cannot write cache
3. **CacheReadError** - Cannot read cache
4. **CacheDiskFullError** - No space for cache

#### Error Tests (Write FIRST)

```typescript
describe('MetadataCache Errors', () => {
  it('handles corrupted cache gracefully', async () => {
    fs.writeFileSync(cachePath, 'invalid json{{{');

    const result = await cache.get('org', 'ApexClass', 'v60.0');

    // Should return null and log warning, not crash
    expect(result).toBeNull();
    expect(logger.warnings).toContain('Cache corrupted');
  });

  it('continues without cache on write error', async () => {
    mockFs.writeFile.mockRejectedValue(new Error('ENOSPC'));

    await cache.set('org', 'ApexClass', 'v60.0', ['TestClass']);

    // Should warn but not fail
    expect(logger.warnings).toContain('Failed to write cache');
  });

  // ... more error tests
});
```

### Implementation Steps (EDD Order)

1. **Define Cache Error Types**
2. **Write Error Tests** (must fail)
3. **Implement Cache** to handle errors gracefully
4. **Write Happy Path Tests**
5. **Integrate into retrieve operation**

### Acceptance Criteria

- [ ] All cache errors defined
- [ ] Error tests pass
- [ ] Cache failures don't break retrieval (graceful degradation)
- [ ] `--no-cache` flag works
- [ ] `--clear-cache` flag works
- [ ] Performance improvement: 5s saved

### Error Recovery Strategy

- **CacheCorruptedError**: Auto-delete corrupted cache, fetch fresh
- **CacheWriteError**: Log warning, continue without cache
- **CacheDiskFullError**: Clear old cache entries, retry

### Error Catalog Entry

- [ ] Added to ERROR_CATALOG.md

---

## Issue #5: Incremental Retrieve (with Error Handling)

**Labels:** `enhancement`, `performance`, `v2.2.0`, `edd-feature`
**Priority:** High
**Points:** 5

### User Story

As a developer, I want incremental retrieval
So that I only fetch changed metadata

### Error-Driven Approach

#### Errors to Handle

1. **LocalMetadataReadError** - Cannot read local files
2. **MetadataComparisonError** - Error comparing metadata
3. **IncrementalRetrieveError** - Incremental logic fails

#### Error Tests (Write FIRST)

```typescript
describe('Incremental Retrieve Errors', () => {
  it('falls back to full retrieve on comparison error', async () => {
    mockFs.readdir.mockRejectedValue(new Error('ENOENT'));

    const result = await retrieveIncremental({ org, profileNames: ['Admin'] }).run();

    // Should fall back to full retrieve
    expect(result.isSuccess()).toBe(true);
    expect(logger.warnings).toContain('Falling back to full retrieve');
  });

  // ... more error tests
});
```

### Implementation Steps (EDD Order)

1. **Define Incremental Errors**
2. **Write Error Tests**
3. **Implement with Fallback Strategy**
4. **Write Happy Path Tests**

### Acceptance Criteria

- [ ] All errors defined
- [ ] Error tests pass
- [ ] Falls back to full retrieve on any error
- [ ] `--force` flag bypasses incremental
- [ ] `--dry-run` shows what would be retrieved
- [ ] Performance: 10x faster when no changes

### Error Recovery Strategy

- **Any Error**: Fall back to full retrieve (safe default)

### Error Catalog Entry

- [ ] Added to ERROR_CATALOG.md

---

## Issue #6: Multi-Source Compare (with Error Handling)

**Labels:** `enhancement`, `feature`, `v2.2.0`, `edd-feature`
**Priority:** Critical
**Points:** 8

### User Story

As a DevOps engineer, I want multi-environment comparison
So that I can detect drift across orgs

### Error-Driven Approach

#### Errors to Handle

1. **MultipleEnvironmentFailureError** - Multiple orgs failed
2. **PartialRetrievalError** - Some orgs succeeded, some failed
3. **MatrixBuildError** - Error building comparison matrix
4. **ParallelExecutionError** - Parallel retrieval failed

#### Error Tests (Write FIRST)

```typescript
describe('Multi-Source Compare Errors', () => {
  it('shows partial results when some orgs fail', async () => {
    mockOrgs.qa.retrieve.mockResolvedValue(profile);
    mockOrgs.uat.retrieve.mockRejectedValue(new Error('Network error'));
    mockOrgs.prod.retrieve.mockResolvedValue(profile);

    const result = await compareMultiSource({
      profileName: 'Admin',
      sources: ['qa', 'uat', 'prod'],
    }).run();

    // Should succeed with partial results
    expect(result.isSuccess()).toBe(true);
    expect(result.value.environments).toEqual(['qa', 'prod']);
    expect(result.value.failures).toContain('uat');
    expect(logger.warnings).toContain('Failed to retrieve from uat');
  });

  it('fails when ALL orgs fail', async () => {
    mockOrgs.qa.retrieve.mockRejectedValue(new Error('Auth failed'));
    mockOrgs.uat.retrieve.mockRejectedValue(new Error('Network error'));

    const result = await compareMultiSource({
      profileName: 'Admin',
      sources: ['qa', 'uat'],
    }).run();

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(MultipleEnvironmentFailureError);
  });

  // ... more error tests
});
```

### Implementation Steps (EDD Order)

1. **Define All Multi-Source Errors** (1 day)
2. **Write ALL Error Tests** (2 days)
   - Partial failure tests
   - Total failure tests
   - Timeout tests
   - Rate limit tests
3. **Implement Parallel Retrieval with Error Handling** (3 days)
4. **Write Happy Path Tests** (1 day)
5. **Integration Tests** (1 day)

### Acceptance Criteria

**Error Handling:**

- [ ] All multi-source errors defined
- [ ] Partial success handled (show available results)
- [ ] Total failure handled (clear error message)
- [ ] Individual org errors captured and reported
- [ ] Error tests pass

**Feature:**

- [ ] Compare 2+ environments
- [ ] Parallel retrieval (Promise.all)
- [ ] Progress indicators
- [ ] Matrix output (table/JSON/HTML)
- [ ] `--max-parallel` flag works

**Performance:**

- [ ] 3 orgs: ~35s (vs 90s sequential)

### Error Recovery Strategy

- **Partial Failure**: Show results for successful orgs, warn about failures
- **Total Failure**: Fail with aggregated error message

### Error Catalog Entry

- [ ] Added to ERROR_CATALOG.md

---

## Issue #7: Profile Merge (with Error Handling)

**Labels:** `enhancement`, `feature`, `v2.2.0`, `edd-feature`
**Priority:** Critical
**Points:** 8

### User Story

As a developer, I want to merge org changes to local
So that I don't manually edit XML

### Error-Driven Approach

#### Errors to Handle

1. **MergeConflictError** - Manual changes conflict
2. **BackupFailedError** - Cannot create backup
3. **InvalidMergeStrategyError** - Invalid strategy
4. **MergeValidationError** - Merged profile invalid
5. **NoChangesToMergeError** - Nothing to merge
6. **RollbackError** - Rollback failed

#### Error Tests (Write FIRST)

```typescript
describe('Merge Errors', () => {
  it('detects merge conflicts', async () => {
    const local = createProfile({ viewSetup: true, customPerm: true });
    const org = createProfile({ viewSetup: false, customPerm: false });
    const userModified = ['customPerm']; // User changed locally

    const result = await merge({
      source: org,
      target: local,
      strategy: 'all',
      userModified,
    }).run();

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(MergeConflictError);
    expect(result.error.conflicts).toContain('customPerm');
  });

  it('fails if backup creation fails', async () => {
    mockFs.copyFile.mockRejectedValue(new Error('ENOSPC'));

    const result = await merge({
      source: org,
      target: local,
      strategy: 'all',
    }).run();

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(BackupFailedError);
    // Should NOT modify original file
    expect(fs.readFileSync('local-profile.xml')).toBe(originalContent);
  });

  it('auto-rolls back on validation error', async () => {
    mockValidator.validate.mockRejectedValue(new Error('Invalid XML'));

    const result = await merge({
      source: org,
      target: local,
      strategy: 'all',
    }).run();

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(MergeValidationError);
    // Should restore from backup
    expect(fs.readFileSync('local-profile.xml')).toBe(originalContent);
  });

  // ... more error tests
});
```

### Implementation Steps (EDD Order)

1. **Define ALL Merge Errors** (1 day)
2. **Write ALL Error Tests** (2 days)
   - Conflict detection tests
   - Backup failure tests
   - Validation failure tests
   - Rollback tests
3. **Implement Merge with Transactions** (3 days)
   - Backup → Merge → Validate → Commit or Rollback
4. **Write Happy Path Tests** (1 day)
5. **Integration Tests** (1 day)

### Acceptance Criteria

**Error Handling:**

- [ ] All merge errors defined
- [ ] Conflict detection works
- [ ] Backup mandatory (fails if backup fails)
- [ ] Auto-rollback on validation error
- [ ] Error messages show conflicts clearly
- [ ] Error tests pass

**Feature:**

- [ ] `--strategy all` works
- [ ] `--strategy selective` works
- [ ] `--dry-run` shows preview
- [ ] `--undo` restores from backup
- [ ] Transactional (atomic operation)

### Error Recovery Strategy

- **MergeConflictError**: Require user resolution or --force
- **BackupFailedError**: Abort merge (safety first)
- **MergeValidationError**: Auto-rollback from backup

### Error Catalog Entry

- [ ] Added to ERROR_CATALOG.md

---

## Issue #8: Profile Validation (with Error Handling)

**Labels:** `enhancement`, `feature`, `v2.2.0`, `edd-feature`
**Priority:** High
**Points:** 5

### User Story

As a developer, I want profile validation
So that I catch deployment errors early

### Error-Driven Approach

#### Errors to Handle

1. **MissingMetadataReferenceError** - References non-existent metadata
2. **DuplicateEntryError** - Duplicate permissions
3. **InvalidPermissionError** - Invalid permission value
4. **SchemaValidationError** - Doesn't match Salesforce schema

#### Error Tests (Write FIRST)

```typescript
describe('Validation Errors', () => {
  it('detects missing metadata references', async () => {
    const profile = createProfile({
      classAccesses: ['NonExistentClass'],
    });

    const result = await validate(profile, { org }).run();

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(MissingMetadataReferenceError);
    expect(result.error.missingMetadata).toContain('NonExistentClass');
  });

  // ... more error tests
});
```

### Implementation Steps (EDD Order)

1. **Define Validation Errors** (1 day)
2. **Write Error Tests** (2 days)
3. **Implement Validators** (2 days)
4. **Write Happy Path Tests** (1 day)

### Acceptance Criteria

- [ ] All validation errors defined
- [ ] Error tests pass
- [ ] Exit code 0 (valid) / 1 (invalid)
- [ ] `--strict` mode (warnings = errors)
- [ ] JSON output for CI/CD

### Error Catalog Entry

- [ ] Added to ERROR_CATALOG.md

---

## EDD Compliance Checklist

For ALL issues:

- [ ] Errors defined in ERROR_CATALOG.md FIRST
- [ ] Error classes created BEFORE implementation
- [ ] Error tests written BEFORE implementation
- [ ] Error tests run and FAIL initially
- [ ] Implementation makes error tests pass
- [ ] Happy path tests written AFTER error tests
- [ ] 100% coverage on error paths
- [ ] Error messages are actionable
- [ ] Recovery strategies documented
- [ ] Exit codes correct

---

## Summary

**v2.2.0 Total:** 45 points

**EDD Stats:**

- Total Errors Defined: 30+
- Error Tests: 50+
- Error-First Ratio: 100%

**Timeline:**

- Week 1-2: Define ALL errors, write ALL error tests
- Week 3-4: Implement features to pass error tests
- Week 5: Integration testing, documentation


