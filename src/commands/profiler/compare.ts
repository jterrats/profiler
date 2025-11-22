import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { Messages, Org, SfError, SfProject } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

const execAsync = promisify(exec);

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@jterrats/profiler', 'profiler.compare');

type ProfileComparison = {
  profileName: string;
  hasDifferences: boolean;
  differences: ProfileDifference[];
};

type ProfileDifference = {
  lineNumber: number;
  type: 'added' | 'removed' | 'changed';
  localLine?: string;
  orgLine?: string;
};

export type ProfilerCompareResult = {
  success: boolean;
  totalProfilesCompared: number;
  profilesWithDifferences: number;
  comparisons: ProfileComparison[];
};

export default class ProfilerCompare extends SfCommand<ProfilerCompareResult> {
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
    'api-version': Flags.string({
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
  };

  private tempDir = '';
  private projectPath = '';

  private static buildSingleProfilePackageXml(profileName: string, apiVersion: string): string {
    let packageXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    packageXml += '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';
    packageXml += '  <types>\n';
    packageXml += `    <members>${profileName}</members>\n`;
    packageXml += '    <name>Profile</name>\n';
    packageXml += '  </types>\n';
    packageXml += `  <version>${apiVersion}</version>\n`;
    packageXml += '</Package>';
    return packageXml;
  }

  private static compareLines(localContent: string, orgContent: string): ProfileDifference[] {
    const localLines = localContent.split('\n');
    const orgLines = orgContent.split('\n');
    const differences: ProfileDifference[] = [];

    const maxLength = Math.max(localLines.length, orgLines.length);

    for (let i = 0; i < maxLength; i++) {
      const localLine = localLines[i];
      const orgLine = orgLines[i];

      if (localLine !== orgLine) {
        if (localLine === undefined) {
          // Line exists in org but not in local (added)
          differences.push({
            lineNumber: i + 1,
            type: 'added',
            orgLine,
          });
        } else if (orgLine === undefined) {
          // Line exists in local but not in org (removed)
          differences.push({
            lineNumber: i + 1,
            type: 'removed',
            localLine,
          });
        } else {
          // Line exists in both but is different (changed)
          differences.push({
            lineNumber: i + 1,
            type: 'changed',
            localLine,
            orgLine,
          });
        }
      }
    }

    return differences;
  }

  public async run(): Promise<ProfilerCompareResult> {
    const { flags } = await this.parse(ProfilerCompare);
    const org = flags['target-org'];
    const profileName = flags.name;
    const apiVersion = flags['api-version'] ?? (await org.retrieveMaxApiVersion());

    this.log(messages.getMessage('info.starting', [org.getUsername() ?? org.getOrgId()]));

    // Get project path
    const project = await SfProject.resolve();
    this.projectPath = project.getPath();

    // Create temp directory for org versions
    this.tempDir = path.join(this.projectPath, 'temp-compare');
    await fs.mkdir(this.tempDir, { recursive: true });

    try {
      const comparisons: ProfileComparison[] = [];

      if (profileName) {
        // Compare single profile
        const comparison = await this.compareProfile(org, profileName, apiVersion);
        if (comparison) {
          comparisons.push(comparison);
        }
      } else {
        // Compare all profiles
        const localProfiles = await this.getLocalProfiles();
        if (localProfiles.length === 0) {
          throw new SfError(messages.getMessage('error.no-profiles-found'));
        }

        // Compare all profiles in parallel
        const comparisonPromises = localProfiles.map(async (profile) => {
          this.log(messages.getMessage('info.comparing-profile', [profile]));
          return this.compareProfile(org, profile, apiVersion);
        });

        const results = await Promise.all(comparisonPromises);
        comparisons.push(...results.filter((c): c is ProfileComparison => c !== null));
      }

      // Display results
      this.displayResults(comparisons);

      // Cleanup
      await this.cleanup();

      const profilesWithDifferences = comparisons.filter((c) => c.hasDifferences).length;

      this.log(messages.getMessage('info.total-profiles-compared', [comparisons.length.toString()]));
      this.log(messages.getMessage('info.profiles-with-differences', [profilesWithDifferences.toString()]));
      this.log(messages.getMessage('success.comparison-complete'));

      return {
        success: true,
        totalProfilesCompared: comparisons.length,
        profilesWithDifferences,
        comparisons,
      };
    } catch (error) {
      await this.cleanup();
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new SfError(messages.getMessage('error.comparison-failed', [errorMessage]));
    }
  }

  private async getLocalProfiles(): Promise<string[]> {
    const profilesDir = path.join(this.projectPath, 'force-app', 'main', 'default', 'profiles');

    try {
      const files = await fs.readdir(profilesDir);
      return files.filter((f) => f.endsWith('.profile-meta.xml')).map((f) => f.replace('.profile-meta.xml', ''));
    } catch (error) {
      return [];
    }
  }

  private async compareProfile(org: Org, profileName: string, apiVersion: string): Promise<ProfileComparison | null> {
    const localProfilePath = path.join(
      this.projectPath,
      'force-app',
      'main',
      'default',
      'profiles',
      `${profileName}.profile-meta.xml`
    );

    // Check if local profile exists
    try {
      await fs.access(localProfilePath);
    } catch (error) {
      this.warn(messages.getMessage('error.profile-not-found-locally', [profileName]));
      return null;
    }

    // Retrieve profile from org
    this.log(messages.getMessage('info.retrieving-org-version'));
    const orgProfilePath = await this.retrieveProfileFromOrg(org, profileName, apiVersion);

    if (!orgProfilePath) {
      this.warn(messages.getMessage('error.profile-not-found-org', [profileName]));
      return null;
    }

    // Read both files
    const localContent = await fs.readFile(localProfilePath, 'utf-8');
    const orgContent = await fs.readFile(orgProfilePath, 'utf-8');

    // Compare line by line
    const differences = ProfilerCompare.compareLines(localContent, orgContent);

    const comparison: ProfileComparison = {
      profileName,
      hasDifferences: differences.length > 0,
      differences,
    };

    return comparison;
  }

  private async retrieveProfileFromOrg(org: Org, profileName: string, apiVersion: string): Promise<string | null> {
    try {
      // Create package.xml for single profile
      const packageXml = ProfilerCompare.buildSingleProfilePackageXml(profileName, apiVersion);
      const packageXmlPath = path.join(this.tempDir, `package-${profileName}.xml`);
      await fs.writeFile(packageXmlPath, packageXml);

      // Create output directory for this profile
      const outputDir = path.join(this.tempDir, profileName);
      await fs.mkdir(outputDir, { recursive: true });

      // Retrieve using sf CLI
      const username = org.getUsername();
      const retrieveCmd = `sf project retrieve start --manifest "${packageXmlPath}" --target-org ${username} --output-dir "${outputDir}"`;

      await execAsync(retrieveCmd, {
        cwd: this.projectPath,
        maxBuffer: 10 * 1024 * 1024,
      });

      // Return path to retrieved profile
      const retrievedProfilePath = path.join(
        outputDir,
        'force-app',
        'main',
        'default',
        'profiles',
        `${profileName}.profile-meta.xml`
      );

      // Verify file exists
      try {
        await fs.access(retrievedProfilePath);
        return retrievedProfilePath;
      } catch (error) {
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.warn(messages.getMessage('error.retrieve-failed', [errorMessage]));
      return null;
    }
  }

  private displayResults(comparisons: ProfileComparison[]): void {
    for (const comparison of comparisons) {
      this.log('\n' + '='.repeat(80));
      this.log(`Profile: ${comparison.profileName}`);
      this.log('='.repeat(80));

      if (!comparison.hasDifferences) {
        this.log(messages.getMessage('info.no-differences', [comparison.profileName]));
        continue;
      }

      this.log(messages.getMessage('info.differences-found', [comparison.profileName]));
      this.log(`Total differences: ${comparison.differences.length}\n`);

      // Group differences by type
      const added = comparison.differences.filter((d) => d.type === 'added');
      const removed = comparison.differences.filter((d) => d.type === 'removed');
      const changed = comparison.differences.filter((d) => d.type === 'changed');

      if (added.length > 0) {
        this.log(messages.getMessage('info.line-added'));
        for (const diff of added) {
          this.log(`  Line ${diff.lineNumber}: ${diff.orgLine}`);
        }
        this.log('');
      }

      if (removed.length > 0) {
        this.log(messages.getMessage('info.line-removed'));
        for (const diff of removed) {
          this.log(`  Line ${diff.lineNumber}: ${diff.localLine}`);
        }
        this.log('');
      }

      if (changed.length > 0) {
        this.log(messages.getMessage('info.line-changed'));
        for (const diff of changed.slice(0, 20)) {
          // Limit to first 20 for readability
          this.log(`  Line ${diff.lineNumber}:`);
          this.log(`    Local:  ${diff.localLine}`);
          this.log(`    Org:    ${diff.orgLine}`);
        }
        if (changed.length > 20) {
          this.log(`  ... and ${changed.length - 20} more changed lines`);
        }
        this.log('');
      }
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      this.warn(messages.getMessage('warning.temp-dir-cleanup'));
    }
  }
}
