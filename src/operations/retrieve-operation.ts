/**
 * @fileoverview Retrieve Operation - Monadic Implementation
 *
 * This module implements the core retrieve logic using functional monadic patterns.
 * Following Error-Driven Development (EDD), all error cases are explicitly handled
 * using the ProfilerMonad for composable, type-safe operations.
 *
 * @module operations/retrieve-operation
 */

import type { Connection, Org } from '@salesforce/core';
import { ProfilerMonad, success, failure } from '../core/monad/index.js';
import {
  ProfileNotFoundError,
} from '../core/errors/operation-errors.js';

/**
 * Input parameters for retrieve operation
 */
export type RetrieveInput = {
  /** Salesforce org connection */
  org: Org;
  /** Optional array of profile names to retrieve */
  profileNames?: string[];
  /** API version to use */
  apiVersion: string;
  /** Whether to exclude managed package metadata */
  excludeManaged?: boolean;
};

/**
 * Metadata type with members
 */
export type MetadataTypeMembers = {
  type: string;
  members: string[];
};

/**
 * Result of listing metadata from org
 */
export type MetadataListResult = {
  metadataTypes: MetadataTypeMembers[];
  totalMembers: number;
};

/**
 * Result of package.xml generation
 */
export type PackageXmlResult = {
  content: string;
  metadataTypes: string[];
  totalMembers: number;
};

/**
 * Final result of retrieve operation
 */
export type RetrieveResult = {
  profilesRetrieved: string[];
  metadataTypes: string[];
  totalComponents: number;
};

/**
 * Validates profile names format
 *
 * @param profileNames - Array of profile names to validate
 * @returns ProfilerMonad<string[]> - Validated profile names
 *
 * @remarks For now, this just filters empty names. Detailed validation
 * can be added in a future step.
 */
export function validateProfileNames(profileNames?: string[]): ProfilerMonad<string[] | undefined> {
  return new ProfilerMonad(() => {
    if (!profileNames || profileNames.length === 0) {
      return Promise.resolve(success<string[] | undefined>(undefined));
    }

    // Filter out empty names
    const validNames = profileNames.filter((name) => name && name.trim().length > 0);

    return Promise.resolve(success<string[] | undefined>(validNames.length > 0 ? validNames : undefined));
  });
}

/**
 * Lists all metadata of a specific type from the org
 *
 * @param connection - Salesforce connection
 * @param metadataType - Type of metadata to list
 * @param apiVersion - API version to use
 * @param excludeManaged - Whether to exclude managed package metadata
 * @returns ProfilerMonad<string[]> - Array of metadata member names
 *
 * @throws MetadataListError if listing fails
 */
export function listMetadataType(
  connection: Connection,
  metadataType: string,
  apiVersion: string,
  excludeManaged: boolean
): ProfilerMonad<string[]> {
  return new ProfilerMonad(async () => {
    try {
      const metadata = await connection.metadata.list({ type: metadataType }, apiVersion);

      if (!metadata) {
        return success<string[]>([]);
      }

      const metadataArray = Array.isArray(metadata) ? metadata : [metadata];
      let members = metadataArray.map((m) => m.fullName).sort();

      // Filter out managed package metadata if requested
      if (excludeManaged) {
        members = members.filter((member) => !member.includes('__') || member.endsWith('__c'));
      }

      return success(members);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const listError = new Error(`Failed to list metadata type '${metadataType}': ${err.message}`);
      return failure(listError);
    }
  });
}

/**
 * Lists all metadata types from the org in parallel
 *
 * @param input - Retrieve input parameters
 * @param metadataTypes - Array of metadata types to list
 * @returns ProfilerMonad<MetadataListResult> - Result with all metadata
 *
 * @throws MetadataListError if listing fails for any type
 */
export function listAllMetadata(input: RetrieveInput, metadataTypes: string[]): ProfilerMonad<MetadataListResult> {
  return new ProfilerMonad(async () => {
    const connection = input.org.getConnection(input.apiVersion);
    const excludeManaged = input.excludeManaged ?? false;

    // List all metadata types in parallel
    const metadataPromises = metadataTypes.map(async (type): Promise<MetadataTypeMembers | null> => {
      const monad = listMetadataType(connection, type, input.apiVersion, excludeManaged);
      const result = await monad.run();

      if (result.isFailure()) {
        // Log warning but don't fail the entire operation
        return null;
      }

      const members = result.value;

      // Filter profiles if profile names are specified
      if (type === 'Profile' && input.profileNames && input.profileNames.length > 0) {
        const filteredMembers = members.filter((member) => input.profileNames!.includes(member));

        if (filteredMembers.length === 0) {
          // Return null to indicate this metadata type couldn't be retrieved
          // The error will be caught at a higher level
          return null;
        }

        return {
          type,
          members: filteredMembers,
        };
      }

      return members.length > 0 ? { type, members } : null;
    });

    const results = await Promise.all(metadataPromises);
    const metadataTypeMembers = results.filter((r): r is MetadataTypeMembers => r !== null);

    // Check if we have any Profile metadata when profiles were requested
    if (input.profileNames && input.profileNames.length > 0) {
      const profileMetadata = metadataTypeMembers.find((m) => m.type === 'Profile');
      if (!profileMetadata) {
        const profileError = new ProfileNotFoundError(input.profileNames.join(', '));
        return failure(profileError);
      }
    }

    const totalMembers = metadataTypeMembers.reduce((sum, m) => sum + m.members.length, 0);

    return success({
      metadataTypes: metadataTypeMembers,
      totalMembers,
    });
  });
}

/**
 * Generates package.xml content from metadata list
 *
 * @param metadataList - List of metadata with members
 * @param apiVersion - API version for package.xml
 * @returns ProfilerMonad<PackageXmlResult> - Generated package.xml content
 *
 * @throws PackageXmlGenerationError if generation fails
 * @throws EmptyRetrieveError if no metadata to retrieve
 */
export function generatePackageXml(
  metadataList: MetadataListResult,
  apiVersion: string
): ProfilerMonad<PackageXmlResult> {
  return new ProfilerMonad(() => {
    try {
      if (metadataList.metadataTypes.length === 0) {
        const emptyError = new Error('No metadata found to retrieve');
        return Promise.resolve(failure(emptyError));
      }

      let packageXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      packageXml += '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';

      for (const typeMembers of metadataList.metadataTypes) {
        packageXml += '  <types>\n';
        for (const member of typeMembers.members) {
          packageXml += `    <members>${member}</members>\n`;
        }
        packageXml += `    <name>${typeMembers.type}</name>\n`;
        packageXml += '  </types>\n';
      }

      packageXml += `  <version>${apiVersion}</version>\n`;
      packageXml += '</Package>\n';

      return Promise.resolve(
        success({
          content: packageXml,
          metadataTypes: metadataList.metadataTypes.map((m) => m.type),
          totalMembers: metadataList.totalMembers,
        })
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const pkgError = new Error(`Failed to generate package.xml: ${err.message}`);
      return Promise.resolve(failure(pkgError));
    }
  });
}

/**
 * Main retrieve operation - composes all sub-operations
 *
 * This is the main entry point for the retrieve operation, following the EDD pattern:
 * 1. Validate inputs
 * 2. List metadata from org
 * 3. Generate package.xml
 * 4. Retrieve metadata (placeholder for now)
 *
 * @param input - Retrieve input parameters
 * @returns ProfilerMonad<RetrieveResult> - Final retrieve result
 *
 * @example
 * ```typescript
 * const result = await retrieveProfiles({
 *   org,
 *   profileNames: ['Admin', 'Standard User'],
 *   apiVersion: '58.0',
 *   excludeManaged: true
 * }).run();
 *
 * if (result.isSuccess()) {
 *   console.log(`Retrieved ${result.value.totalComponents} components`);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function retrieveProfiles(input: RetrieveInput): ProfilerMonad<RetrieveResult> {
  const metadataTypes = [
    'ApexClass',
    'ApexPage',
    'ConnectedApp',
    'CustomApplication',
    'CustomObject',
    'CustomPermission',
    'CustomTab',
    'Flow',
    'Layout',
    'Profile',
  ];

  return validateProfileNames(input.profileNames)
    .chain(() => listAllMetadata(input, metadataTypes))
    .chain((metadataList) => generatePackageXml(metadataList, input.apiVersion))
    .map((packageXml) => ({
      // For now, return a result with the package XML info
      // In the next step, we'll add the actual retrieve and file operations
      profilesRetrieved: input.profileNames ?? [],
      metadataTypes: packageXml.metadataTypes,
      totalComponents: packageXml.totalMembers,
    }));
}
