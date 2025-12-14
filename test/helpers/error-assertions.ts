/**
 * Error Testing Helpers
 *
 * Utility functions for testing error scenarios in Error-Driven Development (EDD).
 * These helpers make error tests more readable and maintainable.
 *
 * @example
 * ```typescript
 * import { expectError, expectErrorCode, expectErrorActions } from '../helpers/error-assertions.js';
 *
 * const result = await someOperation().run();
 * expectError(result, ProfileNotFoundError);
 * expectErrorCode(result, 'PROFILE_NOT_FOUND');
 * expectErrorActions(result, ['Verify profile exists', 'Run sf profiler list']);
 * ```
 */

import { expect } from 'chai';
import type { Result } from '../../src/core/monad/result.js';
import type { ProfilerError } from '../../src/core/errors/index.js';

/**
 * Asserts that a Result is a failure with a specific error type
 *
 * @param result - The Result to check
 * @param errorType - The expected error class constructor
 * @param expectedMessage - Optional: Expected message substring
 * @throws If result is not a failure or error type doesn't match
 *
 * @example
 * ```typescript
 * const result = await retrieveProfile('NonExistent').run();
 * expectError(result, ProfileNotFoundError);
 * expectError(result, ProfileNotFoundError, 'NonExistent');
 * ```
 */
export function expectError<T extends Error>(
  result: Result<unknown>,
  errorType: new (...args: unknown[]) => T,
  expectedMessage?: string
): asserts result is Result<never, T> {
  expect(result.isFailure(), 'Expected result to be a failure').to.be.true;

  if (!result.isFailure()) {
    throw new Error('Result is not a failure');
  }

  expect(result.error, 'Expected error to be instance of ' + errorType.name).to.be.instanceOf(errorType);

  if (expectedMessage) {
    expect(result.error.message, `Expected error message to include "${expectedMessage}"`).to.include(expectedMessage);
  }
}

/**
 * Asserts that a Result is a failure with a specific error code
 *
 * @param result - The Result to check
 * @param expectedCode - The expected error code
 * @throws If result is not a failure or error code doesn't match
 *
 * @example
 * ```typescript
 * const result = await someOperation().run();
 * expectErrorCode(result, 'PROFILE_NOT_FOUND');
 * ```
 */
export function expectErrorCode(result: Result<unknown>, expectedCode: string): void {
  expect(result.isFailure(), 'Expected result to be a failure').to.be.true;

  if (!result.isFailure()) {
    throw new Error('Result is not a failure');
  }

  const error = result.error as ProfilerError;
  expect(error.code, `Expected error code to be "${expectedCode}"`).to.equal(expectedCode);
}

/**
 * Asserts that a Result is a failure with specific error actions
 *
 * @param result - The Result to check
 * @param expectedActions - Array of expected action strings (substring match)
 * @throws If result is not a failure or actions don't match
 *
 * @example
 * ```typescript
 * const result = await someOperation().run();
 * expectErrorActions(result, ['Verify profile exists', 'Run sf profiler list']);
 * ```
 */
export function expectErrorActions(result: Result<unknown>, expectedActions: string[]): void {
  expect(result.isFailure(), 'Expected result to be a failure').to.be.true;

  if (!result.isFailure()) {
    throw new Error('Result is not a failure');
  }

  const error = result.error as ProfilerError;
  expect(error.actions, 'Expected error to have actions').to.be.an('array');

  for (const expectedAction of expectedActions) {
    const hasAction = error.actions.some((action) => action.toLowerCase().includes(expectedAction.toLowerCase()));
    expect(hasAction, `Expected error actions to include "${expectedAction}"`).to.be.true;
  }
}

/**
 * Asserts that a Result is a failure with a specific exit code
 *
 * @param result - The Result to check
 * @param expectedExitCode - The expected exit code
 * @throws If result is not a failure or exit code doesn't match
 *
 * @example
 * ```typescript
 * const result = await someOperation().run();
 * expectErrorExitCode(result, 1);
 * ```
 */
export function expectErrorExitCode(result: Result<unknown>, expectedExitCode: number): void {
  expect(result.isFailure(), 'Expected result to be a failure').to.be.true;

  if (!result.isFailure()) {
    throw new Error('Result is not a failure');
  }

  const error = result.error as ProfilerError;
  expect(error.exitCode, `Expected error exit code to be ${expectedExitCode}`).to.equal(expectedExitCode);
}

/**
 * Asserts that a Result is a failure with a specific recoverable status
 *
 * @param result - The Result to check
 * @param expectedRecoverable - The expected recoverable status
 * @throws If result is not a failure or recoverable status doesn't match
 *
 * @example
 * ```typescript
 * const result = await someOperation().run();
 * expectErrorRecoverable(result, false); // User errors are not recoverable
 * ```
 */
export function expectErrorRecoverable(result: Result<unknown>, expectedRecoverable: boolean): void {
  expect(result.isFailure(), 'Expected result to be a failure').to.be.true;

  if (!result.isFailure()) {
    throw new Error('Result is not a failure');
  }

  const error = result.error as ProfilerError;
  expect(error.recoverable, `Expected error recoverable to be ${expectedRecoverable}`).to.equal(expectedRecoverable);
}

/**
 * Asserts that a Result is a success
 *
 * @param result - The Result to check
 * @throws If result is not a success
 *
 * @example
 * ```typescript
 * const result = await someOperation().run();
 * expectSuccess(result);
 * expect(result.value).to.equal(expectedValue);
 * ```
 */
export function expectSuccess<T>(result: Result<T>): asserts result is Result<T, never> {
  expect(result.isSuccess(), 'Expected result to be a success').to.be.true;
}

/**
 * Asserts that an error has a specific cause
 *
 * @param result - The Result to check
 * @param expectedCause - The expected cause (exact match or instance check)
 * @throws If result is not a failure or cause doesn't match
 *
 * @example
 * ```typescript
 * const originalError = new Error('Original');
 * const result = await someOperation().run();
 * expectErrorCause(result, originalError);
 * ```
 */
export function expectErrorCause(result: Result<unknown>, expectedCause: unknown): void {
  expect(result.isFailure(), 'Expected result to be a failure').to.be.true;

  if (!result.isFailure()) {
    throw new Error('Result is not a failure');
  }

  const error = result.error as { cause?: unknown };
  expect(error.cause, 'Expected error to have a cause').to.exist;

  if (expectedCause instanceof Error) {
    expect(error.cause, 'Expected error cause to match').to.equal(expectedCause);
  } else {
    expect(error.cause, 'Expected error cause to match').to.deep.equal(expectedCause);
  }
}

/**
 * Asserts that a Result is a failure with error message containing specific text
 *
 * @param result - The Result to check
 * @param expectedMessage - The expected message substring
 * @throws If result is not a failure or message doesn't contain expected text
 *
 * @example
 * ```typescript
 * const result = await retrieveProfile('NonExistent').run();
 * expectErrorMessage(result, 'NonExistent');
 * ```
 */
export function expectErrorMessage(result: Result<unknown>, expectedMessage: string): void {
  expect(result.isFailure(), 'Expected result to be a failure').to.be.true;

  if (!result.isFailure()) {
    throw new Error('Result is not a failure');
  }

  expect(result.error.message, `Expected error message to include "${expectedMessage}"`).to.include(expectedMessage);
}

/**
 * Asserts that a Result is a failure with a ProfilerError that has all standard properties
 *
 * @param result - The Result to check
 * @throws If result is not a failure or error doesn't have required properties
 *
 * @example
 * ```typescript
 * const result = await someOperation().run();
 * expectProfilerError(result);
 * ```
 */
export function expectProfilerError(result: Result<unknown>): asserts result is Result<never, ProfilerError> {
  expect(result.isFailure(), 'Expected result to be a failure').to.be.true;

  if (!result.isFailure()) {
    throw new Error('Result is not a failure');
  }

  const error = result.error as ProfilerError;
  expect(error.code, 'Expected error to have a code').to.be.a('string').and.not.be.empty;
  expect(error.exitCode, 'Expected error to have an exitCode').to.be.a('number');
  expect(error.recoverable, 'Expected error to have recoverable property').to.be.a('boolean');
  expect(error.actions, 'Expected error to have actions').to.be.an('array');
}
