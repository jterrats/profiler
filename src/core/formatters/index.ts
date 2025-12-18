/**
 * Formatters - Output formatting utilities
 *
 * Exports all formatting functions for comparison matrices and results.
 *
 * @author Jaime Terrats
 * @license MIT
 */

export {
  formatComparisonMatrix,
  exportComparisonMatrix,
  type MatrixFormatOptions,
  type FormattedOutput,
} from './matrix-formatter.js';

export {
  formatMigrationPreview,
  exportMigrationPreview,
  type MigrationFormatOptions,
  type FormattedMigrationOutput,
} from './migration-formatter.js';
