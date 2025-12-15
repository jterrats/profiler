/**
 * Progress Indicators Module
 *
 * Provides spinners, progress bars, and status messages for long-running operations.
 * Gracefully degrades in non-TTY environments.
 *
 * @module core/ui/progress
 */

import ora, { type Ora } from 'ora';
import cliProgress, { type SingleBar, type MultiBar } from 'cli-progress';

/**
 * Check if running in CI environment
 */
function isCI(): boolean {
  return Boolean(
    process.env.CI ?? // GitHub Actions, GitLab CI, CircleCI, etc.
      process.env.CONTINUOUS_INTEGRATION ?? // Generic CI flag
      process.env.BUILD_NUMBER ?? // Jenkins, TeamCity
      process.env.RUN_ID ?? // TaskCluster, Aws CodeBuild
      process.env.TF_BUILD // Azure Pipelines
  );
}

/**
 * Check if output is interactive (TTY)
 */
function isInteractive(): boolean {
  return process.stdout.isTTY && !isCI();
}

/**
 * Progress indicator options
 */
export type ProgressOptions = {
  /** Whether to disable progress indicators (--quiet flag) */
  quiet?: boolean;
  /** Custom text for the spinner/progress bar */
  text?: string;
};

/**
 * Spinner wrapper that gracefully degrades in non-TTY
 */
export class Spinner {
  private spinner: Ora | null = null;
  private quiet: boolean;
  private text: string;

  public constructor(text: string, options: ProgressOptions = {}) {
    this.quiet = options.quiet ?? false;
    this.text = text;

    if (!this.quiet && isInteractive()) {
      this.spinner = ora(text).start();
    } else if (!this.quiet) {
      // Non-TTY: just log the message
      // eslint-disable-next-line no-console
      console.log(`${text}...`);
    }
  }

  /**
   * Update spinner text
   */
  public updateText(text: string): void {
    this.text = text;
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  /**
   * Mark spinner as succeeded
   */
  public succeed(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text ?? this.text);
    } else if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`✓ ${text ?? this.text}`);
    }
  }

  /**
   * Mark spinner as failed
   */
  public fail(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text ?? this.text);
    } else if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`✗ ${text ?? this.text}`);
    }
  }

  /**
   * Mark spinner as warning
   */
  public warn(text?: string): void {
    if (this.spinner) {
      this.spinner.warn(text ?? this.text);
    } else if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`⚠ ${text ?? this.text}`);
    }
  }

  /**
   * Stop spinner without marking success/failure
   */
  public stop(): void {
    if (this.spinner) {
      this.spinner.stop();
    }
  }
}

/**
 * Progress bar for parallel operations
 */
export class ProgressBar {
  private bar: SingleBar | null = null;
  private quiet: boolean;
  private label: string;
  private total: number;
  private startTime: number;

  public constructor(label: string, total: number, options: ProgressOptions = {}) {
    this.quiet = options.quiet ?? false;
    this.label = label;
    this.total = total;
    this.startTime = Date.now();

    if (!this.quiet && isInteractive()) {
      this.bar = new cliProgress.SingleBar(
        {
          format: `${label.padEnd(20)} | {bar} | {percentage}% | {value}/{total} | ETA: {eta}s`,
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
          hideCursor: true,
        },
        cliProgress.Presets.shades_classic
      );
      this.bar.start(total, 0);
    } else if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`${label}: Starting (0/${total})...`);
    }
  }

  /**
   * Update progress
   */
  public update(current: number, total?: number): void {
    if (this.bar) {
      this.bar.update(current);
      if (total !== undefined && total !== this.total) {
        this.bar.setTotal(total);
        this.total = total;
      }
    } else if (!this.quiet) {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      // eslint-disable-next-line no-console
      console.log(`${this.label}: ${current}/${this.total ?? total ?? 0} (${elapsed}s)`);
    }
  }

  /**
   * Increment progress by 1
   */
  public increment(): void {
    if (this.bar) {
      this.bar.increment();
    } else {
      // For non-TTY, we need to track current value manually
      // Since we don't have access to bar.value when bar is null,
      // we'll just log an increment message
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      // eslint-disable-next-line no-console
      console.log(`${this.label}: Progress updated (${elapsed}s)`);
    }
  }

  /**
   * Stop progress bar
   */
  public stop(): void {
    if (this.bar) {
      this.bar.stop();
    } else if (!this.quiet) {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      // eslint-disable-next-line no-console
      console.log(`${this.label}: Complete (${elapsed}s)`);
    }
  }
}

/**
 * Multi-bar progress for parallel operations across multiple items
 */
export class MultiProgressBar {
  private multibar: MultiBar | null = null;
  private bars: Map<string, SingleBar> = new Map();
  private quiet: boolean;
  private startTime: number;

  public constructor(options: ProgressOptions = {}) {
    this.quiet = options.quiet ?? false;
    this.startTime = Date.now();

    if (!this.quiet && isInteractive()) {
      this.multibar = new cliProgress.MultiBar(
        {
          format: '{label} | {bar} | {percentage}% | ETA: {eta}s',
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
          hideCursor: true,
          clearOnComplete: false,
        },
        cliProgress.Presets.shades_classic
      );
    } else if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log('Processing multiple items in parallel...');
    }
  }

  /**
   * Create a progress bar for a specific item
   */
  public createBar(label: string, total: number): SingleBar | null {
    if (this.multibar) {
      const bar = this.multibar.create(total, 0, { label });
      this.bars.set(label, bar);
      return bar;
    } else if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`${label}: Starting (0/${total})...`);
    }
    return null;
  }

  /**
   * Update progress for a specific bar
   */
  public update(label: string, current: number, total?: number): void {
    const bar = this.bars.get(label);
    if (bar) {
      bar.update(current);
      if (total !== undefined) {
        bar.setTotal(total);
      }
    } else if (!this.quiet) {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      // eslint-disable-next-line no-console
      console.log(`${label}: ${current}/${total ?? '?'} (${elapsed}s)`);
    }
  }

  /**
   * Stop all progress bars
   */
  public stop(): void {
    if (this.multibar) {
      this.multibar.stop();
    } else if (!this.quiet) {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      // eslint-disable-next-line no-console
      console.log(`All operations complete (${elapsed}s)`);
    }
  }
}

/**
 * Status message helper with emojis
 */
export class StatusMessage {
  private quiet: boolean;

  public constructor(options: ProgressOptions = {}) {
    this.quiet = options.quiet ?? false;
  }

  /**
   * Display success message
   */
  public success(message: string): void {
    if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`✅ ${message}`);
    }
  }

  /**
   * Display info message
   */
  public info(message: string): void {
    if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`📥 ${message}`);
    }
  }

  /**
   * Display warning message
   */
  public warn(message: string): void {
    if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`⚠️  ${message}`);
    }
  }

  /**
   * Display error message
   */
  public error(message: string): void {
    if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`❌ ${message}`);
    }
  }

  /**
   * Display search/investigation message
   */
  public search(message: string): void {
    if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`🔍 ${message}`);
    }
  }

  /**
   * Display processing message
   */
  public processing(message: string): void {
    if (!this.quiet) {
      // eslint-disable-next-line no-console
      console.log(`⚙️  ${message}`);
    }
  }
}

/**
 * Calculate ETA based on elapsed time and progress
 */
export function calculateETA(elapsedMs: number, completed: number, total: number): number {
  if (completed === 0) {
    return 0;
  }
  const avgTimePerItem = elapsedMs / completed;
  const remaining = total - completed;
  return Math.ceil((remaining * avgTimePerItem) / 1000);
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}
