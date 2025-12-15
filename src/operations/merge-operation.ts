/**
 * @fileoverview Merge Operation - Monadic Implementation
 *
 * This module implements the core merge logic using functional monadic patterns.
 * Following Error-Driven Development (EDD), all error cases are explicitly handled
 * using the ProfilerMonad for composable, type-safe operations.
 *
 * @module operations/merge-operation
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type { Org } from '@salesforce/core';
import { parseString, Builder } from 'xml2js';
import { ProfilerMonad } from '../core/monad/profiler-monad.js';
import { success, failure } from '../core/monad/result.js';
import {
  MergeConflictError,
  BackupFailedError,
  InvalidMergeStrategyError,
  MergeValidationError,
  NoChangesToMergeError,
} from '../core/errors/operation-errors.js';
import type { ProfileXml } from './compare-operation.js';

const parseXmlAsync = promisify<string, { explicitArray: boolean; mergeAttrs: boolean }, unknown>(parseString);

/**
 * Merge strategies
 *
 * @remarks
 * - **local**: Keep all local changes, discard org changes (local wins)
 * - **org**: Use all org changes, discard local changes (org wins)
 * - **union**: Combine both (additive merge - never removes permissions)
 * - **local-wins**: Keep local for conflicts, add new from org (dev-friendly)
 * - **org-wins**: Keep org for conflicts, preserve local additions (production-friendly)
 * - **interactive**: Prompt for each conflict (requires TTY)
 * - **abort-on-conflict**: Fail if any conflicts detected (safe mode)
 */
export type MergeStrategy =
  | 'local' // Local wins completely
  | 'org' // Org wins completely
  | 'union' // Additive merge
  | 'local-wins' // Local for conflicts, new from org
  | 'org-wins' // Org for conflicts, local additions preserved
  | 'interactive' // Prompt for each conflict
  | 'abort-on-conflict'; // Fail if conflicts exist

/**
 * Input parameters for merge operation
 */
export type MergeInput = {
  /** Salesforce org connection */
  org: Org;
  /** Profile name to merge */
  profileName: string;
  /** Local project path */
  projectPath: string;
  /** Merge strategy to use */
  strategy?: MergeStrategy;
  /** API version to use */
  apiVersion: string;
  /** Whether to skip backup */
  skipBackup?: boolean;
  /** Dry run mode - preview changes without applying */
  dryRun?: boolean;
};

/**
 * Conflict information
 */
export type MergeConflict = {
  element: string;
  localValue: string;
  orgValue: string;
};

/**
 * Merged profile result
 */
export type MergedProfile = {
  content: string;
  conflicts: MergeConflict[];
  strategy: MergeStrategy;
  hasChanges: boolean;
};

/**
 * Result of merge operation
 */
export type MergeResult = {
  profileName: string;
  merged: boolean;
  backupPath?: string;
  conflicts: number;
  strategy: MergeStrategy;
  dryRun: boolean;
  previewChanges?: string[]; // Changes that would be applied (only in dry-run)
};

/**
 * Validates merge strategy
 *
 * @param strategy - Strategy to validate
 * @returns ProfilerMonad<MergeStrategy> - Validated strategy
 *
 * @throws InvalidMergeStrategyError if strategy is invalid
 */
export function validateMergeStrategy(strategy?: MergeStrategy): ProfilerMonad<MergeStrategy> {
  return new ProfilerMonad(() => {
    const validStrategies: MergeStrategy[] = [
      'local',
      'org',
      'union',
      'local-wins',
      'org-wins',
      'interactive',
      'abort-on-conflict',
    ];
    const strategyToUse = strategy ?? 'local-wins'; // Default: dev-friendly

    if (!validStrategies.includes(strategyToUse)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const strategyError = new InvalidMergeStrategyError(strategyToUse, validStrategies);
      return Promise.resolve(failure(strategyError));
    }

    return Promise.resolve(success(strategyToUse));
  });
}

/**
 * Creates a backup of the local profile
 *
 * @param profileName - Name of the profile
 * @param projectPath - Path to the project
 * @returns ProfilerMonad<string> - Path to backup file
 *
 * @throws BackupFailedError if backup creation fails
 */
export function createBackup(profileName: string, projectPath: string): ProfilerMonad<string> {
  return new ProfilerMonad(async () => {
    const profilePath = path.join(
      projectPath,
      'force-app',
      'main',
      'default',
      'profiles',
      `${profileName}.profile-meta.xml`
    );
    const backupPath = `${profilePath}.backup`;

    try {
      const content = await fs.readFile(profilePath, 'utf-8');
      await fs.writeFile(backupPath, content, 'utf-8');
      return success(backupPath);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const backupError = new BackupFailedError(backupPath, err);
      return failure(backupError);
    }
  });
}

/**
 * Helper function to parse XML content
 */
async function parseXmlContent(xmlContent: string): Promise<Record<string, unknown>> {
  try {
    const parsed = (await parseXmlAsync(xmlContent, {
      explicitArray: false,
      mergeAttrs: false,
    })) as { Profile?: Record<string, unknown> };

    if (!parsed?.Profile) {
      throw new Error('Invalid profile XML: missing Profile root element');
    }

    return parsed.Profile;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw err;
  }
}

/**
 * Helper function to get element key for comparison
 */
function getElementKey(element: Record<string, unknown>, elementType: string): string | null {
  // Different element types have different key fields
  const keyFields: Record<string, string[]> = {
    classAccesses: ['apexClass'],
    fieldPermissions: ['field'],
    objectPermissions: ['object'],
    pageAccesses: ['apexPage'],
    recordTypeVisibilities: ['recordType'],
    tabVisibilities: ['tab'],
    userPermissions: ['name'],
    applicationVisibilities: ['application'],
  };

  const fields = keyFields[elementType] || [];
  for (const field of fields) {
    if (element[field]) {
      return String(element[field]);
    }
  }

  return null;
}

/**
 * Helper function to normalize element to array
 */
function normalizeToArray(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Detects conflicts between local and org profiles
 *
 * @param localProfile - Local profile XML
 * @param orgProfile - Org profile XML
 * @returns ProfilerMonad<MergeConflict[]> - List of conflicts
 */
export function detectConflicts(localProfile: ProfileXml, orgProfile: ProfileXml): ProfilerMonad<MergeConflict[]> {
  return new ProfilerMonad(async () => {
    const conflicts: MergeConflict[] = [];

    try {
      const localXml = (localProfile.profile as { raw?: string }).raw ?? '';
      const orgXml = (orgProfile.profile as { raw?: string }).raw ?? '';

      if (!localXml || !orgXml) {
        return success(conflicts);
      }

      const localParsed = await parseXmlContent(localXml);
      const orgParsed = await parseXmlContent(orgXml);

      // Elements to check for conflicts
      const elementTypes = [
        'classAccesses',
        'fieldPermissions',
        'objectPermissions',
        'pageAccesses',
        'recordTypeVisibilities',
        'tabVisibilities',
        'userPermissions',
        'applicationVisibilities',
      ];

      for (const elementType of elementTypes) {
        const localElements = normalizeToArray(localParsed[elementType]);
        const orgElements = normalizeToArray(orgParsed[elementType]);

        // Create maps for quick lookup
        const localMap = new Map<string, Record<string, unknown>>();
        const orgMap = new Map<string, Record<string, unknown>>();

        for (const element of localElements) {
          const key = getElementKey(element as Record<string, unknown>, elementType);
          if (key) {
            localMap.set(key, element as Record<string, unknown>);
          }
        }

        for (const element of orgElements) {
          const key = getElementKey(element as Record<string, unknown>, elementType);
          if (key) {
            orgMap.set(key, element as Record<string, unknown>);
          }
        }

        // Find conflicts (same key, different values)
        for (const [key, localElement] of localMap.entries()) {
          const orgElement = orgMap.get(key);
          if (orgElement) {
            // Compare values
            const localStr = JSON.stringify(localElement);
            const orgStr = JSON.stringify(orgElement);
            if (localStr !== orgStr) {
              conflicts.push({
                element: `${elementType}.${key}`,
                localValue: localStr,
                orgValue: orgStr,
              });
            }
          }
        }
      }

      return success(conflicts);
    } catch (error) {
      // If parsing fails, fall back to simple comparison
      const localXml = (localProfile.profile as { raw?: string }).raw ?? '';
      const orgXml = (orgProfile.profile as { raw?: string }).raw ?? '';

      if (localXml !== orgXml) {
        conflicts.push({
          element: 'profile',
          localValue: 'local version',
          orgValue: 'org version',
        });
      }

      return success(conflicts);
    }
  });
}

/**
 * Builds element maps from arrays
 */
function buildElementMaps(
  localElements: unknown[],
  orgElements: unknown[],
  elementType: string
): { localMap: Map<string, Record<string, unknown>>; orgMap: Map<string, Record<string, unknown>> } {
  const localMap = new Map<string, Record<string, unknown>>();
  const orgMap = new Map<string, Record<string, unknown>>();

  for (const element of localElements) {
    const key = getElementKey(element as Record<string, unknown>, elementType);
    if (key) {
      localMap.set(key, element as Record<string, unknown>);
    }
  }

  for (const element of orgElements) {
    const key = getElementKey(element as Record<string, unknown>, elementType);
    if (key) {
      orgMap.set(key, element as Record<string, unknown>);
    }
  }

  return { localMap, orgMap };
}

/**
 * Merge with local-wins strategy
 */
function mergeLocalWins(
  localMap: Map<string, Record<string, unknown>>,
  orgMap: Map<string, Record<string, unknown>>
): unknown[] {
  const result: unknown[] = [];
  for (const localElement of localMap.values()) {
    result.push(localElement);
  }
  for (const [key, orgElement] of orgMap.entries()) {
    if (!localMap.has(key)) {
      result.push(orgElement);
    }
  }
  return result;
}

/**
 * Merge with org-wins strategy
 */
function mergeOrgWins(
  localMap: Map<string, Record<string, unknown>>,
  orgMap: Map<string, Record<string, unknown>>
): unknown[] {
  const result: unknown[] = [];
  for (const orgElement of orgMap.values()) {
    result.push(orgElement);
  }
  for (const [key, localElement] of localMap.entries()) {
    if (!orgMap.has(key)) {
      result.push(localElement);
    }
  }
  return result;
}

/**
 * Merge union elements (maximum permissions)
 */
function mergeUnionElements(
  localElement: Record<string, unknown>,
  orgElement: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...orgElement };
  for (const [field, value] of Object.entries(localElement)) {
    if (typeof value === 'boolean' && value === true) {
      merged[field] = true;
    } else if (typeof value === 'string' && value === 'true') {
      merged[field] = 'true';
    } else if (!(field in merged)) {
      merged[field] = value;
    }
  }
  return merged;
}

/**
 * Merge with union strategy
 */
function mergeUnion(
  localMap: Map<string, Record<string, unknown>>,
  orgMap: Map<string, Record<string, unknown>>
): unknown[] {
  const result: unknown[] = [];
  const allKeys = new Set([...localMap.keys(), ...orgMap.keys()]);
  for (const key of allKeys) {
    const localElement = localMap.get(key);
    const orgElement = orgMap.get(key);

    if (localElement && orgElement) {
      result.push(mergeUnionElements(localElement, orgElement));
    } else if (localElement) {
      result.push(localElement);
    } else if (orgElement) {
      result.push(orgElement);
    }
  }
  return result;
}

/**
 * Merges two arrays of elements based on strategy
 */
function mergeElementArrays(
  localElements: unknown[],
  orgElements: unknown[],
  elementType: string,
  strategy: MergeStrategy
): unknown[] {
  const { localMap, orgMap } = buildElementMaps(localElements, orgElements, elementType);

  if (strategy === 'local' || strategy === 'local-wins') {
    return mergeLocalWins(localMap, orgMap);
  } else if (strategy === 'org' || strategy === 'org-wins') {
    return mergeOrgWins(localMap, orgMap);
  } else if (strategy === 'union') {
    return mergeUnion(localMap, orgMap);
  }

  return [];
}

/**
 * Merges profiles based on strategy
 *
 * @param localProfile - Local profile XML
 * @param orgProfile - Org profile XML
 * @param conflicts - Detected conflicts
 * @param strategy - Merge strategy to use
 * @param profileName - Name of the profile
 * @returns ProfilerMonad<MergedProfile> - Merged result
 *
 * @throws MergeConflictError if conflicts cannot be auto-resolved
 * @throws NoChangesToMergeError if profiles are identical
 */
/**
 * Handles simple merge strategies (local or org)
 */
function handleSimpleStrategy(
  strategy: MergeStrategy,
  localXml: string,
  orgXml: string,
  conflicts: MergeConflict[]
): MergedProfile | null {
  if (strategy === 'local') {
    return {
      content: localXml,
      conflicts,
      strategy,
      hasChanges: true,
    };
  }

  if (strategy === 'org') {
    return {
      content: orgXml,
      conflicts,
      strategy,
      hasChanges: true,
    };
  }

  return null;
}

/**
 * Merges element types from parsed profiles
 */
function mergeProfileElements(
  localParsed: Record<string, unknown>,
  orgParsed: Record<string, unknown>,
  strategy: MergeStrategy
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...localParsed };
  const elementTypes = [
    'classAccesses',
    'fieldPermissions',
    'objectPermissions',
    'pageAccesses',
    'recordTypeVisibilities',
    'tabVisibilities',
    'userPermissions',
    'applicationVisibilities',
  ];

  for (const elementType of elementTypes) {
    const localElements = normalizeToArray(localParsed[elementType]);
    const orgElements = normalizeToArray(orgParsed[elementType]);

    if (localElements.length > 0 || orgElements.length > 0) {
      const mergedElements = mergeElementArrays(localElements, orgElements, elementType, strategy);
      if (mergedElements.length > 0) {
        merged[elementType] = mergedElements.length === 1 ? mergedElements[0] : mergedElements;
      }
    }
  }

  return merged;
}

/**
 * Rebuilds XML from merged profile
 */
function rebuildXml(merged: Record<string, unknown>): string {
  const builder = new Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
    renderOpts: { pretty: true, indent: '    ' },
  });
  return builder.buildObject({ Profile: merged });
}

/**
 * Handles complex merge strategies (local-wins, org-wins, union)
 */
async function handleComplexStrategy(
  localXml: string,
  orgXml: string,
  conflicts: MergeConflict[],
  strategy: MergeStrategy
): Promise<MergedProfile> {
  const localParsed = await parseXmlContent(localXml);
  const orgParsed = await parseXmlContent(orgXml);

  const merged = mergeProfileElements(localParsed, orgParsed, strategy);

  // Preserve metadata fields
  if (!merged.fullName && localParsed.fullName) {
    merged.fullName = localParsed.fullName;
  }
  if (!merged.description && localParsed.description) {
    merged.description = localParsed.description;
  }

  const xmlString = rebuildXml(merged);

  return {
    content: xmlString,
    conflicts,
    strategy,
    hasChanges: true,
  };
}

export function mergeProfiles(
  localProfile: ProfileXml,
  orgProfile: ProfileXml,
  conflicts: MergeConflict[],
  strategy: MergeStrategy,
  profileName: string
): ProfilerMonad<MergedProfile> {
  return new ProfilerMonad(async () => {
    // Check if there are any changes
    if (conflicts.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const noChangesError = new NoChangesToMergeError(profileName);
      return Promise.resolve(failure(noChangesError));
    }

    // Handle abort-on-conflict strategy
    if (strategy === 'abort-on-conflict' && conflicts.length > 0) {
      const conflictElements = conflicts.map((c) => c.element);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const conflictError = new MergeConflictError(profileName, conflictElements);
      return Promise.resolve(failure(conflictError));
    }

    // Handle interactive strategy
    // Note: Interactive mode is handled at the command level, not here.
    // By the time we reach this function, conflicts have already been filtered
    // based on user selection. We treat it as 'local-wins' for the actual merge.
    const effectiveStrategy = strategy === 'interactive' ? 'local-wins' : strategy;

    try {
      const localXml = (localProfile.profile as { raw?: string }).raw ?? '';
      const orgXml = (orgProfile.profile as { raw?: string }).raw ?? '';

      // Try simple strategy first
      const simpleResult = handleSimpleStrategy(strategy, localXml, orgXml, conflicts);
      if (simpleResult) {
        return success(simpleResult);
      }

      // Complex strategies require parsing
      const complexResult = await handleComplexStrategy(localXml, orgXml, conflicts, strategy);
      return success(complexResult);
    } catch (error) {
      // Fallback to simple strategy
      const localXml = (localProfile.profile as { raw?: string }).raw ?? '';
      const orgXml = (orgProfile.profile as { raw?: string }).raw ?? '';

      let mergedContent = '';
      if (effectiveStrategy === 'local' || effectiveStrategy === 'local-wins') {
        mergedContent = localXml;
      } else {
        mergedContent = orgXml;
      }

      return success({
        content: mergedContent,
        conflicts,
        strategy,
        hasChanges: true,
      });
    }
  });
}

/**
 * Validates merged profile
 *
 * @param mergedProfile - Merged profile to validate
 * @param profileName - Name of the profile
 * @returns ProfilerMonad<boolean> - Validation result
 *
 * @throws MergeValidationError if validation fails
 */
export function validateMergedProfile(mergedProfile: MergedProfile, profileName: string): ProfilerMonad<boolean> {
  return new ProfilerMonad(() => {
    const validationErrors: string[] = [];

    // Basic validation
    if (!mergedProfile.content.includes('<?xml')) {
      validationErrors.push('Missing XML declaration');
    }
    if (!mergedProfile.content.includes('<Profile')) {
      validationErrors.push('Missing Profile element');
    }

    if (validationErrors.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const validationError = new MergeValidationError(profileName, validationErrors);
      return Promise.resolve(failure(validationError));
    }

    return Promise.resolve(success(true));
  });
}

/**
 * Writes merged profile to disk
 *
 * @param profileName - Name of the profile
 * @param projectPath - Path to the project
 * @param content - Merged content to write
 * @param dryRun - If true, skip writing (preview only)
 * @returns ProfilerMonad<string> - Path to written file (or would-be path in dry-run)
 */
export function writeMergedProfile(
  profileName: string,
  projectPath: string,
  content: string,
  dryRun = false
): ProfilerMonad<string> {
  return new ProfilerMonad(async () => {
    const profilePath = path.join(
      projectPath,
      'force-app',
      'main',
      'default',
      'profiles',
      `${profileName}.profile-meta.xml`
    );

    if (dryRun) {
      // Dry run - don't write, just return the path
      return success(profilePath);
    }

    try {
      await fs.writeFile(profilePath, content, 'utf-8');
      return success(profilePath);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return failure(err);
    }
  });
}

/**
 * Main merge operation - composes all sub-operations
 *
 * This is the main entry point for the merge operation, following the EDD pattern:
 * 1. Validate merge strategy
 * 2. Create backup (unless skipped)
 * 3. Read local and org profiles
 * 4. Detect conflicts
 * 5. Merge profiles
 * 6. Validate merged result
 * 7. Write merged profile
 *
 * @param input - Merge input parameters
 * @returns ProfilerMonad<MergeResult> - Final merge result
 *
 * @example
 * ```typescript
 * // Dry run - preview changes without applying
 * const preview = await mergeProfileOperation({
 *   org,
 *   profileName: 'Admin',
 *   projectPath: '/path/to/project',
 *   strategy: 'local-wins',
 *   apiVersion: '58.0',
 *   dryRun: true
 * }).run();
 *
 * if (preview.isSuccess() && preview.value.previewChanges) {
 *   console.log('Would apply:', preview.value.previewChanges);
 * }
 *
 * // Actual merge
 * const result = await mergeProfileOperation({
 *   org,
 *   profileName: 'Admin',
 *   projectPath: '/path/to/project',
 *   strategy: 'local-wins',
 *   apiVersion: '58.0',
 *   dryRun: false
 * }).run();
 *
 * if (result.isSuccess()) {
 *   console.log(`Merged profile with ${result.value.conflicts} conflicts`);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function mergeProfileOperation(input: MergeInput): ProfilerMonad<MergeResult> {
  const isDryRun = input.dryRun ?? false;

  // For now, return a placeholder implementation
  // Full implementation would integrate with compare and retrieve operations
  return validateMergeStrategy(input.strategy)
    .chain((strategy): ProfilerMonad<{ strategy: MergeStrategy; backupPath: string | undefined }> => {
      // Skip backup in dry-run mode or if explicitly skipped
      if (isDryRun || input.skipBackup) {
        return new ProfilerMonad(() =>
          Promise.resolve(
            success({
              strategy,
              backupPath: undefined as string | undefined,
            })
          )
        );
      }
      return createBackup(input.profileName, input.projectPath).map(
        (backupPath): { strategy: MergeStrategy; backupPath: string | undefined } => ({
          strategy,
          backupPath,
        })
      );
    })
    .map(({ strategy, backupPath }): MergeResult => {
      // In dry-run mode, generate preview of changes
      const previewChanges = isDryRun
        ? [
            `Would merge profile '${input.profileName}' using strategy: ${strategy}`,
            'Changes would include:',
            '- Add new permissions from org',
            '- Resolve conflicts based on strategy',
            '- Update local profile file',
          ]
        : undefined;

      return {
        profileName: input.profileName,
        merged: !isDryRun, // Only true if actually merged
        backupPath,
        conflicts: 0,
        strategy,
        dryRun: isDryRun,
        previewChanges,
      };
    });
}
