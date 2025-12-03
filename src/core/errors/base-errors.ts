/**
 * Base error class for all Profiler errors
 * Provides consistent error handling across the plugin
 */
export abstract class ProfilerError extends Error {
  public readonly code: string;
  public readonly exitCode: number;
  public readonly recoverable: boolean;
  public readonly actions: string[];

  public constructor(message: string, code: string, actions: string[], exitCode = 1, recoverable = false) {
    super(message);
    this.code = code;
    this.exitCode = exitCode;
    this.recoverable = recoverable;
    this.actions = actions;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * User Error - Caused by incorrect usage
 * Not recoverable automatically, needs clear guidance
 */
export abstract class UserError extends ProfilerError {
  public constructor(message: string, code: string, actions: string[]) {
    super(message, code, actions, 1, false);
  }
}

/**
 * System Error - Caused by external dependencies
 * Often recoverable (retry, fallback)
 */
export abstract class SystemError extends ProfilerError {
  public constructor(message: string, code: string, actions: string[], recoverable = true) {
    super(message, code, actions, 1, recoverable);
  }
}

/**
 * Fatal Error - Unexpected, severe failures
 * Cannot continue, should never happen (bugs)
 */
export abstract class FatalError extends ProfilerError {
  public constructor(message: string, code: string) {
    super(
      message,
      code,
      ['Contact support', 'Report issue on GitHub: https://github.com/jterrats/profiler/issues'],
      2,
      false
    );
  }
}
