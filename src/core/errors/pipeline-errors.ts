/**
 * Pipeline DSL Errors
 *
 * Errors for pipeline operations and step failures.
 * Following Error-Driven Development methodology.
 */

import { SystemError } from './base-errors.js';

/**
 * PipelineStepFailedError - A step in the pipeline failed
 * When: An operation in the pipeline chain fails
 * Recoverable: Yes (can retry or skip step)
 */
export class PipelineStepFailedError extends SystemError {
  public constructor(
    public readonly stepName: string,
    public readonly stepIndex: number,
    public readonly originalError: Error
  ) {
    super(
      `Pipeline failed at step '${stepName}' (step ${stepIndex + 1}): ${originalError.message}`,
      'PIPELINE_STEP_FAILED',
      [
        `Review error from step: ${stepName}`,
        'Check if previous steps completed successfully',
        'Consider using error recovery strategies',
      ]
    );
    this.cause = originalError;
  }
}

/**
 * PipelineInterruptedError - User interrupted the pipeline
 * When: User cancels (Ctrl+C) or timeout occurs
 * Recoverable: Yes (can resume from last successful step)
 */
export class PipelineInterruptedError extends SystemError {
  public constructor(
    public readonly stepName: string,
    public readonly stepIndex: number,
    public readonly reason: 'user-cancelled' | 'timeout' | 'unknown'
  ) {
    const reasonMessage =
      reason === 'user-cancelled'
        ? 'User cancelled the operation'
        : reason === 'timeout'
        ? 'Operation timed out'
        : 'Operation was interrupted';

    super(
      `Pipeline interrupted at step '${stepName}' (step ${stepIndex + 1}): ${reasonMessage}`,
      'PIPELINE_INTERRUPTED',
      [
        'Pipeline can be resumed from the last successful step',
        'Check if any partial results are available',
        'Review logs for the step that was interrupted',
      ]
    );
  }
}
