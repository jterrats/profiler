/*
 * Copyright (c) 2024, Jorge Terrats
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Validate Operation - Monadic implementation
 *
 * Validates profile XML for:
 * - Missing metadata references
 * - Duplicate entries
 * - Invalid permissions
 * - XML structure issues
 *
 * All functions use ProfilerMonad for composable, type-safe error handling.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { type ParserOptions, parseString } from 'xml2js';
import { Org } from '@salesforce/core';

const parseXmlAsync = promisify<string, ParserOptions, unknown>(parseString);

import { ProfilerMonad, success, failure } from '../core/monad/index.js';
import {
  MissingMetadataReferenceError,
  DuplicateEntryError,
  InvalidPermissionError,
  InvalidXmlError,
} from '../core/errors/operation-errors.js';

/**
 * Profile validation result
 */
export type ValidationIssue = {
  type: 'missing-reference' | 'duplicate' | 'invalid-permission' | 'xml-error';
  severity: 'error' | 'warning';
  element: string;
  message: string;
  suggestion?: string;
};

export type ValidationResult = {
  profileName: string;
  valid: boolean;
  issues: ValidationIssue[];
  fixable: boolean; // Can issues be auto-fixed?
};

/**
 * Input parameters for validation
 */
export type ValidateInput = {
  /** Profile name to validate */
  profileName: string;
  /** Local project path */
  projectPath: string;
  /** Org connection for metadata verification */
  org?: Org;
  /** API version */
  apiVersion?: string;
  /** Auto-fix issues if possible */
  fix?: boolean;
};

/**
 * Reads and parses profile XML
 *
 * @param profileName - Name of the profile
 * @param projectPath - Path to the project
 * @returns ProfilerMonad<ParsedProfile> - Parsed profile data
 */
export function readProfileXml(profileName: string, projectPath: string): ProfilerMonad<Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
      const content = await fs.readFile(profilePath, 'utf-8');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const parsed = (await parseXmlAsync(content, {
        explicitArray: false,
        mergeAttrs: false,
      })) as { Profile?: unknown };

      if (!parsed?.Profile) {
        const errMsg = 'Invalid profile XML: missing Profile root element';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return failure(new InvalidXmlError(profilePath, errMsg));
      }

      // XML parser returns any type - we cast to Record<string, unknown> for safety
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return success(parsed.Profile as Record<string, unknown>);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return failure(new InvalidXmlError(profilePath, err.message));
    }
  });
}

/**
 * Detects duplicate entries in profile
 *
 * @param profileName - Name of the profile
 * @param profileData - Parsed profile data
 * @returns ProfilerMonad<string[]> - List of duplicate entries
 */
export function detectDuplicates(
  profileName: string,
  profileData: Record<string, unknown>
): ProfilerMonad<Array<{ type: string; name: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return new ProfilerMonad(() => {
    const duplicates: Array<{ type: string; name: string }> = [];

    // Check common profile elements for duplicates
    const elementsToCheck = [
      'applicationVisibilities',
      'classAccesses',
      'fieldPermissions',
      'objectPermissions',
      'pageAccesses',
      'recordTypeVisibilities',
      'tabVisibilities',
      'userPermissions',
    ];

    for (const elementType of elementsToCheck) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const elements = profileData[elementType];
      if (!elements) continue;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const elementArray = Array.isArray(elements) ? elements : [elements];
      const seen = new Set<string>();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      for (const element of elementArray) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const name = element.field || element.object || element.apexClass || element.apexPage || element.application;
        if (name && seen.has(name as string)) {
          duplicates.push({ type: elementType, name: name as string });
        }
        if (name) seen.add(name as string);
      }
    }

    if (duplicates.length > 0) {
      const err = new DuplicateEntryError(profileName, duplicates);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return Promise.resolve(failure(err));
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return Promise.resolve(success(duplicates));
  });
}

/**
 * Detects invalid permissions in profile
 *
 * @param profileName - Name of the profile
 * @param profileData - Parsed profile data
 * @returns ProfilerMonad<Array<{permission: string, issue: string}>> - Invalid permissions
 */
export function detectInvalidPermissions(
  profileName: string,
  profileData: Record<string, unknown>
): ProfilerMonad<Array<{ object: string; issue: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return new ProfilerMonad(() => {
    const invalidPermissions: Array<{ object: string; issue: string }> = [];

    // Check fieldPermissions for invalid combinations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fieldPermissions = profileData.fieldPermissions;
    if (fieldPermissions) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const fieldArray = Array.isArray(fieldPermissions) ? fieldPermissions : [fieldPermissions];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      for (const field of fieldArray) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const fieldName = field.field;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const readable = field.readable;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const editable = field.editable;

        // Editable requires readable (handle both boolean and string values from XML)
        const isEditable = editable === true || editable === 'true';
        const isNotReadable = readable === false || readable === 'false';

        if (isEditable && isNotReadable) {
          invalidPermissions.push({
            object: `fieldPermissions: ${fieldName as string}`,
            issue: 'editable=true requires readable=true',
          });
        }
      }
    }

    // Check objectPermissions for invalid combinations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const objectPermissions = profileData.objectPermissions;
    if (objectPermissions) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const objectArray = Array.isArray(objectPermissions) ? objectPermissions : [objectPermissions];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      for (const obj of objectArray) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const objName = obj.object;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const allowCreate = obj.allowCreate;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const allowRead = obj.allowRead;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const allowEdit = obj.allowEdit;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const allowDelete = obj.allowDelete;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const modifyAllRecords = obj.modifyAllRecords;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const viewAllRecords = obj.viewAllRecords;

        // Create/Edit/Delete require Read (handle both boolean and string values from XML)
        const hasCreate = allowCreate === true || allowCreate === 'true';
        const hasEdit = allowEdit === true || allowEdit === 'true';
        const hasDelete = allowDelete === true || allowDelete === 'true';
        const hasRead = allowRead === true || allowRead === 'true';
        const hasModifyAll = modifyAllRecords === true || modifyAllRecords === 'true';
        const hasViewAll = viewAllRecords === true || viewAllRecords === 'true';

        if ((hasCreate || hasEdit || hasDelete) && !hasRead) {
          invalidPermissions.push({
            object: `objectPermissions: ${objName as string}`,
            issue: 'allowCreate/Edit/Delete requires allowRead=true',
          });
        }

        // ModifyAll requires Edit and ViewAll
        if (hasModifyAll && (!hasEdit || !hasViewAll)) {
          invalidPermissions.push({
            object: `objectPermissions: ${objName as string}`,
            issue: 'modifyAllRecords requires allowEdit=true and viewAllRecords=true',
          });
        }
      }
    }

    if (invalidPermissions.length > 0) {
      const err = new InvalidPermissionError(profileName, invalidPermissions);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return Promise.resolve(failure(err));
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return Promise.resolve(success(invalidPermissions));
  });
}

/**
 * Validates profile against org metadata (if org provided)
 *
 * @param profileName - Name of the profile
 * @param profileData - Parsed profile data
 * @param org - Org connection
 * @param apiVersion - API version
 * @returns ProfilerMonad<string[]> - Missing references
 */
export function detectMissingReferences(
  profileName: string,
  _profileData: Record<string, unknown>,
  org?: Org,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _apiVersion = '60.0'
): ProfilerMonad<Array<{ type: string; name: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return new ProfilerMonad(() => {
    // If no org provided, skip reference validation
    if (!org) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return Promise.resolve(success([]));
    }

    const missingReferences: Array<{ type: string; name: string }> = [];

    // TODO: Implement actual metadata verification against org
    // For now, this is a placeholder that would:
    // 1. Extract all referenced metadata (classes, pages, objects, fields, etc.)
    // 2. Query org metadata to verify each reference exists
    // 3. Collect any missing references

    // Placeholder implementation (would be async when implemented)
    // const connection = org.getConnection(_apiVersion);
    // ... metadata queries ...

    if (missingReferences.length > 0) {
      const err = new MissingMetadataReferenceError(profileName, missingReferences);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return Promise.resolve(failure(err));
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return Promise.resolve(success(missingReferences));
  });
}

/**
 * Main validation operation
 *
 * Validates a profile for common issues:
 * 1. XML structure validity
 * 2. Duplicate entries
 * 3. Invalid permission combinations
 * 4. Missing metadata references (if org provided)
 *
 * @param input - Validation input parameters
 * @returns ProfilerMonad<ValidationResult> - Validation result with all issues
 *
 * @example
 * ```typescript
 * // Basic validation (local only)
 * const result = await validateProfileOperation({
 *   profileName: 'Admin',
 *   projectPath: '/path/to/project'
 * }).run();
 *
 * if (result.isSuccess() && !result.value.valid) {
 *   console.log('Issues found:', result.value.issues);
 * }
 *
 * // Validation with org reference check
 * const result = await validateProfileOperation({
 *   profileName: 'Admin',
 *   projectPath: '/path/to/project',
 *   org: myOrg,
 *   apiVersion: '60.0'
 * }).run();
 *
 * // Validation with auto-fix
 * const result = await validateProfileOperation({
 *   profileName: 'Admin',
 *   projectPath: '/path/to/project',
 *   fix: true
 * }).run();
 * ```
 */
export function validateProfileOperation(input: ValidateInput): ProfilerMonad<ValidationResult> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return readProfileXml(input.profileName, input.projectPath)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .chain((profileData: Record<string, unknown>) => {
      // Run all validations in parallel and collect results
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      const duplicatesMonad = detectDuplicates(input.profileName, profileData).recover(() => []);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      const invalidPermsMonad = detectInvalidPermissions(input.profileName, profileData).recover(() => []);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      const missingRefsMonad = detectMissingReferences(input.profileName, profileData, input.org, input.apiVersion).recover(() => []);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return ProfilerMonad.all([duplicatesMonad, invalidPermsMonad, missingRefsMonad]).map(
        ([
          duplicates,
          invalidPerms,
          missingRefs,
        ]: [
          Array<{ type: string; name: string }>,
          Array<{ object: string; issue: string }>,
          Array<{ type: string; name: string }>
        ]) => {
          const issues: ValidationIssue[] = [];

          // Collect duplicate issues
          if (Array.isArray(duplicates) && duplicates.length > 0) {
            for (const dup of duplicates) {
              issues.push({
                type: 'duplicate',
                severity: 'error',
                element: `${dup.type}: ${dup.name}`,
                message: 'Duplicate entry found',
                suggestion: 'Remove duplicate entries',
              });
            }
          }

          // Collect invalid permission issues
          if (Array.isArray(invalidPerms) && invalidPerms.length > 0) {
            for (const perm of invalidPerms) {
              issues.push({
                type: 'invalid-permission',
                severity: 'error',
                element: perm.object,
                message: perm.issue,
                suggestion: 'Fix permission combination',
              });
            }
          }

          // Collect missing reference issues
          if (Array.isArray(missingRefs) && missingRefs.length > 0) {
            for (const ref of missingRefs) {
              issues.push({
                type: 'missing-reference',
                severity: 'warning',
                element: `${ref.type}: ${ref.name}`,
                message: 'Referenced metadata not found in org',
                suggestion: 'Deploy referenced metadata or remove reference',
              });
            }
          }

          const valid = issues.filter((i) => i.severity === 'error').length === 0;
          const fixable = issues.some((i) => i.type === 'duplicate' || i.type === 'invalid-permission');

          return {
            profileName: input.profileName,
            valid,
            issues,
            fixable,
          };
        }
      );
    })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .recover((error): ValidationResult =>
      // If validation fails (e.g., can't read file), return error as issue
      ({
        profileName: input.profileName,
        valid: false,
        issues: [
          {
            type: 'xml-error',
            severity: 'error',
            element: 'Profile',
            message: error.message,
            suggestion: 'Fix XML structure',
          },
        ],
        fixable: false,
      })
    );
}

