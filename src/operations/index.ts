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
  type CompareInput,
  type CompareResult,
  type ProfileXml,
  type ProfileComparison,
} from './compare-operation.js';
