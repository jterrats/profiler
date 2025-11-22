import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { Messages, Org, SfError, SfProject } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

const execAsync = promisify(exec);

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@jterrats/profiler', 'profiler.retrieve');

export type ProfilerRetrieveResult = {
  success: boolean;
  componentsRetrieved: number;
  metadataTypes: string[];
  profilesRetrieved: number;
};

export default class ProfilerRetrieve extends SfCommand<ProfilerRetrieveResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;

  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      summary: messages.getMessage('flags.target-org.summary'),
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      description: messages.getMessage('flags.name.description'),
    }),
    'all-fields': Flags.boolean({
      summary: messages.getMessage('flags.all-fields.summary'),
      description: messages.getMessage('flags.all-fields.description'),
      default: false,
    }),
    'api-version': Flags.string({
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
    'from-project': Flags.boolean({
      char: 'f',
      summary: messages.getMessage('flags.from-project.summary'),
      description: messages.getMessage('flags.from-project.description'),
      default: false,
    }),
  };

  private tempDir = '';
  private tempRetrieveDir = '';
  private projectPath = '';
  private backupDir = '';

  public async run(): Promise<ProfilerRetrieveResult> {
    const { flags } = await this.parse(ProfilerRetrieve);
    const org = flags['target-org'];
    const profileName = flags.name;
    const includeAllFields = flags['all-fields'];
    const fromProject = flags['from-project'];
    const apiVersion = flags['api-version'] ?? (await org.retrieveMaxApiVersion());

    // Parse profile names (comma-separated)
    const profileNames = profileName
      ? profileName
          .split(',')
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      : undefined;

    if (profileNames && profileNames.length > 0) {
      const profileList = profileNames.join(', ');
      if (profileNames.length === 1) {
        this.log(messages.getMessage('info.starting-with-name', [profileList, org.getUsername() ?? org.getOrgId()]));
      } else {
        this.log(
          messages.getMessage('info.starting-with-names', [
            profileNames.length.toString(),
            profileList,
            org.getUsername() ?? org.getOrgId(),
          ])
        );
      }
    } else {
      this.log(messages.getMessage('info.starting', [org.getUsername() ?? org.getOrgId()]));
    }

    // Get project path
    const project = await SfProject.resolve();
    this.projectPath = project.getPath();

    // Create temporary directories in system temp (not in project)
    const timestamp = Date.now();
    const baseTempDir = path.join(os.tmpdir(), `profiler-${timestamp}`);
    
    // Directory for package.xml
    this.tempDir = path.join(baseTempDir, 'package');
    await fs.mkdir(this.tempDir, { recursive: true });

    // Directory for metadata processing
    this.tempRetrieveDir = path.join(baseTempDir, 'profiles');
    await fs.mkdir(this.tempRetrieveDir, { recursive: true });

    // Directory for force-app backup
    this.backupDir = path.join(baseTempDir, 'backup');
    await fs.mkdir(this.backupDir, { recursive: true });

    try {
      // Define metadata types to retrieve
      const metadataTypes = [
        'ApexClass',
        'CustomApplication',
        'CustomObject',
        'CustomPermission',
        'CustomTab',
        'Flow',
        'Layout',
        'Profile',
      ];

      // Collect all metadata
      const packageXmlContent = fromProject
        ? await this.buildPackageXmlFromProject(metadataTypes, apiVersion, profileNames)
        : await this.buildPackageXml(org, metadataTypes, apiVersion, profileNames);

      // Write package.xml
      const packageXmlPath = path.join(this.tempDir, 'package.xml');
      await fs.writeFile(packageXmlPath, packageXmlContent);

      this.log(messages.getMessage('info.building-package', [metadataTypes.length.toString()]));

      // Backup entire force-app directory before retrieve
      this.log('Creating backup of your local metadata...');
      await this.backupForceApp();

      // Retrieve metadata to project directory
      this.log(messages.getMessage('info.retrieving'));
      await this.retrieveMetadataToTemp(org, packageXmlPath, includeAllFields);

      // Restore everything except profiles
      this.log('Restoring your original metadata...');
      await this.restoreForceAppExceptProfiles();

      // Clean up both temp directories
      this.log(messages.getMessage('info.cleaning'));
      await this.cleanup();

      const result = {
        success: true,
        componentsRetrieved: 0,
        metadataTypes,
        profilesRetrieved: 0,
      };

      // Count retrieved profiles
      try {
        const profilesDir = path.join(this.projectPath, 'force-app', 'main', 'default', 'profiles');
        const profiles = await fs.readdir(profilesDir);
        result.profilesRetrieved = profiles.filter((f) => f.endsWith('.profile-meta.xml')).length;
        result.componentsRetrieved = result.profilesRetrieved;
      } catch (error) {
        // Profiles directory might not exist yet
        this.warn('Could not count profiles');
      }

      this.log(messages.getMessage('info.success'));
      this.log(messages.getMessage('info.total-components', [result.componentsRetrieved.toString()]));

      return result;
    } catch (error) {
      // Cleanup on error
      await this.cleanup();
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new SfError(messages.getMessage('error.retrieve-failed', [errorMessage]));
    }
  }

  private async buildPackageXml(
    org: Org,
    metadataTypes: string[],
    apiVersion: string,
    profileNames?: string[]
  ): Promise<string> {
    let packageXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    packageXml += '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';

    const connection = org.getConnection(apiVersion);

    // Fetch all metadata types in parallel
    const metadataPromises = metadataTypes.map(async (metadataType) => {
      this.log(messages.getMessage('info.listing-metadata', [metadataType]));

      try {
        const metadata = await connection.metadata.list({ type: metadataType }, apiVersion);

        if (metadata) {
          const metadataArray = Array.isArray(metadata) ? metadata : [metadata];

          if (metadataArray.length > 0) {
            let sortedMembers = metadataArray.map((m) => m.fullName).sort();

            // Filter profiles if profileNames is specified
            if (metadataType === 'Profile' && profileNames && profileNames.length > 0) {
              sortedMembers = sortedMembers.filter((member) => profileNames.includes(member));
              if (sortedMembers.length === 0) {
                this.warn(messages.getMessage('warn.profiles-not-found', [profileNames.join(', ')]));
                return null;
              } else if (sortedMembers.length < profileNames.length) {
                // Some profiles were not found
                const notFound = profileNames.filter((name) => !sortedMembers.includes(name));
                this.warn(messages.getMessage('warn.some-profiles-not-found', [notFound.join(', ')]));
              }
            }

            return {
              type: metadataType,
              members: sortedMembers,
            };
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.warn(messages.getMessage('error.metadata-list-failed', [metadataType, errorMessage]));
      }
      return null;
    });

    const results = await Promise.all(metadataPromises);

    // Build package XML from results
    for (const result of results) {
      if (result) {
        packageXml += '  <types>\n';
        for (const member of result.members) {
          packageXml += `    <members>${member}</members>\n`;
        }
        packageXml += `    <name>${result.type}</name>\n`;
        packageXml += '  </types>\n';
      }
    }

    packageXml += `  <version>${apiVersion}</version>\n`;
    packageXml += '</Package>';

    return packageXml;
  }

  private async buildPackageXmlFromProject(
    metadataTypes: string[],
    apiVersion: string,
    profileNames?: string[]
  ): Promise<string> {
    let packageXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    packageXml += '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';

    const metadataTypeMap: Record<string, { folder: string; extension: string }> = {
      ApexClass: { folder: 'classes', extension: '.cls' },
      CustomApplication: { folder: 'applications', extension: '.app-meta.xml' },
      CustomObject: { folder: 'objects', extension: '' },
      CustomPermission: { folder: 'customPermissions', extension: '.customPermission-meta.xml' },
      CustomTab: { folder: 'tabs', extension: '.tab-meta.xml' },
      Flow: { folder: 'flows', extension: '.flow-meta.xml' },
      Layout: { folder: 'layouts', extension: '.layout-meta.xml' },
      Profile: { folder: 'profiles', extension: '.profile-meta.xml' },
    };

    // Process all metadata types in parallel
    const metadataResults = await Promise.all(
      metadataTypes.map(async (metadataType) => {
        const config = metadataTypeMap[metadataType];
        if (!config) return null;

        this.log(messages.getMessage('info.listing-metadata', [metadataType]));

        const metadataDir = path.join(this.projectPath, 'force-app', 'main', 'default', config.folder);

        try {
          const files = await fs.readdir(metadataDir);
          let members: string[] = [];

          if (metadataType === 'CustomObject') {
            // For objects, check which entries are directories (in parallel)
            const statResults = await Promise.all(
              files.map(async (file) => ({
                file,
                isDir: (await fs.stat(path.join(metadataDir, file))).isDirectory(),
              }))
            );
            members = statResults.filter((r) => r.isDir).map((r) => r.file);
          } else if (config.extension) {
            // For other types, filter files by extension
            members = files
              .filter((file) => file.endsWith(config.extension))
              .map((file) => file.replace(config.extension, ''));
          }

          // Filter profiles if profileNames is specified
          if (metadataType === 'Profile' && profileNames && profileNames.length > 0) {
            members = members.filter((member) => profileNames.includes(member));
            if (members.length === 0) {
              this.warn(messages.getMessage('warn.profiles-not-found', [profileNames.join(', ')]));
              return null;
            } else if (members.length < profileNames.length) {
              // Some profiles were not found
              const notFound = profileNames.filter((name) => !members.includes(name));
              this.warn(messages.getMessage('warn.some-profiles-not-found', [notFound.join(', ')]));
            }
          }

          if (members.length > 0) {
            return {
              type: metadataType,
              members: members.sort(),
            };
          }
        } catch (error) {
          // Directory doesn't exist or can't be read - skip this metadata type
          this.warn(`Could not read ${metadataType} from project: ${config.folder} directory not found or empty`);
        }
        return null;
      })
    );

    // Build package XML from results
    for (const result of metadataResults) {
      if (result) {
        packageXml += '  <types>\n';
        for (const member of result.members) {
          packageXml += `    <members>${member}</members>\n`;
        }
        packageXml += `    <name>${result.type}</name>\n`;
        packageXml += '  </types>\n';
      }
    }

    packageXml += `  <version>${apiVersion}</version>\n`;
    packageXml += '</Package>';

    return packageXml;
  }

  private async retrieveMetadataToTemp(org: Org, packageXmlPath: string, includeAllFields: boolean): Promise<void> {
    const username = org.getUsername();

    // Retrieve to project (we'll extract profiles later)
    const retrieveCmd = `sf project retrieve start --manifest "${packageXmlPath}" --target-org ${username}`;

    try {
      const { stdout, stderr } = await execAsync(retrieveCmd, {
        cwd: this.projectPath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr && !stderr.includes('Warning')) {
        this.warn(stderr);
      }

      this.log(stdout);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new SfError(`Retrieve failed: ${errorMessage}`);
    }

    // Copy profiles to temp directory immediately
    await this.copyProfilesToTemp();

    // If not including all fields, remove FLS from temp profiles
    if (!includeAllFields) {
      await this.removeFieldLevelSecurityInTemp();
    }
  }

  private async copyProfilesToTemp(): Promise<void> {
    try {
      const projectProfilesDir = path.join(this.projectPath, 'force-app', 'main', 'default', 'profiles');
      const tempProfilesDir = path.join(this.tempRetrieveDir, 'profiles');

      // Ensure temp directory exists
      await fs.mkdir(tempProfilesDir, { recursive: true });

      // Check if profiles directory exists in project
      try {
        await fs.access(projectProfilesDir);
      } catch {
        this.warn('No profiles directory found after retrieve');
        return;
      }

      // Get all profiles from project
      const profiles = await fs.readdir(projectProfilesDir);
      const profileFiles = profiles.filter((f) => f.endsWith('.profile-meta.xml'));

      if (profileFiles.length === 0) {
        this.warn('No profiles found in retrieved metadata');
        return;
      }

      // Copy all profiles to temp
      await Promise.all(
        profileFiles.map((profile) =>
          fs.copyFile(path.join(projectProfilesDir, profile), path.join(tempProfilesDir, profile))
        )
      );

      this.log(`Backed up ${profileFiles.length} profiles to temp directory`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new SfError(`Failed to backup profiles to temp directory: ${errorMessage}`);
    }
  }

  private async removeFieldLevelSecurityInTemp(): Promise<void> {
    try {
      const profilesDir = path.join(this.tempRetrieveDir, 'profiles');
      const profiles = await fs.readdir(profilesDir);

      const profileFiles = profiles.filter((p) => p.endsWith('.profile-meta.xml'));

      if (profileFiles.length === 0) {
        return;
      }

      // Process all profiles in parallel
      await Promise.all(
        profileFiles.map(async (profileFile) => {
          const profilePath = path.join(profilesDir, profileFile);
          let content = await fs.readFile(profilePath, 'utf-8');

          // Remove fieldPermissions sections
          content = content.replace(/<fieldPermissions>[\s\S]*?<\/fieldPermissions>\n?/g, '');

          await fs.writeFile(profilePath, content);
        })
      );

      this.log(`Removed FLS from ${profileFiles.length} profiles`);
    } catch (error) {
      // If we can't remove FLS, just warn
      this.warn('Could not remove Field Level Security from profiles');
    }
  }

  private async backupForceApp(): Promise<void> {
    try {
      const forceAppSource = path.join(this.projectPath, 'force-app');
      const forceAppBackup = path.join(this.backupDir, 'force-app');

      // Check if force-app exists
      try {
        await fs.access(forceAppSource);
      } catch {
        this.log('No force-app directory found, skipping backup');
        return;
      }

      // Copy entire force-app directory to backup
      await fs.cp(forceAppSource, forceAppBackup, { recursive: true });

      this.log('Backup created successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new SfError(`Failed to create backup: ${errorMessage}`);
    }
  }

  private async restoreForceAppExceptProfiles(): Promise<void> {
    try {
      const forceAppBackup = path.join(this.backupDir, 'force-app');
      const forceAppProject = path.join(this.projectPath, 'force-app');

      // Check if backup exists
      try {
        await fs.access(forceAppBackup);
      } catch {
        this.warn('No backup found, skipping restore');
        return;
      }

      // Remove current force-app
      await fs.rm(forceAppProject, { recursive: true, force: true });

      // Restore from backup
      await fs.cp(forceAppBackup, forceAppProject, { recursive: true });

      // Now copy the newly retrieved profiles back
      await this.copyProfilesFromTemp();

      this.log('Original metadata restored, profiles updated');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new SfError(`Failed to restore from backup: ${errorMessage}`);
    }
  }

  private async copyProfilesFromTemp(): Promise<void> {
    try {
      const tempProfilesDir = path.join(this.tempRetrieveDir, 'profiles');
      const projectProfilesDir = path.join(this.projectPath, 'force-app', 'main', 'default', 'profiles');

      // Ensure target directory exists
      await fs.mkdir(projectProfilesDir, { recursive: true });

      // Get all profiles from temp directory
      const profiles = await fs.readdir(tempProfilesDir);
      const profileFiles = profiles.filter((f) => f.endsWith('.profile-meta.xml'));

      if (profileFiles.length === 0) {
        this.warn('No profiles found in temp directory');
        return;
      }

      // Copy all profiles in parallel
      await Promise.all(
        profileFiles.map((profile) =>
          fs.copyFile(path.join(tempProfilesDir, profile), path.join(projectProfilesDir, profile))
        )
      );

      this.log(`Copied ${profileFiles.length} profiles to project`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new SfError(`Failed to copy profiles from temp directory: ${errorMessage}`);
    }
  }

  private async cleanup(): Promise<void> {
    // Clean up entire temp directory tree (includes package, profiles, and backup)
    try {
      const baseTempDir = path.dirname(this.tempDir);
      await fs.rm(baseTempDir, { recursive: true, force: true });
    } catch (error) {
      this.warn('Could not remove temporary directories');
    }
  }
}
