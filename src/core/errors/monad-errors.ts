import { FatalError } from './base-errors.js';

/**
 * UnwrapError - Attempting to unwrap a Failure
 *
 * When: User tries to call unsafeUnwrap() on a Failure result
 *
 * Example:
 * ```typescript
 * const result = failure(new Error('Something went wrong'));
 * result.unsafeUnwrap(); // throws UnwrapError
 * ```
 */
export class UnwrapError extends FatalError {
  public constructor(error: Error) {
    super(`Attempted to unwrap Failure: ${error.message}`, 'UNWRAP_FAILURE');
    this.cause = error;
  }
}

/**
 * TypeGuardError - Incorrect type narrowing
 *
 * When: Type guard logic fails (should not happen with proper implementation)
 *
 * This is a programming error that indicates a bug in the Result implementation.
 */
export class TypeGuardError extends FatalError {
  public constructor(message: string) {
    super(`Type guard assertion failed: ${message}`, 'TYPE_GUARD_ERROR');
  }
}
