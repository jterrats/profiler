# GitHub Issues for v2.2.0 - Error-Driven Development

> Copy each issue below directly into GitHub Issues

---

## Issue #1: Implement Result Monad

**Labels:** `enhancement`, `architecture`, `v2.2.0`, `edd-foundation`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** Critical
**Story Points:** 3

### Description

Implement a Result monad (Either pattern) for type-safe error handling without exceptions. This is the foundation for all Error-Driven Development in the profiler plugin.

### User Story
As a developer, I want type-safe error handling with Result monad
So that errors are explicit and compiler-enforced

### Error-Driven Approach

#### Errors to Handle
1. **UnwrapError** - Attempting to unwrap a Failure
2. **TypeGuardError** - Incorrect type narrowing

### Implementation Checklist

#### Step 1: Define Errors (EDD Required)
- [ ] Add UnwrapError to `ERROR_CATALOG.md`
- [ ] Add TypeGuardError to `ERROR_CATALOG.md`
- [ ] Create `src/core/errors/monad-errors.ts`
- [ ] Define error classes with actionable messages

#### Step 2: Write Error Tests (Must Fail Initially)
- [ ] Create `test/errors/result-monad.errors.test.ts`
- [ ] Test: UnwrapError thrown when unwrapping Failure
- [ ] Test: Type guards work correctly
- [ ] Test: isSuccess() narrows type to Success
- [ ] Test: isFailure() narrows type to Failure
- [ ] Run tests → verify they FAIL

#### Step 3: Implement Result Type
- [ ] Create `src/core/monad/result.ts`
- [ ] Implement `Result<T, E>` discriminated union
- [ ] Implement `Success<T>` class with `.isSuccess()` guard
- [ ] Implement `Failure<E>` class with `.isFailure()` guard
- [ ] Implement `success()` constructor
- [ ] Implement `failure()` constructor
- [ ] Run error tests → verify they PASS

#### Step 4: Write Happy Path Tests
- [ ] Test: success() creates Success instance
- [ ] Test: failure() creates Failure instance
- [ ] Test: Type inference works correctly
- [ ] Verify 100% coverage

#### Step 5: Documentation
- [ ] Add JSDoc comments
- [ ] Add usage examples
- [ ] Update DEVELOPMENT.md

### Acceptance Criteria
- [ ] UnwrapError defined and tested
- [ ] Result<T, E> type with discriminated union
- [ ] Type guards work correctly (TypeScript enforces)
- [ ] Error tests pass BEFORE implementation
- [ ] 100% test coverage on error paths
- [ ] Documentation with examples

### Example Usage
```typescript
const result: Result<number> = success(42);

if (result.isSuccess()) {
  console.log(result.value); // TypeScript knows this is number
} else {
  console.error(result.error); // TypeScript knows this is Error
}
```

### Dependencies
None (foundation)

### Related Issues
- #2 (ProfilerMonad depends on this)
- #3 (All operations use Result)

---

## Issue #2: Implement ProfilerMonad

**Labels:** `enhancement`, `architecture`, `v2.2.0`, `edd-foundation`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** Critical
**Story Points:** 5

### Description

Implement ProfilerMonad for lazy IO operations with monadic composition. Enables functional, composable pipelines with automatic error propagation.

### User Story
As a developer, I want composable monadic operations
So that I can build error-safe pipelines with functional composition

### Error-Driven Approach

#### Errors to Handle
1. **ComputationError** - Error during monad execution
2. **FlatMapError** - Error in flatMap transformation
3. **RecoveryError** - Error during recovery function
4. **ChainError** - Error propagating through chain

### Implementation Checklist

#### Step 1: Define Errors
- [ ] Add 4 errors to `ERROR_CATALOG.md`
- [ ] Create error classes in `src/core/errors/monad-errors.ts`
- [ ] Document recovery strategies

#### Step 2: Write Error Tests (Must Fail)
- [ ] Create `test/errors/profiler-monad.errors.test.ts`
- [ ] Test: ComputationError captured in run()
- [ ] Test: FlatMapError captured in flatMap()
- [ ] Test: RecoveryError captured in recover()
- [ ] Test: Errors propagate through chain
- [ ] Test: Lazy evaluation (no execution until run())
- [ ] Test: Error short-circuits remaining operations
- [ ] Run tests → verify they FAIL

#### Step 3: Implement ProfilerMonad
- [ ] Create `src/core/monad/profiler-monad.ts`
- [ ] Implement `map<U>(fn: (value: T) => U): ProfilerMonad<U>`
- [ ] Implement `flatMap<U>(fn: (value: T) => ProfilerMonad<U>): ProfilerMonad<U>`
- [ ] Implement `chain<U>()` alias for flatMap
- [ ] Implement `tap(fn: (value: T) => void): ProfilerMonad<T>`
- [ ] Implement `recover(fn: (error: Error) => T): ProfilerMonad<T>`
- [ ] Implement `run(): Promise<Result<T>>`
- [ ] Implement `unsafeRun(): Promise<T>`
- [ ] Implement helper: `profilerMonad<T>(computation)`
- [ ] Implement helper: `pure<T>(value)`
- [ ] Implement helper: `liftAsync<T>(fn)`
- [ ] Run error tests → verify they PASS

#### Step 4: Write Happy Path Tests
- [ ] Test: map transforms value
- [ ] Test: flatMap chains operations
- [ ] Test: chain is alias for flatMap
- [ ] Test: tap allows side effects
- [ ] Test: pure lifts value
- [ ] Test: liftAsync lifts async function
- [ ] Test: Lazy evaluation
- [ ] Test: Type inference works
- [ ] Verify 100% coverage

#### Step 5: Documentation
- [ ] Add JSDoc comments
- [ ] Create examples in docs
- [ ] Update DEVELOPMENT.md

### Acceptance Criteria
- [ ] All 4 error types defined
- [ ] Error tests written FIRST
- [ ] All error tests pass
- [ ] Lazy evaluation works (only executes on `.run()`)
- [ ] Type inference works correctly
- [ ] Happy path tests pass
- [ ] 100% coverage
- [ ] Documentation includes error scenarios

### Example Usage
```typescript
const pipeline = pure(5)
  .map(x => x * 2)
  .flatMap(x => liftAsync(() => Promise.resolve(x + 1)))
  .tap(x => console.log('Value:', x))
  .recover(error => {
    console.error('Recovered:', error);
    return 0;
  });

const result = await pipeline.run();
// result: Success(11)
```

### Dependencies
- #1 (Result Monad)

### Related Issues
- #6, #7, #8 (All operations use ProfilerMonad)

---

## Issue #3: Implement Metadata Cache

**Labels:** `enhancement`, `performance`, `v2.2.0`, `edd-feature`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** High
**Story Points:** 3

### Description

Implement filesystem cache for `listMetadata` results to avoid redundant API calls. Cache expires after 1 hour (configurable).

### User Story
As a developer, I want cached metadata listings
So that repeated retrievals are faster

### Error-Driven Approach

#### Errors to Handle
1. **CacheCorruptedError** - Cache file corrupted (recoverable)
2. **CacheWriteError** - Cannot write cache (recoverable)
3. **CacheReadError** - Cannot read cache (recoverable)
4. **CacheDiskFullError** - No space for cache (recoverable)

### Implementation Checklist

#### Step 1: Define Errors
- [ ] Add 4 errors to `ERROR_CATALOG.md`
- [ ] Create `src/core/errors/cache-errors.ts`
- [ ] Document graceful degradation strategies

#### Step 2: Write Error Tests
- [ ] Create `test/errors/cache.errors.test.ts`
- [ ] Test: Corrupted cache returns null (not crash)
- [ ] Test: Write error logs warning, continues
- [ ] Test: Read error returns null
- [ ] Test: Disk full clears old entries
- [ ] Test: All errors are non-fatal
- [ ] Run tests → verify they FAIL

#### Step 3: Implement Cache
- [ ] Create `src/core/cache/metadata-cache.ts`
- [ ] Implement constructor with TTL
- [ ] Implement `get(orgId, metadataType, apiVersion)`
- [ ] Implement `set(orgId, metadataType, apiVersion, members)`
- [ ] Implement `clear(orgId?)`
- [ ] Implement `getCacheKey()` with MD5 hash
- [ ] Store in `~/.sf/profiler-cache/`
- [ ] Check TTL on read
- [ ] Handle all errors gracefully
- [ ] Run error tests → verify they PASS

#### Step 4: Integrate with Retrieve
- [ ] Update `src/core/operations/retrieve.ts`
- [ ] Try cache before API call
- [ ] Store results in cache after API call
- [ ] Add `--no-cache` flag
- [ ] Add `--clear-cache` flag

#### Step 5: Write Happy Path Tests
- [ ] Test: Cache hit returns cached data
- [ ] Test: Cache miss fetches from API
- [ ] Test: Cache expires after TTL
- [ ] Test: Cache stores data correctly
- [ ] Test: Clear cache works
- [ ] Verify 100% coverage

#### Step 6: Performance Testing
- [ ] Benchmark: First retrieve (no cache)
- [ ] Benchmark: Second retrieve (with cache)
- [ ] Verify 5s improvement

### Acceptance Criteria
- [ ] All 4 cache errors defined
- [ ] Error tests pass
- [ ] Cache failures don't break retrieval (graceful degradation)
- [ ] `--no-cache` flag works
- [ ] `--clear-cache` flag works
- [ ] Performance improvement: 5s saved on listMetadata
- [ ] 100% coverage

### Error Recovery Strategy
- **CacheCorruptedError**: Auto-delete, fetch fresh
- **CacheWriteError**: Log warning, continue without cache
- **CacheReadError**: Log warning, fetch from API
- **CacheDiskFullError**: Clear old cache entries, retry

### Performance Target
- First retrieve: 30s (no change)
- Cached retrieve: ~25s (5s improvement)

### Dependencies
None

### Related Issues
- #5 (Incremental retrieve also improves performance)

---

## Issue #4: Implement Incremental Retrieve

**Labels:** `enhancement`, `performance`, `v2.2.0`, `edd-feature`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** High
**Story Points:** 5

### Description

Compare local metadata with org metadata before retrieving. Skip retrieve if nothing changed, or retrieve only changed items.

### User Story
As a developer, I want incremental retrieval
So that I only fetch changed metadata

### Error-Driven Approach

#### Errors to Handle
1. **LocalMetadataReadError** - Cannot read local files
2. **MetadataComparisonError** - Error comparing metadata
3. **IncrementalRetrieveError** - Incremental logic fails

### Implementation Checklist

#### Step 1: Define Errors
- [ ] Add 3 errors to `ERROR_CATALOG.md`
- [ ] Create `src/core/errors/incremental-errors.ts`
- [ ] Document fallback strategy

#### Step 2: Write Error Tests
- [ ] Create `test/errors/incremental.errors.test.ts`
- [ ] Test: Local read error falls back to full retrieve
- [ ] Test: Comparison error falls back to full retrieve
- [ ] Test: Any error logs warning but continues
- [ ] Test: `--force` bypasses incremental check
- [ ] Run tests → verify they FAIL

#### Step 3: Implement Incremental Logic
- [ ] Create `src/core/operations/incremental.ts`
- [ ] Implement `compareLocalVsOrg()`
- [ ] Implement `shouldRetrieve()`
- [ ] Implement `getChangedItems()`
- [ ] Handle all errors → fallback to full retrieve
- [ ] Run error tests → verify they PASS

#### Step 4: Integrate with Retrieve
- [ ] Update retrieve operation
- [ ] Add `--incremental` flag
- [ ] Add `--dry-run` flag
- [ ] Add `--force` flag
- [ ] Log what will be retrieved/skipped

#### Step 5: Write Happy Path Tests
- [ ] Test: No changes → skip retrieve
- [ ] Test: Few changes → retrieve only changed
- [ ] Test: Many changes → full retrieve
- [ ] Test: `--force` bypasses check
- [ ] Test: `--dry-run` shows preview
- [ ] Verify 100% coverage

#### Step 6: Performance Testing
- [ ] Benchmark: No changes scenario
- [ ] Benchmark: Few changes scenario
- [ ] Verify 10x improvement when nothing changed

### Acceptance Criteria
- [ ] All 3 errors defined
- [ ] Error tests pass
- [ ] Falls back to full retrieve on any error
- [ ] `--incremental` flag works
- [ ] `--force` flag bypasses incremental
- [ ] `--dry-run` shows what would be retrieved
- [ ] Performance: 10x faster when no changes
- [ ] 100% coverage

### Error Recovery Strategy
- **Any Error**: Fall back to full retrieve (safe default)

### Performance Target
- No changes: ~3s (vs 30s) = **10x faster!**
- Few changes: ~12s (vs 30s) = **2.5x faster**
- Many changes: ~30s (same as before)

### Dependencies
- #3 (Cache improves incremental performance)

### Related Issues
- #3 (Cache + Incremental = maximum speed)

---

## Issue #5: Setup Error Testing Infrastructure

**Labels:** `testing`, `infrastructure`, `v2.2.0`, `edd-foundation`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** High
**Story Points:** 4

### Description

Setup testing infrastructure specifically for Error-Driven Development. Create directory structure, naming conventions, and CI integration for error tests.

### User Story
As a developer, I want dedicated error testing infrastructure
So that error tests are first-class citizens

### Implementation Checklist

#### Step 1: Directory Structure
- [ ] Create `test/errors/` directory
- [ ] Create `test/unit/` directory
- [ ] Create `test/integration/` directory
- [ ] Update `.gitignore` for test artifacts

#### Step 2: Naming Conventions
- [ ] Document `*.errors.test.ts` for error tests
- [ ] Document `*.test.ts` for happy path tests
- [ ] Update DEVELOPMENT.md with conventions

#### Step 3: Test Scripts
- [ ] Configure `yarn test:errors` in package.json ✅
- [ ] Configure `yarn test:unit` in package.json ✅
- [ ] Configure `yarn test:integration` in package.json ✅
- [ ] Configure `yarn test:e2e` in package.json ✅
- [ ] Update wireit configs ✅

#### Step 4: CI Integration
- [ ] Create `.github/workflows/edd-ci.yml` ✅
- [ ] Configure Tier 1: Lint + Error tests (always)
- [ ] Configure Tier 2: Unit/Integration (PRs only)
- [ ] Configure Tier 3: E2E (main merge only)
- [ ] Add concurrency controls
- [ ] Add timeout limits

#### Step 5: Test Helpers
- [ ] Create `test/helpers/error-matchers.ts`
- [ ] Create `test/helpers/mock-org.ts`
- [ ] Create `test/helpers/test-fixtures.ts`

#### Step 6: Documentation
- [ ] Create `docs/development/ERROR_TESTING_GUIDE.md`
- [ ] Add examples of error tests
- [ ] Document testing philosophy
- [ ] Update CONTRIBUTING.md

### Acceptance Criteria
- [ ] Directory structure created
- [ ] Naming conventions documented
- [ ] Test scripts configured
- [ ] CI runs error tests first
- [ ] Test helpers available
- [ ] Documentation complete

### CI Performance Target
- Tier 1 (error tests): 2-3 min
- Tier 2 (full tests): 5-7 min
- Tier 3 (E2E): 10-15 min
- Total savings: 75% reduction in average CI time

### Dependencies
- #1, #2 (Need Result/ProfilerMonad for error tests)

### Related Issues
All issues depend on this infrastructure

---

## Issue #6: Refactor Retrieve Operation (Monadic + EDD)

**Labels:** `refactor`, `architecture`, `v2.2.0`, `edd-migration`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** Critical
**Story Points:** 8

### Description

Extract retrieve logic from command into pure monadic function with comprehensive error handling. This is the largest refactoring in v2.2.0.

### User Story
As a developer, I want retrieve() as a pure monadic function
So that I can compose it with other operations

### Error-Driven Approach (8 Errors!)

#### Errors to Handle
1. **ProfileNotFoundError** - Profile doesn't exist
2. **OrgNotAuthenticatedError** - Not logged into org
3. **MetadataApiError** - Salesforce API failure
4. **RetrieveTimeoutError** - Operation timed out
5. **InsufficientPermissionsError** - User lacks permissions
6. **InvalidProjectError** - Not a valid SF project
7. **DiskSpaceError** - Not enough disk space
8. **ManagedPackageError** - Managed package issue

### Implementation Checklist

#### Step 1: Define ALL Errors (Critical!)
- [ ] All 8 errors already in `ERROR_CATALOG.md` ✅
- [ ] Create `src/core/errors/retrieve-errors.ts`
- [ ] Define error hierarchy
- [ ] Add actionable messages for each

#### Step 2: Write ALL Error Tests (Must Fail)
- [ ] Create `test/errors/retrieve.errors.test.ts`
- [ ] Test #1: ProfileNotFoundError
- [ ] Test #2: OrgNotAuthenticatedError
- [ ] Test #3: MetadataApiError
- [ ] Test #4: RetrieveTimeoutError
- [ ] Test #5: InsufficientPermissionsError
- [ ] Test #6: InvalidProjectError
- [ ] Test #7: DiskSpaceError
- [ ] Test #8: ManagedPackageError
- [ ] Run tests → verify ALL FAIL

#### Step 3: Create Core Operation
- [ ] Create `src/core/operations/retrieve.ts`
- [ ] Define `RetrieveOptions` interface
- [ ] Define `RetrieveResult` interface
- [ ] Implement `retrieve(options): ProfilerMonad<RetrieveResult>`
- [ ] Handle each error case explicitly
- [ ] Run error tests → verify they PASS

#### Step 4: Write Happy Path Tests
- [ ] Test: Retrieve single profile
- [ ] Test: Retrieve multiple profiles
- [ ] Test: Retrieve with dependencies
- [ ] Test: Retrieve with --all-fields
- [ ] Test: Retrieve with --exclude-managed
- [ ] Test: Retrieve from project
- [ ] Verify 100% coverage

#### Step 5: Update Command
- [ ] Update `src/commands/profiler/retrieve.ts`
- [ ] Use new retrieve() operation
- [ ] Keep command as thin wrapper
- [ ] Verify backward compatibility
- [ ] Test in real SF org

#### Step 6: Integration Tests
- [ ] Test: Command still works
- [ ] Test: Flags still work
- [ ] Test: Output format unchanged
- [ ] Test: Error messages displayed correctly

### Acceptance Criteria

**Error Handling:**
- [ ] All 8 errors defined in ERROR_CATALOG.md ✅
- [ ] All error classes created
- [ ] All error tests written BEFORE implementation
- [ ] All error tests pass
- [ ] Error messages are actionable
- [ ] Exit codes correct

**Operation:**
- [ ] retrieve() returns ProfilerMonad<RetrieveResult>
- [ ] Pure function (no side effects except IO)
- [ ] Composable with other operations
- [ ] Type-safe

**Migration:**
- [ ] Command updated to use new operation
- [ ] Backward compatible
- [ ] No regression in functionality
- [ ] All existing tests pass

**Coverage:**
- [ ] 100% coverage on error paths
- [ ] 90%+ coverage on happy paths

### Dependencies
- #1 (Result Monad)
- #2 (ProfilerMonad)
- #3 (Metadata Cache - optional integration)
- #4 (Incremental - optional integration)

### Related Issues
- #8 (Multi-source compare uses retrieve)

---

## Issue #7: Refactor Compare Operation (Monadic + EDD)

**Labels:** `refactor`, `architecture`, `v2.2.0`, `edd-migration`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** Critical
**Story Points:** 5

### Description

Extract compare logic from command into pure monadic function with comprehensive error handling.

### User Story
As a developer, I want compare() as a pure monadic function
So that I can compose it with retrieve and merge operations

### Error-Driven Approach (4 Errors)

#### Errors to Handle
1. **NoLocalProfileError** - Local profile doesn't exist
2. **NoOrgProfileError** - Org profile doesn't exist
3. **InvalidXmlError** - Profile XML is malformed
4. **ComparisonTimeoutError** - Comparison takes too long

### Implementation Checklist

#### Step 1: Define Errors
- [ ] All 4 errors already in `ERROR_CATALOG.md` ✅
- [ ] Create `src/core/errors/compare-errors.ts`
- [ ] Add recovery strategies

#### Step 2: Write Error Tests
- [ ] Create `test/errors/compare.errors.test.ts`
- [ ] Test: NoLocalProfileError when file missing
- [ ] Test: NoOrgProfileError when profile missing
- [ ] Test: InvalidXmlError on malformed XML
- [ ] Test: ComparisonTimeoutError on large profiles
- [ ] Run tests → verify they FAIL

#### Step 3: Create Core Operation
- [ ] Create `src/core/operations/compare.ts`
- [ ] Define `CompareOptions` interface
- [ ] Define `CompareResult` interface
- [ ] Implement `compare(profiles, options): ProfilerMonad<CompareResult>`
- [ ] Handle each error case
- [ ] Run error tests → verify they PASS

#### Step 4: Write Happy Path Tests
- [ ] Test: Compare local vs org
- [ ] Test: Detect added permissions
- [ ] Test: Detect removed permissions
- [ ] Test: Detect modified permissions
- [ ] Test: No differences case
- [ ] Verify 100% coverage

#### Step 5: Update Command
- [ ] Update `src/commands/profiler/compare.ts`
- [ ] Use new compare() operation
- [ ] Keep command as thin wrapper
- [ ] Verify backward compatibility

#### Step 6: Integration Tests
- [ ] Test: Command still works
- [ ] Test: Output format unchanged
- [ ] Test: Error display correct

### Acceptance Criteria
- [ ] All 4 errors defined ✅
- [ ] Error tests written first
- [ ] All error tests pass
- [ ] compare() returns ProfilerMonad<CompareResult>
- [ ] Command updated
- [ ] Backward compatible
- [ ] 100% error coverage

### Dependencies
- #1 (Result Monad)
- #2 (ProfilerMonad)
- #6 (Uses retrieve operation)

### Related Issues
- #8 (Multi-source compare extends this)
- #10 (Merge uses compare results)

---

## Issue #8: Multi-Environment Profile Comparison

**Labels:** `enhancement`, `feature`, `v2.2.0`, `edd-feature`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** Critical (Killer Feature!)
**Story Points:** 8

### Description

Enable comparing a profile across 2+ environments simultaneously with parallel retrieval. This is a UNIQUE feature no other Salesforce CLI plugin has.

### User Story
As a DevOps engineer, I want multi-environment comparison
So that I can detect drift across qa, uat, and production

### Error-Driven Approach (4 Errors)

#### Errors to Handle
1. **MultipleEnvironmentFailureError** - All orgs failed
2. **PartialRetrievalError** - Some orgs succeeded, some failed
3. **MatrixBuildError** - Error building comparison matrix
4. **ParallelExecutionError** - Parallel retrieval failed

### Implementation Checklist

#### Step 1: Define Errors
- [ ] All 4 errors already in `ERROR_CATALOG.md` ✅
- [ ] Create `src/core/errors/multi-source-errors.ts`
- [ ] Document partial success strategy

#### Step 2: Write Error Tests
- [ ] Create `test/errors/multi-source.errors.test.ts`
- [ ] Test: All orgs fail → MultipleEnvironmentFailureError
- [ ] Test: Some succeed → Show partial results + warnings
- [ ] Test: Matrix build fails → Clear error
- [ ] Test: Parallel execution error → Retry or fail gracefully
- [ ] Run tests → verify they FAIL

#### Step 3: Implement Parallel Retrieval
- [ ] Create `src/core/operations/multi-source-compare.ts`
- [ ] Define `MultiSourceCompareOptions` interface
- [ ] Define `MultiSourceCompareResult` interface
- [ ] Implement parallel retrieval with `Promise.all()`
- [ ] Set max concurrency to 5
- [ ] Handle partial failures
- [ ] Aggregate results
- [ ] Run error tests → verify they PASS

#### Step 4: Implement Matrix Builder
- [ ] Create `src/core/utils/comparison-matrix.ts`
- [ ] Build N×M matrix (permissions × environments)
- [ ] Detect drift (values differ across envs)
- [ ] Generate table output
- [ ] Generate JSON output
- [ ] Generate HTML output

#### Step 5: Add Command/Flags
- [ ] Update `src/commands/profiler/compare.ts`
- [ ] Add `--sources` flag for multi-org
- [ ] Add `--max-parallel` flag
- [ ] Add `--format` flag (table/json/html)
- [ ] Add progress indicators

#### Step 6: Write Happy Path Tests
- [ ] Test: Compare 2 environments
- [ ] Test: Compare 3+ environments
- [ ] Test: Detect drift
- [ ] Test: No drift case
- [ ] Test: Table output
- [ ] Test: JSON output
- [ ] Verify 100% coverage

#### Step 7: Performance Testing
- [ ] Benchmark: 3 orgs sequentially (~90s)
- [ ] Benchmark: 3 orgs in parallel (~35s)
- [ ] Verify 3x speedup

### Acceptance Criteria

**Error Handling:**
- [ ] All 4 errors defined ✅
- [ ] Partial success handled (show available results)
- [ ] Total failure handled (clear error message)
- [ ] Individual org errors captured
- [ ] Error tests pass

**Feature:**
- [ ] Compare 2+ environments
- [ ] Parallel retrieval (Promise.all)
- [ ] Progress indicators during retrieval
- [ ] Matrix output (table/JSON/HTML)
- [ ] `--max-parallel` flag works
- [ ] Drift detection works

**Performance:**
- [ ] 3 orgs: ~35s (vs 90s sequential) = **3x faster**
- [ ] 5 orgs: ~40s (vs 150s sequential) = **4x faster**

### Error Recovery Strategy
- **Partial Failure**: Show results for successful orgs, warn about failures
- **Total Failure**: Fail with aggregated error message

### Example Usage
```bash
# Compare across environments
sf profiler compare --name Admin --sources qa,uat,prod

# JSON for CI/CD
sf profiler compare --name Admin --sources qa,uat,prod --json

# HTML report
sf profiler compare --name Admin --sources qa,uat,prod --format html --output report.html
```

### Dependencies
- #1, #2 (Monads)
- #6 (Retrieve operation)
- #7 (Compare operation)

### Related Issues
This is the FLAGSHIP FEATURE for v2.2.0! 🚀

---

## Issue #9: Create Pipeline DSL

**Labels:** `enhancement`, `dx`, `v2.2.0`, `edd-advanced`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** Medium
**Story Points:** 5

### Description

Create a fluent Domain-Specific Language (DSL) over ProfilerMonad for better developer experience.

### User Story
As a developer, I want a fluent pipeline API
So that I can compose operations intuitively

### Error-Driven Approach (2 Errors)

#### Errors to Handle
1. **PipelineStepFailedError** - A step in pipeline fails
2. **PipelineInterruptedError** - User cancels (Ctrl+C)

### Implementation Checklist

#### Step 1: Define Errors
- [ ] Add 2 errors to `ERROR_CATALOG.md`
- [ ] Create `src/core/errors/pipeline-errors.ts`

#### Step 2: Write Error Tests
- [ ] Create `test/errors/pipeline.errors.test.ts`
- [ ] Test: Step failure captured with context
- [ ] Test: Interruption handled gracefully
- [ ] Run tests → verify they FAIL

#### Step 3: Implement PipelineBuilder
- [ ] Create `src/core/dsl/pipeline-builder.ts`
- [ ] Implement fluent API methods
- [ ] Implement error propagation
- [ ] Run error tests → verify they PASS

#### Step 4: Write Happy Path Tests
- [ ] Test: retrieve().compare().execute()
- [ ] Test: Error handling in pipeline
- [ ] Test: Recovery in pipeline

#### Step 5: Documentation
- [ ] Add examples to docs
- [ ] Update README

### Acceptance Criteria
- [ ] Fluent API works
- [ ] Error propagation works
- [ ] Documentation complete

### Example Usage
```typescript
await pipeline({ org: 'qa', profileNames: ['Admin'] })
  .compare({ highlightDrift: true })
  .merge({ strategy: 'selective' })
  .validate()
  .run();
```

### Dependencies
- #1, #2 (Monads)
- #6, #7 (Operations)

---

## Issue #10: Implement Profile Merge Command

**Labels:** `enhancement`, `feature`, `v2.2.0`, `edd-feature`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** Critical
**Story Points:** 8

### Description

Implement merge command to bring org changes into local profiles. Completes the workflow: retrieve → compare → **merge**.

### User Story
As a developer, I want to merge org changes to local
So that I don't manually edit XML

### Error-Driven Approach (6 Errors!)

#### Errors to Handle
1. **MergeConflictError** - Manual changes conflict
2. **BackupFailedError** - Cannot create backup
3. **InvalidMergeStrategyError** - Invalid strategy
4. **MergeValidationError** - Merged profile invalid
5. **NoChangesToMergeError** - Nothing to merge
6. **RollbackError** - Rollback failed

### Implementation Checklist

#### Step 1: Define Errors
- [ ] All 6 errors already in `ERROR_CATALOG.md` ✅
- [ ] Create `src/core/errors/merge-errors.ts`
- [ ] Document transactional approach

#### Step 2: Write Error Tests
- [ ] Create `test/errors/merge.errors.test.ts`
- [ ] Test: Conflict detection
- [ ] Test: Backup failure prevents merge
- [ ] Test: Invalid strategy rejected
- [ ] Test: Validation error triggers rollback
- [ ] Test: No changes is success case
- [ ] Test: Rollback restores original
- [ ] Run tests → verify they FAIL

#### Step 3: Implement Merge Operation
- [ ] Create `src/core/operations/merge.ts`
- [ ] Implement transactional merge
- [ ] Implement conflict detection
- [ ] Implement backup/rollback
- [ ] Run error tests → verify they PASS

#### Step 4: Add Command
- [ ] Create `src/commands/profiler/merge.ts`
- [ ] Add `--strategy` flag (all/selective)
- [ ] Add `--dry-run` flag
- [ ] Add `--undo` flag
- [ ] Add `--force` flag

#### Step 5: Write Happy Path Tests
- [ ] Test: Merge all changes
- [ ] Test: Selective merge
- [ ] Test: Dry-run preview
- [ ] Test: Undo restores backup

### Acceptance Criteria
- [ ] All 6 errors defined ✅
- [ ] Transactional (atomic)
- [ ] Auto-rollback on error
- [ ] Backup mandatory
- [ ] All strategies work

### Dependencies
- #1, #2 (Monads)
- #7 (Compare operation)

---

## Issue #11: Implement Profile Validation

**Labels:** `enhancement`, `feature`, `v2.2.0`, `edd-feature`
**Milestone:** v2.2.0
**Assignees:** @jterrats
**Priority:** High
**Story Points:** 5

### Description

Validate profiles before deployment to catch errors early.

### User Story
As a developer, I want profile validation
So that I catch deployment errors before pushing

### Error-Driven Approach (4 Errors)

#### Errors to Handle
1. **MissingMetadataReferenceError** - References non-existent metadata
2. **DuplicateEntryError** - Duplicate permissions
3. **InvalidPermissionError** - Invalid permission value
4. **SchemaValidationError** - Doesn't match SF schema

### Implementation Checklist

#### Step 1: Define Errors
- [ ] All 4 errors already in `ERROR_CATALOG.md` ✅
- [ ] Create `src/core/errors/validation-errors.ts`

#### Step 2: Write Error Tests
- [ ] Create `test/errors/validation.errors.test.ts`
- [ ] Test: Missing metadata detected
- [ ] Test: Duplicates detected
- [ ] Test: Invalid values detected
- [ ] Test: Schema violations detected
- [ ] Run tests → verify they FAIL

#### Step 3: Implement Validators
- [ ] Create `src/core/operations/validate.ts`
- [ ] Implement reference checker
- [ ] Implement duplicate checker
- [ ] Implement value validator
- [ ] Implement schema validator
- [ ] Run error tests → verify they PASS

#### Step 4: Add Command
- [ ] Create `src/commands/profiler/validate.ts`
- [ ] Add `--strict` mode
- [ ] Exit code 0 (valid) / 1 (invalid)

#### Step 5: CI Integration
- [ ] Add to E2E tests
- [ ] Document CI usage

### Acceptance Criteria
- [ ] All 4 errors defined ✅
- [ ] All validators work
- [ ] Exit codes correct
- [ ] CI integration works

### Dependencies
- #1, #2 (Monads)

---

## Summary

**Total: 11 Issues, 58 Story Points**

**Sprint Breakdown:**
- Sprint 1-2 (Foundation): Issues #1-5 = 20 pts
- Sprint 3-4 (Core Ops): Issues #6-8 = 21 pts
- Sprint 5-6 (Advanced): Issues #9-11 = 17 pts

**All issues follow Error-Driven Development:**
- ✅ Errors defined in ERROR_CATALOG.md
- ✅ Error tests written FIRST
- ✅ Implementation follows
- ✅ Happy path tests last
- ✅ 100% error coverage required

**Ready to copy to GitHub Issues!** 🚀

