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
import type { Org } from '@salesforce/core';
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
 * Detects conflicts between local and org profiles
 *
 * @param localProfile - Local profile XML
 * @param orgProfile - Org profile XML
 * @returns ProfilerMonad<MergeConflict[]> - List of conflicts
 */
export function detectConflicts(localProfile: ProfileXml, orgProfile: ProfileXml): ProfilerMonad<MergeConflict[]> {
  return new ProfilerMonad(() => {
    // Placeholder conflict detection logic
    const conflicts: MergeConflict[] = [];

    // In a real implementation, this would compare XML elements
    const identical = JSON.stringify(localProfile) === JSON.stringify(orgProfile);

    if (!identical) {
      conflicts.push({
        element: 'profile',
        localValue: 'local version',
        orgValue: 'org version',
      });
    }

    return Promise.resolve(success(conflicts));
  });
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
export function mergeProfiles(
  localProfile: ProfileXml,
  orgProfile: ProfileXml,
  conflicts: MergeConflict[],
  strategy: MergeStrategy,
  profileName: string
): ProfilerMonad<MergedProfile> {
  return new ProfilerMonad(() => {
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

    // Handle interactive strategy (not supported in non-TTY)
    if (strategy === 'interactive') {
      const conflictElements = conflicts.map((c) => c.element);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const conflictError = new MergeConflictError(profileName, conflictElements);
      return Promise.resolve(failure(conflictError));
    }

    // Merge based on strategy
    let mergedContent = '';

    switch (strategy) {
      case 'local':
        // Keep entire local version
        mergedContent = (localProfile.profile as { raw?: string }).raw ?? '';
        break;

      case 'org':
        // Use entire org version
        mergedContent = (orgProfile.profile as { raw?: string }).raw ?? '';
        break;

      case 'union':
        // Additive merge - combine all permissions
        // Placeholder: In real implementation, would merge XML elements
        mergedContent = (orgProfile.profile as { raw?: string }).raw ?? '';
        break;

      case 'local-wins':
        // Local wins for conflicts, add new from org
        // Placeholder: In real implementation, would:
        // - Keep local values for conflicting elements
        // - Add new elements from org that don't exist in local
        mergedContent = (localProfile.profile as { raw?: string }).raw ?? '';
        break;

      case 'org-wins':
        // Org wins for conflicts, preserve local additions
        // Placeholder: In real implementation, would:
        // - Keep org values for conflicting elements
        // - Add elements from local that don't exist in org
        mergedContent = (orgProfile.profile as { raw?: string }).raw ?? '';
        break;

      default:
        mergedContent = (orgProfile.profile as { raw?: string }).raw ?? '';
    }

    return Promise.resolve(
      success({
        content: mergedContent,
        conflicts,
        strategy,
        hasChanges: true,
      })
    );
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
 * @returns ProfilerMonad<string> - Path to written file
 */
export function writeMergedProfile(profileName: string, projectPath: string, content: string): ProfilerMonad<string> {
  return new ProfilerMonad(async () => {
    const profilePath = path.join(
      projectPath,
      'force-app',
      'main',
      'default',
      'profiles',
      `${profileName}.profile-meta.xml`
    );

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
 * const result = await mergeProfileOperation({
 *   org,
 *   profileName: 'Admin',
 *   projectPath: '/path/to/project',
 *   strategy: 'auto',
 *   apiVersion: '58.0',
 *   skipBackup: false
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
  // For now, return a placeholder implementation
  // Full implementation would integrate with compare and retrieve operations
  return validateMergeStrategy(input.strategy)
    .chain((strategy) => {
      if (input.skipBackup) {
        return new ProfilerMonad(() =>
          Promise.resolve(
            success({
              strategy,
              backupPath: undefined,
            })
          )
        );
      }
      return createBackup(input.profileName, input.projectPath).map((backupPath) => ({
        strategy,
        backupPath,
      }));
    })
    .map(
      ({ strategy, backupPath }: { strategy: MergeStrategy; backupPath: string | undefined }): MergeResult => ({
        profileName: input.profileName,
        merged: true,
        backupPath,
        conflicts: 0,
        strategy,
      })
    );
}
