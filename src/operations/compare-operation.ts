/**
 * @fileoverview Compare Operation - Monadic Implementation
 *
 * This module implements the core compare logic using functional monadic patterns.
 * Following Error-Driven Development (EDD), all error cases are explicitly handled
 * using the ProfilerMonad for composable, type-safe operations.
 *
 * @module operations/compare-operation
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Org } from '@salesforce/core';
import { ProfilerMonad } from '../core/monad/profiler-monad.js';
import { success, failure } from '../core/monad/result.js';
import {
  NoLocalProfileError,
  NoOrgProfileError,
  InvalidXmlError,
  ComparisonTimeoutError,
} from '../core/errors/operation-errors.js';

/**
 * Input parameters for compare operation
 */
export type CompareInput = {
  /** Salesforce org connection */
  org: Org;
  /** Profile name to compare */
  profileName: string;
  /** Local project path */
  projectPath: string;
  /** API version to use */
  apiVersion: string;
  /** Optional timeout in milliseconds */
  timeoutMs?: number;
};

/**
 * Parsed profile XML structure (simplified)
 */
export type ProfileXml = {
  profile: Record<string, unknown>;
};

/**
 * Profile comparison result
 */
export type ProfileComparison = {
  profileName: string;
  differences: string[];
  localVersion: ProfileXml;
  orgVersion: ProfileXml;
  identical: boolean;
};

/**
 * Result of compare operation
 */
export type CompareResult = {
  comparisons: ProfileComparison[];
  totalDifferences: number;
  profilesCompared: number;
};

/**
 * Reads a local profile file from the project
 *
 * @param profileName - Name of the profile to read
 * @param projectPath - Path to the Salesforce project
 * @returns ProfilerMonad<string> - File contents
 *
 * @throws NoLocalProfileError if file doesn't exist
 */
export function readLocalProfile(profileName: string, projectPath: string): ProfilerMonad<string> {
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
      return success(content);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const localError = new NoLocalProfileError(profileName, profilePath);
      return failure(localError);
    }
  });
}

/**
 * Retrieves a profile from the org
 *
 * @param profileName - Name of the profile to retrieve
 * @param org - Salesforce org connection
 * @param apiVersion - API version to use
 * @returns ProfilerMonad<string> - Profile XML content
 *
 * @throws NoOrgProfileError if profile doesn't exist in org
 */
export function retrieveOrgProfile(profileName: string, org: Org, apiVersion: string): ProfilerMonad<string> {
  return new ProfilerMonad(async () => {
    try {
      const connection = org.getConnection(apiVersion);
      const metadata = await connection.metadata.list({ type: 'Profile' }, apiVersion);

      if (!metadata) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const orgError = new NoOrgProfileError(profileName, org.getUsername() ?? org.getOrgId());
        return failure(orgError);
      }

      const metadataArray = Array.isArray(metadata) ? metadata : [metadata];
      const profileExists = metadataArray.some((m) => m.fullName === profileName);

      if (!profileExists) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const orgError = new NoOrgProfileError(profileName, org.getUsername() ?? org.getOrgId());
        return failure(orgError);
      }

      // For now, return a placeholder
      // In a full implementation, this would use metadata.read() or retrieve()
      return success(
        '<?xml version="1.0" encoding="UTF-8"?>\n<Profile xmlns="http://soap.sforce.com/2006/04/metadata">\n</Profile>'
      );
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const orgError = new NoOrgProfileError(profileName, org.getUsername() ?? org.getOrgId());
      return failure(orgError);
    }
  });
}

/**
 * Parses profile XML content
 *
 * @param xmlContent - Raw XML string
 * @param source - Source of XML (for error messages)
 * @returns ProfilerMonad<ProfileXml> - Parsed XML object
 *
 * @throws InvalidXmlError if parsing fails
 */
export function parseProfileXml(xmlContent: string, source: string): ProfilerMonad<ProfileXml> {
  return new ProfilerMonad(() => {
    try {
      // For now, simple validation
      if (!xmlContent.includes('<?xml') || !xmlContent.includes('<Profile')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const xmlError = new InvalidXmlError(source, 'Missing XML declaration or Profile tag');
        return Promise.resolve(failure(xmlError));
      }

      // Placeholder - in full implementation would use xml2js or similar
      return Promise.resolve(
        success({
          profile: {
            _attributes: {},
            raw: xmlContent,
          },
        })
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const xmlError = new InvalidXmlError(source, err.message);
      return Promise.resolve(failure(xmlError));
    }
  });
}

/**
 * Compares two parsed profiles
 *
 * @param localProfile - Local profile XML
 * @param orgProfile - Org profile XML
 * @param profileName - Name of the profile
 * @returns ProfilerMonad<ProfileComparison> - Comparison result
 */
export function compareProfiles(
  localProfile: ProfileXml,
  orgProfile: ProfileXml,
  profileName: string
): ProfilerMonad<ProfileComparison> {
  return new ProfilerMonad(() => {
    // Placeholder comparison logic
    const differences: string[] = [];
    const identical = JSON.stringify(localProfile) === JSON.stringify(orgProfile);

    if (!identical) {
      differences.push('Profiles differ');
    }

    return Promise.resolve(
      success({
        profileName,
        differences,
        localVersion: localProfile,
        orgVersion: orgProfile,
        identical,
      })
    );
  });
}

/**
 * Main compare operation - composes all sub-operations
 *
 * This is the main entry point for the compare operation, following the EDD pattern:
 * 1. Read local profile
 * 2. Retrieve org profile
 * 3. Parse both profiles
 * 4. Compare them
 *
 * @param input - Compare input parameters
 * @returns ProfilerMonad<CompareResult> - Final compare result
 *
 * @example
 * ```typescript
 * const result = await compareProfileOperation({
 *   org,
 *   profileName: 'Admin',
 *   projectPath: '/path/to/project',
 *   apiVersion: '58.0',
 *   timeoutMs: 30_000
 * }).run();
 *
 * if (result.isSuccess()) {
 *   console.log(`Found ${result.value.totalDifferences} differences`);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function compareProfileOperation(input: CompareInput): ProfilerMonad<CompareResult> {
  const startTime = Date.now();
  const timeout = input.timeoutMs ?? 120_000; // 2 minutes default

  return readLocalProfile(input.profileName, input.projectPath)
    .chain((localContent) => {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const timeoutError = new ComparisonTimeoutError(1, timeout);
        return new ProfilerMonad(() => Promise.resolve(failure(timeoutError)));
      }

      return retrieveOrgProfile(input.profileName, input.org, input.apiVersion).map((orgContent) => ({
        localContent,
        orgContent,
      }));
    })
    .chain(({ localContent, orgContent }) =>
      // Parse local profile
      parseProfileXml(localContent, `local:${input.profileName}`).chain((localParsed) =>
        // Parse org profile
        parseProfileXml(orgContent, `org:${input.profileName}`).map((orgParsed) => ({ localParsed, orgParsed }))
      )
    )
    .chain(({ localParsed, orgParsed }) =>
      // Compare profiles
      compareProfiles(localParsed, orgParsed, input.profileName)
    )
    .map((comparison) => ({
      comparisons: [comparison],
      totalDifferences: comparison.differences.length,
      profilesCompared: 1,
    }));
}
