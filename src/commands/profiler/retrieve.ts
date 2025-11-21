import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { Messages, Org, SfError, SfProject } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

const execAsync = promisify(exec);

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('profiler', 'profiler.retrieve');

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
  private projectPath = '';

  public async run(): Promise<ProfilerRetrieveResult> {
    const { flags } = await this.parse(ProfilerRetrieve);
    const org = flags['target-org'];
    const includeAllFields = flags['all-fields'];
    const fromProject = flags['from-project'];
    const apiVersion = flags['api-version'] ?? (await org.retrieveMaxApiVersion());

    this.log(messages.getMessage('info.starting', [org.getUsername() ?? org.getOrgId()]));

    // Get project path
    const project = await SfProject.resolve();
    this.projectPath = project.getPath();

    // Create temp directory
    this.tempDir = path.join(this.projectPath, 'temp');
    await fs.mkdir(this.tempDir, { recursive: true });

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
        ? await this.buildPackageXmlFromProject(metadataTypes, apiVersion)
        : await this.buildPackageXml(org, metadataTypes, apiVersion);

      // Write package.xml
      const packageXmlPath = path.join(this.tempDir, 'package.xml');
      await fs.writeFile(packageXmlPath, packageXmlContent);

      this.log(messages.getMessage('info.building-package', [metadataTypes.length.toString()]));

      // Retrieve metadata
      this.log(messages.getMessage('info.retrieving'));
      await this.retrieveMetadata(org, packageXmlPath, includeAllFields);

      // Clean up
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new SfError(messages.getMessage('error.retrieve-failed', [errorMessage]));
    }
  }

  private async buildPackageXml(org: Org, metadataTypes: string[], apiVersion: string): Promise<string> {
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
            const sortedMembers = metadataArray
              .map((m) => m.fullName)
              .sort();

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

  private async buildPackageXmlFromProject(metadataTypes: string[], apiVersion: string): Promise<string> {
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

  private async retrieveMetadata(org: Org, packageXmlPath: string, includeAllFields: boolean): Promise<void> {
    const username = org.getUsername();

    // Build the retrieve command
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

    // If not including all fields, clean up the retrieved profiles to remove FLS
    if (!includeAllFields) {
      await this.removeFieldLevelSecurity();
    }

    // Clean retrieved metadata to restore original versions from git
    await this.restoreOriginalMetadata();
  }

  private async removeFieldLevelSecurity(): Promise<void> {
    try {
      const profilesDir = path.join(this.projectPath, 'force-app', 'main', 'default', 'profiles');
      const profiles = await fs.readdir(profilesDir);

      const profileFiles = profiles.filter((p) => p.endsWith('.profile-meta.xml'));

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
    } catch (error) {
      // If we can't remove FLS, just warn
      this.warn('Could not remove Field Level Security from profiles');
    }
  }

  private async restoreOriginalMetadata(): Promise<void> {
    try {
      // Clean untracked files in force-app/
      await execAsync('git clean -f force-app/', {
        cwd: this.projectPath,
      }).catch(() => {
        // Ignore errors if git clean fails (e.g., not a git repo)
      });

      // Restore original versions of metadata that we don't want to update
      const pathsToRestore = [
        'force-app/main/default/applications/',
        'force-app/main/default/classes/',
        'force-app/main/default/flows/',
        'force-app/main/default/layouts/',
        'force-app/main/default/objects/',
      ];

      // Restore all paths in parallel
      await Promise.all(
        pathsToRestore.map((metadataPath) =>
          execAsync(`git checkout -- ${metadataPath}`, {
            cwd: this.projectPath,
          }).catch(() => {
            // Ignore errors if checkout fails (e.g., path doesn't exist or not in git)
          })
        )
      );
    } catch (error) {
      // If git operations fail, just warn - this is not critical
      this.warn('Could not restore original metadata from git. This is normal if not using git.');
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      this.warn('Could not remove temp directory');
    }
  }
}

