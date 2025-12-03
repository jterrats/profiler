/**
 * Result Monad - Type-safe error handling
 *
 * Represents the result of an operation that can either succeed or fail.
 * Forces explicit error handling at compile-time.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number> {
 *   if (b === 0) {
 *     return failure(new Error('Division by zero'));
 *   }
 *   return success(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.isSuccess()) {
 *   console.log(result.value); // TypeScript knows value exists
 * } else {
 *   console.error(result.error); // TypeScript knows error exists
 * }
 * ```
 */

import { UnwrapError } from '../errors/monad-errors.js';

/**
 * Result type - Either Success or Failure
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Success - Represents a successful result
 */
export class Success<T> {
  readonly _tag = 'Success' as const;

  constructor(readonly value: T) {}

  /**
   * Type guard to check if result is Success
   */
  isSuccess(): this is Success<T> {
    return true;
  }

  /**
   * Type guard to check if result is Failure
   */
  isFailure(): this is Failure<never> {
    return false;
  }

  /**
   * Unwrap the value (safe - cannot fail)
   */
  unsafeUnwrap(): T {
    return this.value;
  }

  /**
   * Get the value or a default
   */
  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  /**
   * Map the value if Success
   */
  map<U>(fn: (value: T) => U): Result<U> {
    try {
      return success(fn(this.value));
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * FlatMap (chain) for monadic composition
   */
  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    try {
      return fn(this.value);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * Failure - Represents a failed result
 */
export class Failure<E = Error> {
  readonly _tag = 'Failure' as const;

  constructor(readonly error: E) {}

  /**
   * Type guard to check if result is Success
   */
  isSuccess(): this is Success<never> {
    return false;
  }

  /**
   * Type guard to check if result is Failure
   */
  isFailure(): this is Failure<E> {
    return true;
  }

  /**
   * Unwrap the value (unsafe - will throw)
   */
  unsafeUnwrap(): never {
    throw new UnwrapError(this.error instanceof Error ? this.error : new Error(String(this.error)));
  }

  /**
   * Get a default value instead of the error
   */
  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Map does nothing on Failure (propagates error)
   */
  map<U>(_fn: (value: never) => U): Result<U> {
    return this as any;
  }

  /**
   * FlatMap does nothing on Failure (propagates error)
   */
  flatMap<U>(_fn: (value: never) => Result<U>): Result<U> {
    return this as any;
  }
}

/**
 * Constructor for Success
 */
export function success<T>(value: T): Result<T> {
  return new Success(value);
}

/**
 * Constructor for Failure
 */
export function failure<E = Error>(error: E): Result<never, E> {
  return new Failure(error);
}

/**
 * Lift a value into Result (always Success)
 */
export function pure<T>(value: T): Result<T> {
  return success(value);
}

/**
 * Try to execute a function and return Result
 */
export function tryCatch<T>(fn: () => T): Result<T> {
  try {
    return success(fn());
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Try to execute an async function and return Result
 */
export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    return success(value);
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

