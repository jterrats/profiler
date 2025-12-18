/**
 * @fileoverview Migrate Operation - Profile to Permission Set Migration
 *
 * Extracts permissions from Profile XML and prepares Permission Set metadata.
 * Supports: FLS, Apex, Flows, Tabs, Record Types.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { promisify } from 'node:util';
import type { Org } from '@salesforce/core';
import { parseString, Builder, type ParserOptions } from 'xml2js';
import { ProfilerMonad, success, failure } from '../core/monad/index.js';
import { ProfileNotFoundError, InvalidXmlError } from '../core/errors/operation-errors.js';

const parseXmlAsync = promisify<string, ParserOptions, unknown>(parseString);

/**
 * Permission types that can be migrated
 */
export type PermissionType =
  | 'fls'
  | 'apex'
  | 'flows'
  | 'tabs'
  | 'recordtype'
  | 'objectaccess'
  | 'connectedapps'
  | 'custompermissions'
  | 'userpermissions'
  | 'visualforce'
  | 'custommetadatatypes'
  | 'externalcredentials'
  | 'dataspaces'
  | 'applications'
  | 'customsettings';

/**
 * Input for migration operation
 */
export type MigrateInput = {
  /** Source Profile name */
  profileName: string;
  /** Permission types to migrate */
  permissionTypes: PermissionType[];
  /** Target Permission Set name */
  permissionSetName: string;
  /** Project path */
  projectPath: string;
  /** Target org (optional for dry-run) */
  org?: Org;
  /** Dry run mode (preview only) */
  dryRun: boolean;
  /** Create Permission Set if missing */
  createIfMissing: boolean;
};

/**
 * Permission data extracted from Profile or Permission Set
 */
export type ExtractedPermission = {
  type: PermissionType;
  name: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
};

/**
 * Permission comparison result
 */
export type PermissionComparison = {
  /** Permissions that are new (not in Permission Set) */
  new: ExtractedPermission[];
  /** Permissions that already exist in Permission Set */
  existing: ExtractedPermission[];
  /** Total new permissions to add */
  newCount: number;
  /** Total existing permissions (skipped) */
  existingCount: number;
};

/**
 * Migration result
 */
export type MigrateResult = {
  profileName: string;
  permissionSetName: string;
  permissionsMigrated: number;
  permissions: ExtractedPermission[];
  permissionTypes: PermissionType[];
  dryRun: boolean;
  /** Whether Permission Set exists */
  permissionSetExists: boolean;
  /** Comparison with existing Permission Set (if exists) */
  comparison?: PermissionComparison;
};

/**
 * Reads Profile XML from local project
 */
function readProfileXml(profileName: string, projectPath: string): ProfilerMonad<Record<string, unknown>> {
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
      await fs.access(profilePath);
    } catch {
      return failure(new ProfileNotFoundError(profileName));
    }

    try {
      const content = await fs.readFile(profilePath, 'utf-8');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const parsed = (await parseXmlAsync(content, {
        explicitArray: false,
        mergeAttrs: false,
      } as ParserOptions)) as { Profile?: unknown };

      if (!parsed?.Profile) {
        return failure(new InvalidXmlError(profilePath, 'Invalid profile XML: missing Profile root element'));
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return success(parsed.Profile as Record<string, unknown>);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return failure(new InvalidXmlError(profilePath, err.message));
    }
  });
}

/**
 * Normalizes array or single value to array
 */
function normalizeToArray(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Extracts FLS permissions from Profile
 */
function extractFLSPermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const fieldPermissions = normalizeToArray(profileData.fieldPermissions);

  for (const fp of fieldPermissions) {
    if (typeof fp === 'object' && fp !== null) {
      const fpObj = fp as Record<string, unknown>;
      const field = fpObj.field as string | undefined;
      const readable = fpObj.readable === 'true' || fpObj.readable === true;
      const editable = fpObj.editable === 'true' || fpObj.editable === true;

      if (field && (readable || editable)) {
        permissions.push({
          type: 'fls',
          name: field,
          enabled: true,
          metadata: {
            readable,
            editable,
          },
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Apex Class permissions from Profile
 */
function extractApexPermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const classAccesses = normalizeToArray(profileData.classAccesses);

  for (const ca of classAccesses) {
    if (typeof ca === 'object' && ca !== null) {
      const caObj = ca as Record<string, unknown>;
      const apexClass = caObj.apexClass as string | undefined;
      const enabled = caObj.enabled === 'true' || caObj.enabled === true;

      if (apexClass && enabled) {
        permissions.push({
          type: 'apex',
          name: apexClass,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Flow permissions from Profile
 */
function extractFlowPermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const flowAccesses = normalizeToArray(profileData.flowAccesses);

  for (const fa of flowAccesses) {
    if (typeof fa === 'object' && fa !== null) {
      const faObj = fa as Record<string, unknown>;
      const flow = faObj.flow as string | undefined;
      const enabled = faObj.enabled === 'true' || faObj.enabled === true;

      if (flow && enabled) {
        permissions.push({
          type: 'flows',
          name: flow,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Tab permissions from Profile
 */
function extractTabPermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const tabVisibilities = normalizeToArray(profileData.tabVisibilities);

  for (const tv of tabVisibilities) {
    if (typeof tv === 'object' && tv !== null) {
      const tvObj = tv as Record<string, unknown>;
      const tab = tvObj.tab as string | undefined;
      const visibility = tvObj.visibility as string | undefined;

      if (tab && visibility === 'Visible') {
        permissions.push({
          type: 'tabs',
          name: tab,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Record Type permissions from Profile
 */
function extractRecordTypePermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const recordTypeVisibilities = normalizeToArray(profileData.recordTypeVisibilities);

  for (const rtv of recordTypeVisibilities) {
    if (typeof rtv === 'object' && rtv !== null) {
      const rtvObj = rtv as Record<string, unknown>;
      const recordType = rtvObj.recordType as string | undefined;
      const visible = rtvObj.visible === 'true' || rtvObj.visible === true;

      if (recordType && visible) {
        permissions.push({
          type: 'recordtype',
          name: recordType,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Object permissions from Profile
 */
function extractObjectPermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const objectPermissions = normalizeToArray(profileData.objectPermissions);

  for (const op of objectPermissions) {
    if (typeof op === 'object' && op !== null) {
      const opObj = op as Record<string, unknown>;
      const object = opObj.object as string | undefined;
      const allowRead = opObj.allowRead === 'true' || opObj.allowRead === true;
      const allowCreate = opObj.allowCreate === 'true' || opObj.allowCreate === true;
      const allowEdit = opObj.allowEdit === 'true' || opObj.allowEdit === true;
      const allowDelete = opObj.allowDelete === 'true' || opObj.allowDelete === true;
      const viewAllRecords = opObj.viewAllRecords === 'true' || opObj.viewAllRecords === true;
      const modifyAllRecords = opObj.modifyAllRecords === 'true' || opObj.modifyAllRecords === true;

      if (object && (allowRead || allowCreate || allowEdit || allowDelete || viewAllRecords || modifyAllRecords)) {
        permissions.push({
          type: 'objectaccess',
          name: object,
          enabled: true,
          metadata: {
            allowRead,
            allowCreate,
            allowEdit,
            allowDelete,
            viewAllRecords,
            modifyAllRecords,
          },
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Connected App permissions from Profile
 */
function extractConnectedAppPermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const connectedAppAccesses = normalizeToArray(profileData.connectedAppAccesses);

  for (const caa of connectedAppAccesses) {
    if (typeof caa === 'object' && caa !== null) {
      const caaObj = caa as Record<string, unknown>;
      const connectedApp = caaObj.connectedApp as string | undefined;
      const enabled = caaObj.enabled === 'true' || caaObj.enabled === true;

      if (connectedApp && enabled) {
        permissions.push({
          type: 'connectedapps',
          name: connectedApp,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Custom Permission permissions from Profile
 */
function extractCustomPermissionPermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const customPermissions = normalizeToArray(profileData.customPermissions);

  for (const cp of customPermissions) {
    if (typeof cp === 'object' && cp !== null) {
      const cpObj = cp as Record<string, unknown>;
      const name = cpObj.name as string | undefined;
      const enabled = cpObj.enabled === 'true' || cpObj.enabled === true;

      if (name && enabled) {
        permissions.push({
          type: 'custompermissions',
          name,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts User Permission permissions from Profile
 */
function extractUserPermissionPermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const userPermissions = normalizeToArray(profileData.userPermissions);

  for (const up of userPermissions) {
    if (typeof up === 'object' && up !== null) {
      const upObj = up as Record<string, unknown>;
      const name = upObj.name as string | undefined;
      const enabled = upObj.enabled === 'true' || upObj.enabled === true;

      if (name && enabled) {
        permissions.push({
          type: 'userpermissions',
          name,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Visualforce Page permissions from Profile
 */
function extractVisualforcePermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const pageAccesses = normalizeToArray(profileData.pageAccesses);

  for (const pa of pageAccesses) {
    if (typeof pa === 'object' && pa !== null) {
      const paObj = pa as Record<string, unknown>;
      const apexPage = paObj.apexPage as string | undefined;
      const enabled = paObj.enabled === 'true' || paObj.enabled === true;

      if (apexPage && enabled) {
        permissions.push({
          type: 'visualforce',
          name: apexPage,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Custom Metadata Type permissions from Profile
 */
function extractCustomMetadataTypePermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const customMetadataTypeAccesses = normalizeToArray(profileData.customMetadataTypeAccesses);

  for (const cmta of customMetadataTypeAccesses) {
    if (typeof cmta === 'object' && cmta !== null) {
      const cmtaObj = cmta as Record<string, unknown>;
      const name = cmtaObj.name as string | undefined;
      const enabled = cmtaObj.enabled === 'true' || cmtaObj.enabled === true;

      if (name && enabled) {
        permissions.push({
          type: 'custommetadatatypes',
          name,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts External Credential permissions from Profile
 */
function extractExternalCredentialPermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const externalCredentialAccesses = normalizeToArray(profileData.externalCredentialAccesses);

  for (const eca of externalCredentialAccesses) {
    if (typeof eca === 'object' && eca !== null) {
      const ecaObj = eca as Record<string, unknown>;
      const externalCredential = ecaObj.externalCredential as string | undefined;
      const enabled = ecaObj.enabled === 'true' || ecaObj.enabled === true;

      if (externalCredential && enabled) {
        permissions.push({
          type: 'externalcredentials',
          name: externalCredential,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Data Space permissions from Profile
 */
function extractDataSpacePermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const dataSpaceAccesses = normalizeToArray(profileData.dataSpaceAccesses);

  for (const dsa of dataSpaceAccesses) {
    if (typeof dsa === 'object' && dsa !== null) {
      const dsaObj = dsa as Record<string, unknown>;
      const dataSpace = dsaObj.dataSpace as string | undefined;
      const enabled = dsaObj.enabled === 'true' || dsaObj.enabled === true;

      if (dataSpace && enabled) {
        permissions.push({
          type: 'dataspaces',
          name: dataSpace,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Application Visibilities from Profile
 */
function extractApplicationVisibilities(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const applicationVisibilities = normalizeToArray(profileData.applicationVisibilities);

  for (const av of applicationVisibilities) {
    if (typeof av === 'object' && av !== null) {
      const avObj = av as Record<string, unknown>;
      const application = avObj.application as string | undefined;
      const visible = avObj.visible === 'true' || avObj.visible === true;

      if (application && visible) {
        permissions.push({
          type: 'applications',
          name: application,
          enabled: true,
          metadata: {
            default: avObj.default === 'true' || avObj.default === true,
            visible: true,
          },
        });
      }
    }
  }

  return permissions;
}

/**
 * Extracts Custom Setting Access permissions from Profile
 */
function extractCustomSettingPermissions(profileData: Record<string, unknown>): ExtractedPermission[] {
  const permissions: ExtractedPermission[] = [];
  const customSettingAccesses = normalizeToArray(profileData.customSettingAccesses);

  for (const csa of customSettingAccesses) {
    if (typeof csa === 'object' && csa !== null) {
      const csaObj = csa as Record<string, unknown>;
      const name = csaObj.name as string | undefined;
      const enabled = csaObj.enabled === 'true' || csaObj.enabled === true;

      if (name && enabled) {
        permissions.push({
          type: 'customsettings',
          name,
          enabled: true,
        });
      }
    }
  }

  return permissions;
}

/**
 * Reads Permission Set XML from local project
 */
function readPermissionSetXml(permissionSetName: string, projectPath: string): ProfilerMonad<Record<string, unknown> | null> {
  return new ProfilerMonad(async () => {
    const permissionSetPath = path.join(
      projectPath,
      'force-app',
      'main',
      'default',
      'permissionsets',
      `${permissionSetName}.permissionset-meta.xml`
    );

    try {
      await fs.access(permissionSetPath);
    } catch {
      // Permission Set doesn't exist locally - return null
      return success(null);
    }

    try {
      const content = await fs.readFile(permissionSetPath, 'utf-8');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const parsed = (await parseXmlAsync(content, {
        explicitArray: false,
        mergeAttrs: false,
      } as ParserOptions)) as { PermissionSet?: unknown };

      if (!parsed?.PermissionSet) {
        return success(null);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return success(parsed.PermissionSet as Record<string, unknown>);
    } catch {
      // If parsing fails, treat as non-existent
      return success(null);
    }
  });
}

/**
 * Retrieves Permission Set from org
 */
function retrieveOrgPermissionSet(permissionSetName: string, org: Org, apiVersion: string): ProfilerMonad<Record<string, unknown> | null> {
  return new ProfilerMonad(async () => {
    try {
      const connection = org.getConnection(apiVersion);

      // Check if Permission Set exists
      const metadata = await connection.metadata.list({ type: 'PermissionSet' }, apiVersion);
      if (!metadata) {
        return success(null);
      }

      const metadataArray = Array.isArray(metadata) ? metadata : [metadata];
      const permissionSetExists = metadataArray.some((m) => m.fullName === permissionSetName);

      if (!permissionSetExists) {
        return success(null);
      }

      // Retrieve Permission Set content
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const result = await connection.metadata.read('PermissionSet', permissionSetName);
      if (!result) {
        return success(null);
      }

      // Parse XML content - metadata.read returns the XML as string
      const xmlContent = typeof result === 'string' ? result : String(result);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const parsed = (await parseXmlAsync(xmlContent, {
        explicitArray: false,
        mergeAttrs: false,
      } as ParserOptions)) as { PermissionSet?: unknown };

      if (!parsed?.PermissionSet) {
        return success(null);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return success(parsed.PermissionSet as Record<string, unknown>);
    } catch {
      // If retrieval fails, treat as non-existent
      return success(null);
    }
  });
}

/**
 * Extracts permissions from Permission Set XML (same structure as Profile)
 */
function extractPermissionsFromPermissionSet(permissionSetData: Record<string, unknown>, permissionTypes: PermissionType[]): ExtractedPermission[] {
  const allPermissions: ExtractedPermission[] = [];

  if (permissionTypes.includes('fls')) {
    allPermissions.push(...extractFLSPermissions(permissionSetData));
  }
  if (permissionTypes.includes('apex')) {
    allPermissions.push(...extractApexPermissions(permissionSetData));
  }
  if (permissionTypes.includes('flows')) {
    allPermissions.push(...extractFlowPermissions(permissionSetData));
  }
  if (permissionTypes.includes('tabs')) {
    allPermissions.push(...extractTabPermissions(permissionSetData));
  }
  if (permissionTypes.includes('recordtype')) {
    allPermissions.push(...extractRecordTypePermissions(permissionSetData));
  }
  if (permissionTypes.includes('objectaccess')) {
    allPermissions.push(...extractObjectPermissions(permissionSetData));
  }
  if (permissionTypes.includes('connectedapps')) {
    allPermissions.push(...extractConnectedAppPermissions(permissionSetData));
  }
  if (permissionTypes.includes('custompermissions')) {
    allPermissions.push(...extractCustomPermissionPermissions(permissionSetData));
  }
  if (permissionTypes.includes('userpermissions')) {
    allPermissions.push(...extractUserPermissionPermissions(permissionSetData));
  }
  if (permissionTypes.includes('visualforce')) {
    allPermissions.push(...extractVisualforcePermissions(permissionSetData));
  }
  if (permissionTypes.includes('custommetadatatypes')) {
    allPermissions.push(...extractCustomMetadataTypePermissions(permissionSetData));
  }
  if (permissionTypes.includes('externalcredentials')) {
    allPermissions.push(...extractExternalCredentialPermissions(permissionSetData));
  }
  if (permissionTypes.includes('dataspaces')) {
    allPermissions.push(...extractDataSpacePermissions(permissionSetData));
  }
  if (permissionTypes.includes('applications')) {
    allPermissions.push(...extractApplicationVisibilities(permissionSetData));
  }
  if (permissionTypes.includes('customsettings')) {
    allPermissions.push(...extractCustomSettingPermissions(permissionSetData));
  }

  return allPermissions;
}

/**
 * Creates a unique key for a permission to detect duplicates
 */
function getPermissionKey(permission: ExtractedPermission): string {
  // For FLS, include field name and permissions (readable/editable)
  if (permission.type === 'fls' && permission.metadata) {
    const readable = permission.metadata.readable ? 'R' : '';
    const editable = permission.metadata.editable ? 'W' : '';
    return `${permission.type}:${permission.name}:${readable}${editable}`;
  }
  // For other types, just type and name
  return `${permission.type}:${permission.name}`;
}

/**
 * Compares extracted permissions with existing Permission Set permissions
 */
function comparePermissions(
  extracted: ExtractedPermission[],
  existing: ExtractedPermission[]
): PermissionComparison {
  const existingKeys = new Set(existing.map(getPermissionKey));
  const newPermissions: ExtractedPermission[] = [];
  const existingPermissions: ExtractedPermission[] = [];

  for (const perm of extracted) {
    const key = getPermissionKey(perm);
    if (existingKeys.has(key)) {
      existingPermissions.push(perm);
    } else {
      newPermissions.push(perm);
    }
  }

  return {
    new: newPermissions,
    existing: existingPermissions,
    newCount: newPermissions.length,
    existingCount: existingPermissions.length,
  };
}

/**
 * Main migration operation
 */
/**
 * Helper function to build fieldPermissions array
 */
function buildFieldPermissions(
  flsPermissions: ExtractedPermission[],
  existingFieldPermissions: unknown[]
): Array<Record<string, unknown>> {
  const existingFieldMap = new Map<string, Record<string, unknown>>();
  for (const fp of existingFieldPermissions) {
    if (typeof fp === 'object' && fp !== null) {
      const fpObj = fp as Record<string, unknown>;
      const field = fpObj.field as string | undefined;
      if (field) {
        existingFieldMap.set(field, fpObj);
      }
    }
  }

  for (const perm of flsPermissions) {
    const metadata = perm.metadata as { readable?: boolean; editable?: boolean } | undefined;
    const existing = existingFieldMap.get(perm.name);
    if (existing) {
      existing.readable = metadata?.readable ?? existing.readable;
      existing.editable = metadata?.editable ?? existing.editable;
    } else {
      existingFieldMap.set(perm.name, {
        field: perm.name,
        readable: metadata?.readable ?? false,
        editable: metadata?.editable ?? false,
      });
    }
  }
  return Array.from(existingFieldMap.values());
}

/**
 * Helper function to build classAccesses array
 */
function buildClassAccesses(
  apexPermissions: ExtractedPermission[],
  existingClassAccesses: unknown[]
): Array<Record<string, unknown>> {
  const existingClassMap = new Map<string, Record<string, unknown>>();
  for (const ca of existingClassAccesses) {
    if (typeof ca === 'object' && ca !== null) {
      const caObj = ca as Record<string, unknown>;
      const apexClass = caObj.apexClass as string | undefined;
      if (apexClass) {
        existingClassMap.set(apexClass, caObj);
      }
    }
  }

  for (const perm of apexPermissions) {
    if (!existingClassMap.has(perm.name)) {
      existingClassMap.set(perm.name, {
        apexClass: perm.name,
        enabled: perm.enabled,
      });
    }
  }
  return Array.from(existingClassMap.values());
}

/**
 * Helper function to build flowAccesses array
 */
function buildFlowAccesses(
  flowPermissions: ExtractedPermission[],
  existingFlowAccesses: unknown[]
): Array<Record<string, unknown>> {
  const existingFlowMap = new Map<string, Record<string, unknown>>();
  for (const fa of existingFlowAccesses) {
    if (typeof fa === 'object' && fa !== null) {
      const faObj = fa as Record<string, unknown>;
      const flow = faObj.flow as string | undefined;
      if (flow) {
        existingFlowMap.set(flow, faObj);
      }
    }
  }

  for (const perm of flowPermissions) {
    if (!existingFlowMap.has(perm.name)) {
      existingFlowMap.set(perm.name, {
        flow: perm.name,
        enabled: perm.enabled,
      });
    }
  }
  return Array.from(existingFlowMap.values());
}

/**
 * Helper function to build tabVisibilities array
 */
function buildTabVisibilities(
  tabPermissions: ExtractedPermission[],
  existingTabVisibilities: unknown[]
): Array<Record<string, unknown>> {
  const existingTabMap = new Map<string, Record<string, unknown>>();
  for (const tv of existingTabVisibilities) {
    if (typeof tv === 'object' && tv !== null) {
      const tvObj = tv as Record<string, unknown>;
      const tab = tvObj.tab as string | undefined;
      if (tab) {
        existingTabMap.set(tab, tvObj);
      }
    }
  }

  for (const perm of tabPermissions) {
    if (!existingTabMap.has(perm.name)) {
      existingTabMap.set(perm.name, {
        tab: perm.name,
        visibility: 'Visible',
      });
    }
  }
  return Array.from(existingTabMap.values());
}

/**
 * Helper function to build recordTypeVisibilities array
 */
function buildRecordTypeVisibilities(
  recordTypePermissions: ExtractedPermission[],
  existingRecordTypeVisibilities: unknown[]
): Array<Record<string, unknown>> {
  const existingRecordTypeMap = new Map<string, Record<string, unknown>>();
  for (const rtv of existingRecordTypeVisibilities) {
    if (typeof rtv === 'object' && rtv !== null) {
      const rtvObj = rtv as Record<string, unknown>;
      const recordType = rtvObj.recordType as string | undefined;
      if (recordType) {
        existingRecordTypeMap.set(recordType, rtvObj);
      }
    }
  }

  for (const perm of recordTypePermissions) {
    if (!existingRecordTypeMap.has(perm.name)) {
      existingRecordTypeMap.set(perm.name, {
        recordType: perm.name,
        visible: perm.enabled,
      });
    }
  }
  return Array.from(existingRecordTypeMap.values());
}

/**
 * Helper function to build objectPermissions array
 */
function buildObjectPermissions(
  objectPermissions: ExtractedPermission[],
  existingObjectPermissions: unknown[]
): Array<Record<string, unknown>> {
  const existingObjectMap = new Map<string, Record<string, unknown>>();
  for (const op of existingObjectPermissions) {
    if (typeof op === 'object' && op !== null) {
      const opObj = op as Record<string, unknown>;
      const object = opObj.object as string | undefined;
      if (object) {
        existingObjectMap.set(object, opObj);
      }
    }
  }

  for (const perm of objectPermissions) {
    const metadata = perm.metadata as {
      allowRead?: boolean;
      allowCreate?: boolean;
      allowEdit?: boolean;
      allowDelete?: boolean;
      viewAllRecords?: boolean;
      modifyAllRecords?: boolean;
    } | undefined;
    const existing = existingObjectMap.get(perm.name);
    if (existing) {
      if (metadata?.allowRead !== undefined) existing.allowRead = metadata.allowRead;
      if (metadata?.allowCreate !== undefined) existing.allowCreate = metadata.allowCreate;
      if (metadata?.allowEdit !== undefined) existing.allowEdit = metadata.allowEdit;
      if (metadata?.allowDelete !== undefined) existing.allowDelete = metadata.allowDelete;
      if (metadata?.viewAllRecords !== undefined) existing.viewAllRecords = metadata.viewAllRecords;
      if (metadata?.modifyAllRecords !== undefined) existing.modifyAllRecords = metadata.modifyAllRecords;
    } else {
      existingObjectMap.set(perm.name, {
        object: perm.name,
        allowRead: metadata?.allowRead ?? false,
        allowCreate: metadata?.allowCreate ?? false,
        allowEdit: metadata?.allowEdit ?? false,
        allowDelete: metadata?.allowDelete ?? false,
        viewAllRecords: metadata?.viewAllRecords ?? false,
        modifyAllRecords: metadata?.modifyAllRecords ?? false,
      });
    }
  }
  return Array.from(existingObjectMap.values());
}

/**
 * Helper function to build simple permission arrays (connectedApps, customPermissions, etc.)
 */
function buildSimplePermissions(
  permissions: ExtractedPermission[],
  existingPermissions: unknown[],
  keyName: string,
  enabledKey = 'enabled'
): Array<Record<string, unknown>> {
  const existingMap = new Map<string, Record<string, unknown>>();
  for (const ep of existingPermissions) {
    if (typeof ep === 'object' && ep !== null) {
      const epObj = ep as Record<string, unknown>;
      const name = epObj[keyName] as string | undefined;
      if (name) {
        existingMap.set(name, epObj);
      }
    }
  }

  for (const perm of permissions) {
    if (!existingMap.has(perm.name)) {
      const newPerm: Record<string, unknown> = { [keyName]: perm.name };
      if (enabledKey === 'enabled') {
        newPerm.enabled = perm.enabled;
      }
      existingMap.set(perm.name, newPerm);
    }
  }
  return Array.from(existingMap.values());
}

/**
 * Helper function to build applicationVisibilities array
 */
function buildApplicationVisibilities(
  applicationPermissions: ExtractedPermission[],
  existingApplicationVisibilities: unknown[]
): Array<Record<string, unknown>> {
  const existingApplicationMap = new Map<string, Record<string, unknown>>();
  for (const av of existingApplicationVisibilities) {
    if (typeof av === 'object' && av !== null) {
      const avObj = av as Record<string, unknown>;
      const application = avObj.application as string | undefined;
      if (application) {
        existingApplicationMap.set(application, avObj);
      }
    }
  }

  for (const perm of applicationPermissions) {
    const metadata = perm.metadata as { default?: boolean; visible?: boolean } | undefined;
    if (!existingApplicationMap.has(perm.name)) {
      existingApplicationMap.set(perm.name, {
        application: perm.name,
        default: metadata?.default ?? false,
        visible: metadata?.visible ?? true,
      });
    }
  }
  return Array.from(existingApplicationMap.values());
}

/**
 * Groups permissions by type
 */
function groupPermissionsByType(permissions: ExtractedPermission[]): {
  fls: ExtractedPermission[];
  apex: ExtractedPermission[];
  flows: ExtractedPermission[];
  tabs: ExtractedPermission[];
  recordtype: ExtractedPermission[];
  objectaccess: ExtractedPermission[];
  connectedapps: ExtractedPermission[];
  custompermissions: ExtractedPermission[];
  userpermissions: ExtractedPermission[];
  visualforce: ExtractedPermission[];
  custommetadatatypes: ExtractedPermission[];
  externalcredentials: ExtractedPermission[];
  dataspaces: ExtractedPermission[];
  applications: ExtractedPermission[];
  customsettings: ExtractedPermission[];
} {
  return {
    fls: permissions.filter((p) => p.type === 'fls'),
    apex: permissions.filter((p) => p.type === 'apex'),
    flows: permissions.filter((p) => p.type === 'flows'),
    tabs: permissions.filter((p) => p.type === 'tabs'),
    recordtype: permissions.filter((p) => p.type === 'recordtype'),
    objectaccess: permissions.filter((p) => p.type === 'objectaccess'),
    connectedapps: permissions.filter((p) => p.type === 'connectedapps'),
    custompermissions: permissions.filter((p) => p.type === 'custompermissions'),
    userpermissions: permissions.filter((p) => p.type === 'userpermissions'),
    visualforce: permissions.filter((p) => p.type === 'visualforce'),
    custommetadatatypes: permissions.filter((p) => p.type === 'custommetadatatypes'),
    externalcredentials: permissions.filter((p) => p.type === 'externalcredentials'),
    dataspaces: permissions.filter((p) => p.type === 'dataspaces'),
    applications: permissions.filter((p) => p.type === 'applications'),
    customsettings: permissions.filter((p) => p.type === 'customsettings'),
  };
}

/**
 * Builds complex permission arrays (FLS, Object, Application)
 */
// eslint-disable-next-line no-param-reassign
function buildComplexPermissionArrays(
  groupedPermissions: ReturnType<typeof groupPermissionsByType>,
  permissionSetData: Record<string, unknown>
): void {
  if (groupedPermissions.fls.length > 0) {
    permissionSetData.fieldPermissions = buildFieldPermissions(
      groupedPermissions.fls,
      normalizeToArray(permissionSetData.fieldPermissions || [])
    );
  }
  if (groupedPermissions.objectaccess.length > 0) {
    permissionSetData.objectPermissions = buildObjectPermissions(
      groupedPermissions.objectaccess,
      normalizeToArray(permissionSetData.objectPermissions || [])
    );
  }
  if (groupedPermissions.applications.length > 0) {
    permissionSetData.applicationVisibilities = buildApplicationVisibilities(
      groupedPermissions.applications,
      normalizeToArray(permissionSetData.applicationVisibilities || [])
    );
  }
}

/**
 * Builds standard permission arrays (Apex, Flows, Tabs, Record Types)
 */
// eslint-disable-next-line no-param-reassign
function buildStandardPermissionArrays(
  groupedPermissions: ReturnType<typeof groupPermissionsByType>,
  permissionSetData: Record<string, unknown>
): void {
  if (groupedPermissions.apex.length > 0) {
    permissionSetData.classAccesses = buildClassAccesses(
      groupedPermissions.apex,
      normalizeToArray(permissionSetData.classAccesses || [])
    );
  }
  if (groupedPermissions.flows.length > 0) {
    permissionSetData.flowAccesses = buildFlowAccesses(
      groupedPermissions.flows,
      normalizeToArray(permissionSetData.flowAccesses || [])
    );
  }
  if (groupedPermissions.tabs.length > 0) {
    permissionSetData.tabVisibilities = buildTabVisibilities(
      groupedPermissions.tabs,
      normalizeToArray(permissionSetData.tabVisibilities || [])
    );
  }
  if (groupedPermissions.recordtype.length > 0) {
    permissionSetData.recordTypeVisibilities = buildRecordTypeVisibilities(
      groupedPermissions.recordtype,
      normalizeToArray(permissionSetData.recordTypeVisibilities || [])
    );
  }
}

/**
 * Builds simple permission arrays (Connected Apps, Custom Permissions, etc.)
 */
// eslint-disable-next-line no-param-reassign
function buildSimplePermissionArrays(
  groupedPermissions: ReturnType<typeof groupPermissionsByType>,
  permissionSetData: Record<string, unknown>
): void {
  if (groupedPermissions.connectedapps.length > 0) {
    permissionSetData.connectedAppAccesses = buildSimplePermissions(
      groupedPermissions.connectedapps,
      normalizeToArray(permissionSetData.connectedAppAccesses || []),
      'connectedApp'
    );
  }
  if (groupedPermissions.custompermissions.length > 0) {
    permissionSetData.customPermissions = buildSimplePermissions(
      groupedPermissions.custompermissions,
      normalizeToArray(permissionSetData.customPermissions || []),
      'name'
    );
  }
  if (groupedPermissions.userpermissions.length > 0) {
    permissionSetData.userPermissions = buildSimplePermissions(
      groupedPermissions.userpermissions,
      normalizeToArray(permissionSetData.userPermissions || []),
      'name'
    );
  }
  if (groupedPermissions.visualforce.length > 0) {
    permissionSetData.pageAccesses = buildSimplePermissions(
      groupedPermissions.visualforce,
      normalizeToArray(permissionSetData.pageAccesses || []),
      'apexPage'
    );
  }
  if (groupedPermissions.custommetadatatypes.length > 0) {
    permissionSetData.customMetadataTypeAccesses = buildSimplePermissions(
      groupedPermissions.custommetadatatypes,
      normalizeToArray(permissionSetData.customMetadataTypeAccesses || []),
      'name'
    );
  }
  if (groupedPermissions.externalcredentials.length > 0) {
    permissionSetData.externalCredentialAccesses = buildSimplePermissions(
      groupedPermissions.externalcredentials,
      normalizeToArray(permissionSetData.externalCredentialAccesses || []),
      'externalCredential'
    );
  }
  if (groupedPermissions.dataspaces.length > 0) {
    permissionSetData.dataSpaceAccesses = buildSimplePermissions(
      groupedPermissions.dataspaces,
      normalizeToArray(permissionSetData.dataSpaceAccesses || []),
      'dataSpace'
    );
  }
  if (groupedPermissions.customsettings.length > 0) {
    permissionSetData.customSettingAccesses = buildSimplePermissions(
      groupedPermissions.customsettings,
      normalizeToArray(permissionSetData.customSettingAccesses || []),
      'name'
    );
  }
}

/**
 * Builds all permission arrays in the Permission Set data
 */
function buildAllPermissionArrays(
  groupedPermissions: ReturnType<typeof groupPermissionsByType>,
  permissionSetData: Record<string, unknown>
): void {
  buildComplexPermissionArrays(groupedPermissions, permissionSetData);
  buildStandardPermissionArrays(groupedPermissions, permissionSetData);
  buildSimplePermissionArrays(groupedPermissions, permissionSetData);
}

/**
 * Generates Permission Set XML from extracted permissions
 */
function generatePermissionSetXml(
  permissionSetName: string,
  permissions: ExtractedPermission[],
  existingPermissionSetData: Record<string, unknown> | null
): string {
  const permissionSetData: Record<string, unknown> = existingPermissionSetData
    ? { ...existingPermissionSetData }
    : {
        fullName: permissionSetName,
        description: 'Permission Set migrated from Profile',
      };

  const groupedPermissions = groupPermissionsByType(permissions);
  buildAllPermissionArrays(groupedPermissions, permissionSetData);

  // Build XML using Builder
  const builder = new Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
    renderOpts: { pretty: true, indent: '    ' },
  });
  return builder.buildObject({ PermissionSet: permissionSetData });
}

/**
 * Writes Permission Set XML file to project
 */
function writePermissionSetXml(
  permissionSetName: string,
  projectPath: string,
  xmlContent: string
): ProfilerMonad<void> {
  return new ProfilerMonad(async () => {
    try {
      const permissionSetDir = path.join(projectPath, 'force-app', 'main', 'default', 'permissionsets');
      await fs.mkdir(permissionSetDir, { recursive: true });

      const permissionSetPath = path.join(permissionSetDir, `${permissionSetName}.permissionset-meta.xml`);
      await fs.writeFile(permissionSetPath, xmlContent, 'utf-8');

      return success(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return failure(new Error(`Failed to write Permission Set XML: ${err.message}`));
    }
  });
}

export function migratePermissionsOperation(input: MigrateInput): ProfilerMonad<MigrateResult> {
  return readProfileXml(input.profileName, input.projectPath)
    .flatMap((profileData) => {
      const allPermissions: ExtractedPermission[] = [];

      // Extract permissions based on requested types
      if (input.permissionTypes.includes('fls')) {
        allPermissions.push(...extractFLSPermissions(profileData));
      }
      if (input.permissionTypes.includes('apex')) {
        allPermissions.push(...extractApexPermissions(profileData));
      }
      if (input.permissionTypes.includes('flows')) {
        allPermissions.push(...extractFlowPermissions(profileData));
      }
      if (input.permissionTypes.includes('tabs')) {
        allPermissions.push(...extractTabPermissions(profileData));
      }
      if (input.permissionTypes.includes('recordtype')) {
        allPermissions.push(...extractRecordTypePermissions(profileData));
      }
      if (input.permissionTypes.includes('objectaccess')) {
        allPermissions.push(...extractObjectPermissions(profileData));
      }
      if (input.permissionTypes.includes('connectedapps')) {
        allPermissions.push(...extractConnectedAppPermissions(profileData));
      }
      if (input.permissionTypes.includes('custompermissions')) {
        allPermissions.push(...extractCustomPermissionPermissions(profileData));
      }
      if (input.permissionTypes.includes('userpermissions')) {
        allPermissions.push(...extractUserPermissionPermissions(profileData));
      }
      if (input.permissionTypes.includes('visualforce')) {
        allPermissions.push(...extractVisualforcePermissions(profileData));
      }
      if (input.permissionTypes.includes('custommetadatatypes')) {
        allPermissions.push(...extractCustomMetadataTypePermissions(profileData));
      }
      if (input.permissionTypes.includes('externalcredentials')) {
        allPermissions.push(...extractExternalCredentialPermissions(profileData));
      }
      if (input.permissionTypes.includes('dataspaces')) {
        allPermissions.push(...extractDataSpacePermissions(profileData));
      }
      if (input.permissionTypes.includes('applications')) {
        allPermissions.push(...extractApplicationVisibilities(profileData));
      }
      if (input.permissionTypes.includes('customsettings')) {
        allPermissions.push(...extractCustomSettingPermissions(profileData));
      }

      // Check if Permission Set exists and compare permissions
      const checkPermissionSet = input.org
        ? retrieveOrgPermissionSet(input.permissionSetName, input.org, '60.0')
        : readPermissionSetXml(input.permissionSetName, input.projectPath);

      return checkPermissionSet.flatMap((permissionSetData) => {
        const permissionSetExists = permissionSetData !== null;
        let comparison: PermissionComparison | undefined;

        if (permissionSetExists && permissionSetData) {
          // Extract existing permissions from Permission Set
          const existingPermissions = extractPermissionsFromPermissionSet(permissionSetData, input.permissionTypes);
          // Compare and filter duplicates
          comparison = comparePermissions(allPermissions, existingPermissions);
        }

        // Use comparison results if available, otherwise use all permissions
        const permissionsToMigrate = comparison ? comparison.new : allPermissions;
        const permissionsMigrated = permissionsToMigrate.length;

        // If not dry-run and there are permissions to migrate, generate and write XML
        if (!input.dryRun && permissionsMigrated > 0) {
          const xmlContent = generatePermissionSetXml(
            input.permissionSetName,
            permissionsToMigrate,
            permissionSetExists ? permissionSetData : null
          );

          return writePermissionSetXml(input.permissionSetName, input.projectPath, xmlContent).flatMap(() =>
            new ProfilerMonad(() =>
              Promise.resolve(
                success({
                  profileName: input.profileName,
                  permissionSetName: input.permissionSetName,
                  permissionsMigrated,
                  permissions: permissionsToMigrate,
                  permissionTypes: input.permissionTypes,
                  dryRun: input.dryRun,
                  permissionSetExists,
                  comparison,
                })
              )
            )
          );
        }

        return new ProfilerMonad(() =>
          Promise.resolve(
            success({
              profileName: input.profileName,
              permissionSetName: input.permissionSetName,
              permissionsMigrated,
              permissions: permissionsToMigrate,
              permissionTypes: input.permissionTypes,
              dryRun: input.dryRun,
              permissionSetExists,
              comparison,
            })
          )
        );
      });
    });
}

