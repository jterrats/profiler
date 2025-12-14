/**
 * @fileoverview Operations Module - Monadic Core Operations
 *
 * This module exports all core operations implemented using functional monadic patterns.
 * Each operation follows Error-Driven Development (EDD) principles with explicit error
 * handling and composable functions.
 *
 * @module operations
 */

// Retrieve Operation
export {
  retrieveProfiles,
  validateProfileNames,
  listMetadataType,
  listAllMetadata,
  generatePackageXml,
  type RetrieveInput,
  type RetrieveResult,
  type MetadataTypeMembers,
  type MetadataListResult,
  type PackageXmlResult,
} from './retrieve-operation.js';

// Compare Operation
export {
  compareProfileOperation,
  readLocalProfile,
  retrieveOrgProfile,
  parseProfileXml,
  compareProfiles,
  // Multi-Source Comparison (Issue #14)
  compareMultiSource,
  retrieveFromMultipleSources,
  buildComparisonMatrix,
  // Internal function exported for merge operation
  retrieveProfileWithMetadata,
  type CompareInput,
  type CompareResult,
  type ProfileXml,
  type ProfileComparison,
  // Multi-Source Types
  type MultiSourceCompareInput,
  type MultiSourceCompareResult,
  type OrgSource,
  type OrgProfileResult,
  type ComparisonMatrix,
} from './compare-operation.js';

// Merge Operation
export {
  mergeProfileOperation,
  validateMergeStrategy,
  createBackup,
  detectConflicts,
  mergeProfiles,
  validateMergedProfile,
  writeMergedProfile,
  type MergeInput,
  type MergeResult,
  type MergeStrategy,
  type MergeConflict,
  type MergedProfile,
} from './merge-operation.js';

// Validate Operation
export {
  validateProfileOperation,
  readProfileXml as readProfileXmlForValidation,
  detectDuplicates,
  detectInvalidPermissions,
  detectMissingReferences,
  type ValidateInput,
  type ValidationResult,
  type ValidationIssue,
} from './validate-operation.js';
