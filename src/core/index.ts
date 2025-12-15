/**
 * Core module exports
 * Provides Result monad, ProfilerMonad, and error handling infrastructure
 */

// Result exports
export {
  type Result,
  Success,
  Failure,
  success,
  failure,
  pure as pureResult, // Rename to avoid conflict
  tryCatch,
  tryCatchAsync,
} from './monad/result.js';

// ProfilerMonad exports
export {
  ProfilerMonad,
  profilerMonad,
  pure as pureMonad, // Rename to avoid conflict
  liftAsync,
  sequence,
  traverse,
} from './monad/profiler-monad.js';

// Error exports
export * from './errors/index.js';

// UI/Progress exports
export * from './ui/progress.js';
