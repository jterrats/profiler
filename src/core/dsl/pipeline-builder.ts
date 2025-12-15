/**
 * Pipeline DSL - Fluent API for composing operations
 *
 * Provides a builder pattern for chaining retrieve, compare, merge, and validate operations.
 * Errors are automatically wrapped with step context for better debugging.
 *
 * @module core/dsl/pipeline-builder
 */

import type { Org } from '@salesforce/core';
import { ProfilerMonad } from '../monad/profiler-monad.js';
import { PipelineStepFailedError, PipelineInterruptedError } from '../errors/pipeline-errors.js';
import { success, failure, type Result } from '../monad/result.js';
import type {
  CompareInput,
  CompareResult,
  MultiSourceCompareInput,
  MultiSourceCompareResult,
  MergeInput,
  MergeResult,
  ValidateInput,
  ValidationResult,
} from '../../operations/index.js';
import {
  compareProfileOperation,
  compareMultiSource,
  mergeProfileOperation,
  validateProfileOperation,
} from '../../operations/index.js';

/**
 * Pipeline step configuration
 */
export type PipelineStep =
  | { type: 'compare'; input: CompareInput; multiSource: false }
  | { type: 'compare'; input: MultiSourceCompareInput; multiSource: true }
  | { type: 'merge'; input: MergeInput }
  | { type: 'validate'; input: ValidateInput };

/**
 * Pipeline execution context
 */
export type PipelineContext = {
  org: Org;
  projectPath: string;
  profileNames: string[];
  apiVersion?: string;
};

/**
 * Pipeline result type
 */
export type PipelineResult = {
  stepResults: Array<{
    stepName: string;
    stepIndex: number;
    result: Result<CompareResult | MultiSourceCompareResult | MergeResult | ValidationResult>;
  }>;
  successfulSteps: number;
  failedSteps: number;
};

/**
 * Pipeline Builder class
 *
 * Provides fluent API for composing operations.
 *
 * @example
 * ```typescript
 * const result = await pipeline({ org, profileNames: ['Admin'], projectPath })
 *   .compare({ highlightDrift: true })
 *   .merge({ strategy: 'local-wins' })
 *   .validate()
 *   .run();
 * ```
 */
export class PipelineBuilder {
  private steps: PipelineStep[] = [];

  public constructor(private readonly context: PipelineContext) {}

  /**
   * Get human-readable step name
   */
  private static getStepName(step: PipelineStep, index: number): string {
    const stepType = step.type.charAt(0).toUpperCase() + step.type.slice(1);
    return `${stepType} (step ${index + 1})`;
  }

  /**
   * Execute a single pipeline step
   */
  private static executeStep(step: PipelineStep): ProfilerMonad<CompareResult | MergeResult | ValidationResult> {
    switch (step.type) {
      case 'compare': {
        if (step.multiSource) {
          // Multi-source compare returns MultiSourceCompareResult, but we treat it as CompareResult for pipeline
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-type-assertion
          return compareMultiSource(step.input as MultiSourceCompareInput) as any;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          return compareProfileOperation(step.input as CompareInput);
        }
      }
      case 'merge': {
        return mergeProfileOperation(step.input);
      }
      case 'validate': {
        return validateProfileOperation(step.input);
      }
      default: {
        // Exhaustive check for TypeScript
        const exhaustiveCheck: never = step;
        throw new Error(`Unknown step type: ${(exhaustiveCheck as PipelineStep).type}`);
      }
    }
  }

  /**
   * Add compare step to pipeline
   */
  public compare(options?: {
    highlightDrift?: boolean;
    excludeManaged?: boolean;
    sources?: string[];
  }): PipelineBuilder {
    const { org, projectPath, profileNames, apiVersion } = this.context;

    if (options?.sources && options.sources.length > 0) {
      // Multi-source compare
      // Note: This is a simplified version - full implementation would resolve orgs
      this.steps.push({
        type: 'compare',
        input: {
          profileNames,
          sources: [], // Would be resolved from aliases
          apiVersion: apiVersion ?? '60.0',
          projectPath,
        } as MultiSourceCompareInput,
        multiSource: true,
      });
    } else {
      // Single-source compare
      this.steps.push({
        type: 'compare',
        input: {
          org,
          profileName: profileNames[0] ?? '',
          projectPath,
          apiVersion: apiVersion ?? '60.0',
          ...options,
        } as CompareInput,
        multiSource: false,
      });
    }

    return this;
  }

  /**
   * Add merge step to pipeline
   */
  public merge(options?: { strategy?: string; dryRun?: boolean; skipBackup?: boolean }): PipelineBuilder {
    const { org, projectPath, profileNames, apiVersion } = this.context;

    this.steps.push({
      type: 'merge',
      input: {
        org,
        profileName: profileNames[0] ?? '',
        projectPath,
        apiVersion: apiVersion ?? '60.0',
        strategy: (options?.strategy as 'local-wins' | 'org-wins' | 'union' | 'interactive') ?? 'local-wins',
        dryRun: options?.dryRun ?? false,
        skipBackup: options?.skipBackup ?? false,
      },
    });

    return this;
  }

  /**
   * Add validate step to pipeline
   */
  public validate(options?: { fix?: boolean }): PipelineBuilder {
    const { org, projectPath, profileNames, apiVersion } = this.context;

    this.steps.push({
      type: 'validate',
      input: {
        profileName: profileNames[0] ?? '',
        projectPath,
        org,
        apiVersion: apiVersion ?? '60.0',
        ...(options?.fix !== undefined && { fix: options.fix }),
      },
    });

    return this;
  }

  /**
   * Execute all pipeline steps in sequence
   *
   * @returns Result with all step results
   */
  public async run(): Promise<Result<PipelineResult>> {
    const stepResults: PipelineResult['stepResults'] = [];
    let successfulSteps = 0;
    let failedSteps = 0;

    try {
      // Execute steps sequentially (each step may depend on previous)
      let currentIndex = 0;
      while (currentIndex < this.steps.length) {
        const step = this.steps[currentIndex];
        const stepName = PipelineBuilder.getStepName(step, currentIndex);

        try {
          // eslint-disable-next-line no-await-in-loop
          const stepResult = await PipelineBuilder.executeStep(step).run();

          stepResults.push({
            stepName,
            stepIndex: currentIndex,
            result: stepResult,
          });

          if (stepResult.isSuccess()) {
            successfulSteps++;
            currentIndex++;
          } else {
            failedSteps++;
            // Wrap error with pipeline context
            const pipelineError = new PipelineStepFailedError(stepName, currentIndex, stepResult.error);
            return failure(pipelineError);
          }
        } catch (error) {
          failedSteps++;
          const err = error instanceof Error ? error : new Error(String(error));
          const pipelineError = new PipelineStepFailedError(stepName, currentIndex, err);
          return failure(pipelineError);
        }
      }

      return success({
        stepResults,
        successfulSteps,
        failedSteps,
      });
    } catch (error) {
      // Handle interruption (Ctrl+C, timeout, etc.)
      const lastStepIndex = this.steps.length - 1;
      const lastStep = this.steps[lastStepIndex];
      const lastStepName = lastStep ? PipelineBuilder.getStepName(lastStep, lastStepIndex) : 'unknown';

      const errorMessage = error instanceof Error ? error.message : String(error);
      const reason: 'user-cancelled' | 'timeout' | 'unknown' = errorMessage.includes('SIGINT')
        ? 'user-cancelled'
        : 'unknown';

      const interruptError = new PipelineInterruptedError(lastStepName, lastStepIndex, reason);
      return failure(interruptError);
    }
  }
}

/**
 * Create a new pipeline builder
 *
 * @param context - Pipeline execution context
 * @returns PipelineBuilder instance
 *
 * @example
 * ```typescript
 * const result = await pipeline({ org, profileNames: ['Admin'], projectPath })
 *   .compare()
 *   .merge({ strategy: 'local-wins' })
 *   .validate()
 *   .run();
 * ```
 */
export function pipeline(context: PipelineContext): PipelineBuilder {
  return new PipelineBuilder(context);
}
