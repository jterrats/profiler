/**
 * ProfilerMonad - Composable async operations with error handling
 *
 * Wraps async computations and provides a functional API for composition.
 * Supports lazy evaluation, error handling, and recovery strategies.
 *
 * @example
 * ```typescript
 * const pipeline = liftAsync(async () => {
 *   return await fetchProfile('Admin');
 * })
 *   .map(profile => validateProfile(profile))
 *   .flatMap(profile => saveProfile(profile))
 *   .tap(profile => console.log('Saved:', profile.name))
 *   .recover(error => getDefaultProfile());
 *
 * const result = await pipeline.run();
 * if (result.isSuccess()) {
 *   console.log(result.value);
 * }
 * ```
 */

import { ComputationError, FlatMapError, RecoveryError } from '../errors/profiler-monad-errors.js';
import { Result, success, failure } from './result.js';

/**
 * ProfilerMonad class
 *
 * Wraps an async computation that returns a Result.
 * Provides map, flatMap, tap, and recover methods for composition.
 */
export class ProfilerMonad<T> {
  public constructor(private readonly computation: () => Promise<Result<T>>) {}

  /**
   * Functor: map
   *
   * Transform the value inside the monad if successful.
   * Errors are propagated without executing the function.
   *
   * @param fn Transformation function
   * @returns New monad with transformed value
   */
  public map<U>(fn: (value: T) => U): ProfilerMonad<U> {
    return new ProfilerMonad(async () => {
      const result = await this.computation();

      if (result.isFailure()) {
        return result as unknown as Result<U>; // Propagate error
      }

      try {
        const mapped = fn(result.value);
        return success(mapped);
      } catch (error) {
        return failure(new ComputationError(error instanceof Error ? error : new Error(String(error))));
      }
    });
  }

  /**
   * Monad: flatMap (chain)
   *
   * Chain monadic computations together.
   * Allows composing operations that return ProfilerMonad.
   *
   * @param fn Function that returns a ProfilerMonad
   * @returns New monad representing the chained computation
   */
  public flatMap<U>(fn: (value: T) => ProfilerMonad<U>): ProfilerMonad<U> {
    return new ProfilerMonad(async () => {
      const result = await this.computation();

      if (result.isFailure()) {
        return result as unknown as Result<U>; // Propagate error
      }

      try {
        const nextMonad = fn(result.value);
        return await nextMonad.run();
      } catch (error) {
        return failure(new FlatMapError(error instanceof Error ? error : new Error(String(error))));
      }
    });
  }

  /**
   * Alias for flatMap (more intuitive name)
   *
   * @param fn Function that returns a ProfilerMonad
   * @returns New monad representing the chained computation
   */
  public chain<U>(fn: (value: T) => ProfilerMonad<U>): ProfilerMonad<U> {
    return this.flatMap(fn);
  }

  /**
   * Tap: Execute side effects without changing the value
   *
   * Useful for logging, debugging, or other side effects.
   * The value passes through unchanged.
   *
   * @param fn Side effect function
   * @returns Same monad (for chaining)
   */
  public tap(fn: (value: T) => void): ProfilerMonad<T> {
    return this.map((value) => {
      try {
        fn(value);
      } catch {
        // Ignore errors in tap (side effects shouldn't break the chain)
      }
      return value;
    });
  }

  /**
   * Recover: Provide a fallback value on error
   *
   * If the computation fails, use the recovery function to produce a value.
   * If the recovery function also fails, return RecoveryError.
   *
   * @param fn Recovery function that takes the error and returns a value
   * @returns New monad with recovery logic
   */
  public recover(fn: (error: Error) => T): ProfilerMonad<T> {
    return new ProfilerMonad(async () => {
      const result = await this.computation();

      if (result.isSuccess()) {
        return result; // No need to recover
      }

      try {
        const recovered = fn(result.error);
        return success(recovered);
      } catch (recoveryError) {
        return failure(
          new RecoveryError(
            result.error,
            recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError))
          )
        );
      }
    });
  }

  /**
   * Execute the computation and return Result
   *
   * This is where the lazy evaluation happens.
   * Nothing executes until run() is called.
   *
   * @returns Promise of Result<T>
   */
  public async run(): Promise<Result<T>> {
    try {
      return await this.computation();
    } catch (error) {
      // Catch any unexpected errors during computation
      return failure(new ComputationError(error instanceof Error ? error : new Error(String(error))));
    }
  }

  /**
   * Execute and unwrap (throws on failure)
   *
   * Convenience method for when you're sure the operation will succeed
   * or when you want to handle errors with try/catch.
   *
   * @returns Promise of T
   * @throws Error if computation fails
   */
  public async unsafeRun(): Promise<T> {
    const result = await this.run();

    if (result.isFailure()) {
      throw result.error;
    }

    return result.value;
  }
}

/**
 * Constructor for ProfilerMonad (pure)
 *
 * Wraps a computation that returns a Result.
 *
 * @param computation Async function that returns Result<T>
 * @returns New ProfilerMonad
 */
export function profilerMonad<T>(computation: () => Promise<Result<T>>): ProfilerMonad<T> {
  return new ProfilerMonad(computation);
}

/**
 * Lift a value into ProfilerMonad (always successful)
 *
 * @param value Value to lift
 * @returns ProfilerMonad containing the value
 */
export function pure<T>(value: T): ProfilerMonad<T> {
  return new ProfilerMonad(() => Promise.resolve(success(value)));
}

/**
 * Lift an async function into ProfilerMonad
 *
 * Catches any errors and wraps them in Result.
 *
 * @param fn Async function to lift
 * @returns ProfilerMonad wrapping the computation
 */
export function liftAsync<T>(fn: () => Promise<T> | T): ProfilerMonad<T> {
  return new ProfilerMonad(async () => {
    try {
      const value = await fn();
      return success(value);
    } catch (error) {
      return failure(new ComputationError(error instanceof Error ? error : new Error(String(error))));
    }
  });
}

/**
 * Sequence: Execute multiple monads and collect results
 *
 * All monads execute in parallel. If any fails, the entire sequence fails.
 *
 * @param monads Array of ProfilerMonad
 * @returns ProfilerMonad containing array of results
 */
export function sequence<T>(monads: Array<ProfilerMonad<T>>): ProfilerMonad<T[]> {
  return new ProfilerMonad(async () => {
    const results = await Promise.all(monads.map(async (m) => m.run()));

    // Check if any failed
    const failures = results.filter((r) => r.isFailure());
    if (failures.length > 0) {
      return failures[0] as unknown as Result<never>; // Return first failure
    }

    // All succeeded, extract values
    const values = results.map((r) => {
      if (r.isSuccess()) {
        return r.value;
      }
      throw new Error('Unexpected failure');
    });
    return success(values);
  });
}

/**
 * Traverse: Map array to monads and sequence
 *
 * Convenience function for mapping and then sequencing.
 *
 * @param array Array to map
 * @param fn Function that creates a monad from each item
 * @returns ProfilerMonad containing array of results
 */
export function traverse<A, B>(array: A[], fn: (item: A) => ProfilerMonad<B>): ProfilerMonad<B[]> {
  return sequence(array.map(fn));
}
