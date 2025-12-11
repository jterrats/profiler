# Error-Driven Development (EDD)

> **Philosophy**: Think about what can go wrong BEFORE thinking about what should go right.

## What is Error-Driven Development?

Error-Driven Development (EDD) is a software development methodology that prioritizes error handling and failure scenarios from the very beginning of the development process. It builds upon Test-Driven Development (TDD), Behavior-Driven Development (BDD), and Domain-Driven Design (DDD) principles, but with a critical focus: **errors first, features second**.

## Why EDD?

Traditional development often treats errors as an afterthought:

```typescript
// ❌ Traditional approach
function retrieveProfile(name: string) {
  // Implement happy path
  const profile = fetch(name);
  return profile;

  // TODO: Add error handling later (often forgotten)
}
```

EDD inverts this:

```typescript
// ✅ EDD approach
function retrieveProfile(name: string): Result<Profile, ProfileError> {
  // Define ALL possible errors FIRST
  if (!name) {
    return failure(new InvalidInputError('Profile name required'));
  }

  if (!isAuthenticated()) {
    return failure(new OrgNotAuthenticatedError('Org not authenticated'));
  }

  try {
    const profile = fetch(name);

    if (!profile) {
      return failure(new ProfileNotFoundError(name));
    }

    return success(profile);
  } catch (error) {
    return failure(new MetadataApiError(error));
  }
}
```

## Core Principles

### 1. **Define Errors Before Implementation**

Before writing ANY code, define:

- What can go wrong?
- What are ALL possible failure modes?
- How should each error be handled?
- What information does the user need?

**Example:**

```markdown
Feature: Retrieve Profile

Errors to handle:

1. Profile not found
2. Org not authenticated
3. Metadata API failure
4. Network timeout
5. Insufficient permissions
6. Invalid project structure
7. Disk space full
```

### 2. **Write Error Tests First**

Write tests for error cases BEFORE happy path:

```typescript
// Step 1: Write error tests (these MUST fail initially)
describe('retrieveProfile', () => {
  it('should fail when profile does not exist', async () => {
    const result = await retrieveProfile('NonExistent');

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(ProfileNotFoundError);
    expect(result.error.code).toBe('PROFILE_NOT_FOUND');
    expect(result.error.actions).toContain('Run sf profiler list');
  });

  it('should fail when org is not authenticated', async () => {
    const result = await retrieveProfile('Admin');

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(OrgNotAuthenticatedError);
    expect(result.error.exitCode).toBe(1);
  });

  it('should fail when metadata API returns error', async () => {
    // Mock API error
    mockMetadataApi.throwError('INVALID_SESSION_ID');

    const result = await retrieveProfile('Admin');

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(MetadataApiError);
    expect(result.error.recoverable).toBe(true);
  });

  // NOW write happy path test
  it('should retrieve profile successfully', async () => {
    const result = await retrieveProfile('Admin');

    expect(result.isSuccess()).toBe(true);
    expect(result.value.name).toBe('Admin');
  });
});
```

### 3. **Error Types are Part of Domain Model**

Errors are not just exceptions—they're part of your domain:

```typescript
// src/core/errors/retrieve-errors.ts

// Domain-specific error hierarchy
export abstract class RetrieveError extends ProfilerError {
  abstract readonly category: 'user' | 'system' | 'fatal';
}

export class ProfileNotFoundError extends RetrieveError {
  readonly category = 'user';
  readonly code = 'PROFILE_NOT_FOUND';

  constructor(profileName: string, orgAlias: string) {
    super(`Profile '${profileName}' not found in org '${orgAlias}'`, [
      `Run 'sf profiler list --target-org ${orgAlias}' to see available profiles`,
      'Check spelling of profile name (case-sensitive)',
      "Verify you're connected to the correct org",
    ]);
  }
}
```

### 4. **Explicit Error Handling in Types**

Use Result/Either types to make errors explicit:

```typescript
// ❌ Implicit errors (can throw anything)
async function retrieveProfile(name: string): Promise<Profile>;

// ✅ Explicit errors (compiler enforces handling)
async function retrieveProfile(name: string): Promise<Result<Profile, RetrieveError>>;

// Usage
const result = await retrieveProfile('Admin');

if (result.isFailure()) {
  // TypeScript knows result.error is RetrieveError
  console.error(result.error.message);
  console.log('Actions:', result.error.actions);
  process.exit(result.error.exitCode);
}

// TypeScript knows result.value is Profile
console.log(result.value.name);
```

### 5. **Actionable Error Messages**

Every error must tell the user:

1. **What went wrong** (clear description)
2. **Why it happened** (context)
3. **How to fix it** (specific actions)

```typescript
// ❌ Bad error message
throw new Error('Failed to retrieve');

// ✅ Good error message
return failure(
  new MetadataApiError('Metadata API request failed: INVALID_SESSION_ID', [
    'Your session has expired',
    'Run: sf org login web --alias production',
    'Then retry your command',
  ])
);
```

## EDD Workflow

### Step 1: Catalog Errors

Create `ERROR_CATALOG.md` with ALL possible errors:

```markdown
## ProfileNotFoundError

- **When**: Profile name doesn't exist in org
- **Category**: User Error
- **Recoverable**: No
- **Exit Code**: 1
- **Actions**:
  - List available profiles
  - Check spelling
  - Verify org connection
```

### Step 2: Define Error Types

Create error classes:

```typescript
// src/core/errors/index.ts
export class ProfileNotFoundError extends UserError {
  constructor(profileName: string, orgAlias: string) {
    super(`Profile '${profileName}' not found in org '${orgAlias}'`, 'PROFILE_NOT_FOUND', [
      `Run 'sf profiler list --target-org ${orgAlias}'`,
      'Check profile name spelling',
      'Verify org connection',
    ]);
  }
}
```

### Step 3: Write Error Tests

```typescript
describe('retrieveProfile errors', () => {
  // Test EVERY error from catalog
  it('throws ProfileNotFoundError when profile missing', async () => {
    // ...
  });

  it('throws OrgNotAuthenticatedError when not logged in', async () => {
    // ...
  });

  // ... all other errors
});
```

### Step 4: Implement Feature

Implement to make error tests pass:

```typescript
export function retrieveProfile(name: string, org: Org): ProfilerMonad<Profile> {
  return liftAsync(async () => {
    // Handle each error case
    if (!name) {
      throw new InvalidInputError('Profile name required');
    }

    if (!org.isAuthenticated()) {
      throw new OrgNotAuthenticatedError(org.getAlias());
    }

    const profile = await org.getConnection().metadata.read('Profile', name);

    if (!profile) {
      throw new ProfileNotFoundError(name, org.getAlias());
    }

    return profile;
  });
}
```

### Step 5: Write Happy Path Tests

Now that errors are handled, test success:

```typescript
it('retrieves profile successfully', async () => {
  const result = await retrieveProfile('Admin', mockOrg).run();

  expect(result.isSuccess()).toBe(true);
  expect(result.value.name).toBe('Admin');
});
```

## EDD in Monadic Context

EDD pairs perfectly with Monads:

```typescript
// Error handling is built into the monad
const pipeline = retrieveProfile('Admin', org)
  .flatMap((profile) => validateProfile(profile))
  .flatMap((validProfile) => saveProfile(validProfile))
  .recover((error) => {
    // Centralized error recovery
    if (error instanceof ProfileNotFoundError) {
      return getDefaultProfile();
    }
    throw error;
  });

const result = await pipeline.run();

// All errors are captured in Result type
if (result.isFailure()) {
  logError(result.error);
  showUserActions(result.error.actions);
  process.exit(result.error.exitCode);
}
```

## Error Testing Checklist

For EVERY feature implementation:

- [ ] List all possible errors in ERROR_CATALOG.md
- [ ] Create error classes for each error
- [ ] Write test for each error case
- [ ] Run tests (they should fail)
- [ ] Implement feature to handle errors
- [ ] Run tests (error tests should pass)
- [ ] Write happy path tests
- [ ] Verify all tests pass
- [ ] Update user documentation with error scenarios

## Error Categories

### User Errors

- Caused by incorrect usage
- Not recoverable automatically
- Need clear guidance

**Examples:**

- Invalid input
- Profile not found
- Not authenticated

### System Errors

- Caused by external dependencies
- Often recoverable (retry, fallback)
- May be transient

**Examples:**

- Network timeout
- API rate limit
- Disk space

### Fatal Errors

- Unexpected, severe failures
- Cannot continue
- Should never happen (bugs)

**Examples:**

- Null pointer exceptions
- Corrupted data structures
- Unhandled exceptions

## Best Practices

### 1. Error First, Always

```typescript
// ❌ Don't
function process() {
  // Happy path implementation
  // TODO: handle errors
}

// ✅ Do
function process(): Result<Output, ProcessError> {
  // Error handling first
  if (invalid) return failure(new InvalidError());
  if (notFound) return failure(new NotFoundError());

  // Happy path last
  return success(result);
}
```

### 2. Be Specific

```typescript
// ❌ Generic error
throw new Error('Failed');

// ✅ Specific error
throw new ProfileNotFoundError('Admin', 'production');
```

### 3. Provide Context

```typescript
// ❌ No context
throw new Error('Invalid input');

// ✅ With context
throw new InvalidInputError(`Profile name '${name}' is invalid: must not be empty`, [
  'Provide a valid profile name',
  'Example: --name Admin',
]);
```

### 4. Make Errors Testable

```typescript
// ❌ Hard to test
try {
  doSomething();
} catch (e) {
  console.error(e); // Can't assert on this
}

// ✅ Easy to test
const result = doSomething();
if (result.isFailure()) {
  return result.error; // Can assert on this
}
```

### 5. Document Recovery Strategies

```typescript
export class MetadataApiError extends SystemError {
  readonly recoverable = true;

  recoverWith(): RecoveryStrategy {
    return {
      retry: { maxAttempts: 3, backoff: 'exponential' },
      fallback: () => useCachedMetadata(),
    };
  }
}
```

## Metrics to Track

Monitor error frequency to improve:

1. **Error Rate**: Which errors happen most?
   → Improve docs, add validation, better UX

2. **Recovery Rate**: Which errors are recoverable?
   → Add auto-recovery, suggest fixes

3. **User Actions**: Which actions users take?
   → Optimize common fixes, automate where possible

## Example: Full EDD Cycle

```typescript
// 1. Define error in catalog
// ERROR_CATALOG.md
// ProfileNotFoundError: When profile doesn't exist

// 2. Create error class
// src/core/errors/profile-not-found-error.ts
export class ProfileNotFoundError extends UserError {
  constructor(name: string, org: string) {
    super(`Profile '${name}' not found in org '${org}'`, 'PROFILE_NOT_FOUND', [
      `Run 'sf profiler list --target-org ${org}'`,
    ]);
  }
}

// 3. Write error test
// test/retrieve.test.ts
it('should return ProfileNotFoundError when profile missing', async () => {
  const result = await retrieveProfile('Fake', org).run();

  expect(result.isFailure()).toBe(true);
  expect(result.error).toBeInstanceOf(ProfileNotFoundError);
  expect(result.error.code).toBe('PROFILE_NOT_FOUND');
});

// 4. Implement feature
// src/core/operations/retrieve.ts
export function retrieveProfile(name: string, org: Org): ProfilerMonad<Profile> {
  return liftAsync(async () => {
    const profile = await org.getConnection().metadata.read('Profile', name);

    if (!profile) {
      throw new ProfileNotFoundError(name, org.getAlias());
    }

    return profile;
  });
}

// 5. Test passes! ✅
```

## Comparison with Other Methodologies

| Methodology | Focus                    | Errors              |
| ----------- | ------------------------ | ------------------- |
| **TDD**     | Tests first, then code   | Added as tests fail |
| **BDD**     | Behavior specifications  | Part of behavior    |
| **DDD**     | Domain modeling          | Part of domain      |
| **EDD**     | **Errors first, always** | **PRIMARY CONCERN** |

EDD combines all three:

- **TDD**: Write error tests first
- **BDD**: Errors are part of behavior specs
- **DDD**: Errors are domain entities

## Resources

- [ERROR_CATALOG.md](ERROR_CATALOG.md) - Complete error catalog
- [Monad Pattern](./MONAD_PATTERN.md) - How errors flow through monads
- [Testing Guide](./TESTING_GUIDE.md) - Error testing strategies

---

## Remember

> "If you think about errors first, the happy path emerges naturally.
> If you think about the happy path first, errors become an afterthought."
> — EDD Philosophy

**Every feature starts with: "What can go wrong?"**
