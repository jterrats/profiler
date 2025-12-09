/**
 * Monad Module - Exports all monadic types and functions
 */

// Export everything from result
export {
  type Result,
  type Success,
  type Failure,
  success,
  failure,
  pure as pureResult,
} from './result.js';

// Export everything from profiler-monad
export {
  ProfilerMonad,
  profilerMonad,
  pure as pureMonad,
  liftAsync,
} from './profiler-monad.js';

