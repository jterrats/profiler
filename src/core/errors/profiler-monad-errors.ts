import { FatalError } from './base-errors.js';

/**
 * ComputationError - Error during monad execution
 * 
 * When: An error occurs during the execution of the monadic computation
 * 
 * Example:
 * ```typescript
 * const monad = liftAsync(() => {
 *   throw new Error('Database error');
 * });
 * const result = await monad.run();
 * // result.error is ComputationError wrapping the database error
 * ```
 */
export class ComputationError extends FatalError {
  constructor(originalError: Error) {
    super(
      `Computation failed: ${originalError.message}`,
      'COMPUTATION_ERROR'
    );
    this.cause = originalError;
  }
}

/**
 * FlatMapError - Error in flatMap transformation
 * 
 * When: An error occurs during a flatMap operation
 * 
 * Example:
 * ```typescript
 * monad.flatMap(value => {
 *   throw new Error('Transform failed');
 * });
 * ```
 */
export class FlatMapError extends FatalError {
  constructor(originalError: Error) {
    super(
      `FlatMap transformation failed: ${originalError.message}`,
      'FLATMAP_ERROR'
    );
    this.cause = originalError;
  }
}

/**
 * RecoveryError - Error during recovery function
 * 
 * When: The recovery function itself throws an error
 * 
 * This is particularly problematic because the recovery function
 * is supposed to handle errors, not create new ones.
 * 
 * Example:
 * ```typescript
 * monad.recover(() => {
 *   throw new Error('Recovery failed');
 * });
 * ```
 */
export class RecoveryError extends FatalError {
  constructor(originalError: Error, recoveryError: Error) {
    super(
      `Recovery function failed while handling error '${originalError.message}': ${recoveryError.message}`,
      'RECOVERY_ERROR'
    );
    this.cause = recoveryError;
  }
}

/**
 * ChainError - Error propagating through chain
 * 
 * When: An error occurs during chain (alias for flatMap) operation
 * 
 * This is typically the same as FlatMapError but provides
 * a clearer error message for chain operations.
 */
export class ChainError extends FatalError {
  constructor(originalError: Error) {
    super(
      `Chain operation failed: ${originalError.message}`,
      'CHAIN_ERROR'
    );
    this.cause = originalError;
  }
}

