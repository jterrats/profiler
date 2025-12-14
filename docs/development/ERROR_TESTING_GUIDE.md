# Error Testing Guide

> **Error-Driven Development (EDD)**: Write error tests BEFORE implementation.

## Overview

Error testing is a core part of Error-Driven Development (EDD). This guide explains how to write, structure, and maintain error tests in the Profiler plugin.

## Philosophy

**Errors First, Features Second**

1. Define ALL possible errors for a feature
2. Write error tests (they MUST fail initially)
3. Implement error handling to make tests pass
4. Write happy path tests
5. Refactor and optimize

## Directory Structure

```
test/
├── errors/              # ⭐ Error tests (EDD core)
│   ├── retrieve-operation.errors.test.ts
│   ├── compare-operation.errors.test.ts
│   ├── merge-operation.errors.test.ts
│   ├── validate-operation.errors.test.ts
│   ├── profiler-monad.errors.test.ts
│   └── result.errors.test.ts
├── unit/                # Happy path unit tests
│   ├── retrieve.test.ts
│   └── compare.test.ts
├── integration/         # Integration tests
│   └── operations.integration.test.ts
└── helpers/             # Test utilities
    └── error-assertions.ts
```

## Naming Conventions

- **Error tests**: `*.errors.test.ts` (e.g., `retrieve-operation.errors.test.ts`)
- **Happy path tests**: `*.test.ts` (e.g., `retrieve.test.ts`)
- **Integration tests**: `*.integration.test.ts`
- **NUT tests**: `*.nut.ts` (Native Unit Tests with Salesforce CLI)

## Error Testing Helpers

The `test/helpers/error-assertions.ts` module provides utility functions for error testing:

### `expectError(result, errorType, expectedMessage?)`

Asserts that a Result is a failure with a specific error type.

```typescript
import { expectError } from '../helpers/error-assertions.js';
import { ProfileNotFoundError } from '../../src/core/errors/index.js';

const result = await retrieveProfile('NonExistent').run();
expectError(result, ProfileNotFoundError);
expectError(result, ProfileNotFoundError, 'NonExistent');
```

### `expectErrorCode(result, expectedCode)`

Asserts that a Result has a specific error code.

```typescript
import { expectErrorCode } from '../helpers/error-assertions.js';

const result = await someOperation().run();
expectErrorCode(result, 'PROFILE_NOT_FOUND');
```

### `expectErrorActions(result, expectedActions)`

Asserts that a Result has specific error actions (substring match).

```typescript
import { expectErrorActions } from '../helpers/error-assertions.js';

const result = await someOperation().run();
expectErrorActions(result, ['Verify profile exists', 'Run sf profiler list']);
```

### `expectErrorExitCode(result, expectedExitCode)`

Asserts that a Result has a specific exit code.

```typescript
import { expectErrorExitCode } from '../helpers/error-assertions.js';

const result = await someOperation().run();
expectErrorExitCode(result, 1);
```

### `expectErrorRecoverable(result, expectedRecoverable)`

Asserts that a Result has a specific recoverable status.

```typescript
import { expectErrorRecoverable } from '../helpers/error-assertions.js';

const result = await someOperation().run();
expectErrorRecoverable(result, false); // User errors are not recoverable
```

### `expectSuccess(result)`

Asserts that a Result is a success.

```typescript
import { expectSuccess } from '../helpers/error-assertions.js';

const result = await someOperation().run();
expectSuccess(result);
expect(result.value).to.equal(expectedValue);
```

### `expectErrorCause(result, expectedCause)`

Asserts that an error has a specific cause.

```typescript
import { expectErrorCause } from '../helpers/error-assertions.js';

const originalError = new Error('Original');
const result = await someOperation().run();
expectErrorCause(result, originalError);
```

### `expectErrorMessage(result, expectedMessage)`

Asserts that an error message contains specific text.

```typescript
import { expectErrorMessage } from '../helpers/error-assertions.js';

const result = await retrieveProfile('NonExistent').run();
expectErrorMessage(result, 'NonExistent');
```

### `expectProfilerError(result)`

Asserts that a Result is a failure with a ProfilerError that has all standard properties.

```typescript
import { expectProfilerError } from '../helpers/error-assertions.js';

const result = await someOperation().run();
expectProfilerError(result);
```

## Writing Error Tests

### Step 1: Define Errors

Before writing tests, define ALL possible errors for the feature:

```markdown
Feature: Retrieve Profile

Errors to handle:

1. ProfileNotFoundError - Profile doesn't exist
2. OrgNotAuthenticatedError - Org not authenticated
3. MetadataApiError - API call failed
4. RetrieveTimeoutError - Operation timed out
5. InsufficientPermissionsError - User lacks permissions
6. InvalidProjectError - Not a valid Salesforce project
7. DiskSpaceError - Not enough disk space
8. ManagedPackageError - Managed package issues
```

### Step 2: Write Error Tests

Write tests for each error case. These tests MUST fail initially:

```typescript
/**
 * Error Tests for Retrieve Operation
 * Following Error-Driven Development: These tests are written BEFORE implementation
 */

import { expect } from 'chai';
import {
  expectError,
  expectErrorCode,
  expectErrorActions,
  expectErrorExitCode,
  expectErrorRecoverable,
} from '../helpers/error-assertions.js';
import { ProfileNotFoundError, OrgNotAuthenticatedError, MetadataApiError } from '../../src/core/errors/index.js';
import { retrieveProfileOperation } from '../../src/operations/retrieve-operation.js';

describe('Retrieve Operation - Error Tests', () => {
  describe('ProfileNotFoundError', () => {
    it('should fail when profile does not exist', async () => {
      // Arrange
      const input = {
        org: mockOrg,
        profileNames: ['NonExistentProfile'],
        apiVersion: '58.0',
      };

      // Act
      const result = await retrieveProfileOperation(input).run();

      // Assert
      expectError(result, ProfileNotFoundError, 'NonExistentProfile');
      expectErrorCode(result, 'PROFILE_NOT_FOUND');
      expectErrorExitCode(result, 1);
      expectErrorRecoverable(result, false);
      expectErrorActions(result, ['verify', 'list']);
    });
  });

  describe('OrgNotAuthenticatedError', () => {
    it('should fail when org is not authenticated', async () => {
      // Arrange
      mockOrg.isAuthenticated.mockReturnValue(false);

      // Act
      const result = await retrieveProfileOperation({ org: mockOrg }).run();

      // Assert
      expectError(result, OrgNotAuthenticatedError);
      expectErrorCode(result, 'ORG_NOT_AUTHENTICATED');
      expectErrorExitCode(result, 1);
      expectErrorRecoverable(result, false);
    });
  });

  describe('MetadataApiError', () => {
    it('should fail when Metadata API returns error', async () => {
      // Arrange
      mockConnection.metadata.list.mockRejectedValue(new Error('INVALID_SESSION_ID'));

      // Act
      const result = await retrieveProfileOperation({ org: mockOrg }).run();

      // Assert
      expectError(result, MetadataApiError);
      expectErrorCode(result, 'METADATA_API_ERROR');
      expectErrorRecoverable(result, true); // System errors are recoverable
    });
  });
});
```

### Step 3: Run Tests (They Should Fail)

```bash
yarn test:errors
```

All error tests should fail because the error handling is not yet implemented.

### Step 4: Implement Error Handling

Implement error handling in the operation to make tests pass:

```typescript
export function retrieveProfileOperation(input: RetrieveInput): ProfilerMonad<RetrieveResult> {
  return new ProfilerMonad(async () => {
    // Check authentication
    if (!input.org.isAuthenticated()) {
      return failure(new OrgNotAuthenticatedError(input.org.getUsername()));
    }

    // Check profile exists
    const profiles = await listProfiles(input.org);
    if (!profiles.includes(input.profileNames[0])) {
      return failure(new ProfileNotFoundError(input.profileNames[0]));
    }

    // ... rest of implementation
  });
}
```

### Step 5: Verify Tests Pass

```bash
yarn test:errors
```

All error tests should now pass.

### Step 6: Write Happy Path Tests

After error handling is complete, write happy path tests:

```typescript
describe('Retrieve Operation - Happy Path', () => {
  it('should retrieve profile successfully', async () => {
    // Arrange
    const input = {
      org: mockOrg,
      profileNames: ['Admin'],
      apiVersion: '58.0',
    };

    // Act
    const result = await retrieveProfileOperation(input).run();

    // Assert
    expectSuccess(result);
    expect(result.value.profiles).to.have.length(1);
    expect(result.value.profiles[0].name).to.equal('Admin');
  });
});
```

## Test Structure

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should fail when profile does not exist', async () => {
  // Arrange - Set up test data and mocks
  const profileName = 'NonExistentProfile';
  mockOrg.getProfile.mockResolvedValue(null);

  // Act - Execute the operation
  const result = await retrieveProfileOperation({ org: mockOrg, profileNames: [profileName] }).run();

  // Assert - Verify error conditions
  expectError(result, ProfileNotFoundError);
  expectErrorCode(result, 'PROFILE_NOT_FOUND');
});
```

## Best Practices

### 1. Test One Error Per Test

```typescript
// ✅ Good: One error per test
it('should fail when profile does not exist', async () => {
  expectError(result, ProfileNotFoundError);
});

it('should fail when org is not authenticated', async () => {
  expectError(result, OrgNotAuthenticatedError);
});

// ❌ Bad: Multiple errors in one test
it('should handle all errors', async () => {
  expectError(result1, ProfileNotFoundError);
  expectError(result2, OrgNotAuthenticatedError);
});
```

### 2. Use Descriptive Test Names

```typescript
// ✅ Good: Clear and descriptive
it('should fail with ProfileNotFoundError when profile name does not exist in org', async () => {
  // ...
});

// ❌ Bad: Vague
it('should fail', async () => {
  // ...
});
```

### 3. Test Error Properties

Always test error properties:

- Error type (instanceOf)
- Error code
- Exit code
- Recoverable status
- Actions (user guidance)

```typescript
it('should create error with all required properties', async () => {
  const result = await someOperation().run();

  expectError(result, ProfileNotFoundError);
  expectErrorCode(result, 'PROFILE_NOT_FOUND');
  expectErrorExitCode(result, 1);
  expectErrorRecoverable(result, false);
  expectErrorActions(result, ['verify', 'list']);
});
```

### 4. Test Error Messages

Verify error messages are helpful and include relevant context:

```typescript
it('should include profile name in error message', async () => {
  const result = await retrieveProfile('NonExistent').run();

  expectErrorMessage(result, 'NonExistent');
  expect(result.error.message).to.include('NonExistent');
});
```

### 5. Test Error Causes

For errors that wrap other errors, test the cause:

```typescript
it('should preserve original error as cause', async () => {
  const originalError = new Error('API call failed');
  mockApi.call.mockRejectedValue(originalError);

  const result = await someOperation().run();

  expectError(result, MetadataApiError);
  expectErrorCause(result, originalError);
});
```

## Running Error Tests

### Run All Error Tests

```bash
yarn test:errors
```

### Run Specific Error Test File

```bash
yarn test test/errors/retrieve-operation.errors.test.ts
```

### Run with Coverage

```bash
yarn test:errors --coverage
```

## CI Integration

Error tests run first in CI (Tier 1) for fast feedback:

```yaml
# .github/workflows/edd-ci.yml
jobs:
  quick-check:
    steps:
      - name: Run Error Tests
        run: yarn test:errors --maxWorkers=2
```

## Common Patterns

### Testing Monadic Operations

```typescript
describe('Monadic Operation Errors', () => {
  it('should propagate errors through monad chain', async () => {
    const result = await liftAsync(() => {
      throw new Error('Test error');
    })
      .map((x) => x * 2)
      .flatMap((x) => pure(x + 1))
      .run();

    expectError(result, ComputationError);
  });
});
```

### Testing Parallel Operations

```typescript
describe('Parallel Operation Errors', () => {
  it('should handle partial failures', async () => {
    const results = await Promise.all([retrieveProfile('Admin').run(), retrieveProfile('NonExistent').run()]);

    expectSuccess(results[0]);
    expectError(results[1], ProfileNotFoundError);
  });
});
```

### Testing Recovery

```typescript
describe('Error Recovery', () => {
  it('should recover from recoverable errors', async () => {
    const result = await someOperation()
      .recover((error) => {
        if (error instanceof MetadataApiError) {
          return success(defaultValue);
        }
        return failure(error);
      })
      .run();

    expectSuccess(result);
  });
});
```

## Troubleshooting

### Tests Pass When They Should Fail

If error tests pass before implementation, check:

1. Are you testing the right operation?
2. Are mocks set up correctly?
3. Is the error being thrown but not caught?

### Tests Fail When They Should Pass

If error tests fail after implementation, check:

1. Is the error type correct?
2. Are error properties set correctly?
3. Is the error being returned (not thrown)?

### Type Errors

If you get TypeScript errors, ensure:

1. Error types are imported correctly
2. Result types are correct
3. Helper functions are typed correctly

## Resources

- [Error-Driven Development Guide](./ERROR_DRIVEN_DEVELOPMENT.md)
- [Error Catalog](./ERROR_CATALOG.md)
- [Development Guide](./DEVELOPMENT.md)

## Examples

See existing error tests for reference:

- `test/errors/retrieve-operation.errors.test.ts`
- `test/errors/compare-operation.errors.test.ts`
- `test/errors/merge-operation.errors.test.ts`
- `test/errors/validate-operation.errors.test.ts`
- `test/errors/profiler-monad.errors.test.ts`
- `test/errors/result.errors.test.ts`
