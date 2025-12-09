import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { Messages, SfError, SfProject } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

import { compareProfileOperation, type CompareInput } from '../../operations/index.js';
import { PERFORMANCE_FLAGS, parsePerformanceFlags, resolvePerformanceConfig, displayConfigWarnings } from '../../core/performance/index.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@jterrats/profiler', 'profiler.compare');

type ProfileComparison = {
  profileName: string;
  hasDifferences: boolean;
  addedLines: number;
  removedLines: number;
  changedLines: number;
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    'exclude-managed': Flags.boolean({
      summary: messages.getMessage('flags.exclude-managed.summary'),
      description: messages.getMessage('flags.exclude-managed.description'),
      default: false,
    }),
    // Performance flags
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    ...(PERFORMANCE_FLAGS as any),
  };

  private static async getProfilesToCompare(projectPath: string, profileName?: string): Promise<string[]> {
    if (profileName) {
      // Parse profile names (comma-separated)
      return profileName
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
    }

    // Get all local profiles
    const profilesDir = path.join(projectPath, 'force-app', 'main', 'default', 'profiles');

    try {
      const files = await fs.readdir(profilesDir);
      return files.filter((f) => f.endsWith('.profile-meta.xml')).map((f) => f.replace('.profile-meta.xml', ''));
    } catch (error) {
      return [];
    }
  }

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
  public async run(): Promise<ProfilerCompareResult> {
    const { flags } = await this.parse(ProfilerCompare);
    const org = flags['target-org'];
    const profileName = flags.name;
    const apiVersion = flags['api-version'] ?? (await org.retrieveMaxApiVersion());

    // Parse performance flags
    const perfConfig = parsePerformanceFlags(flags);
    const resolvedConfig = resolvePerformanceConfig(perfConfig);
    displayConfigWarnings(resolvedConfig);

    this.log(messages.getMessage('info.starting', [org.getUsername() ?? org.getOrgId()]));

    // Get project path
    const project = await SfProject.resolve();
    const projectPath = project.getPath();

    // Determine which profiles to compare
    const profileNames = await ProfilerCompare.getProfilesToCompare(projectPath, profileName);

    if (profileNames.length === 0) {
      throw new SfError(messages.getMessage('error.no-profiles-found'));
    }

    if (profileNames.length === 1) {
      this.log(messages.getMessage('info.comparing-profile', [profileNames[0]]));
    } else {
      this.log(`Comparing ${profileNames.length} profiles: ${profileNames.join(', ')}`);
    }

    // Compare profiles in parallel
    const comparisons: ProfileComparison[] = [];
    const comparisonPromises = profileNames.map(async (profile) => {
      const input: CompareInput = {
        profileName: profile,
        projectPath,
        org,
        apiVersion,
        performanceConfig: perfConfig,
      };

      const result = await compareProfileOperation(input).run();

      if (result.isFailure()) {
        this.warn(`Failed to compare profile '${profile}': ${result.error.message}`);
        return null;
      }

      const compareResult = result.value;
      const comparison = compareResult.comparisons[0]; // Single profile comparison
      const hasDifferences = !comparison.identical;

      // Count diff types from differences array (each is a string description)
      const totalDiffs = comparison.differences.length;

      return {
        profileName: profile,
        hasDifferences,
        addedLines: totalDiffs, // Simplified: just show total differences
        removedLines: 0,
        changedLines: 0,
      };
    });

    const results = await Promise.all(comparisonPromises);
    comparisons.push(...results.filter((c): c is ProfileComparison => c !== null));

    // Display results
    this.displayResults(comparisons);

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
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
  }

  private displayResults(comparisons: ProfileComparison[]): void {
    this.log('\n=== Comparison Results ===\n');

    for (const comparison of comparisons) {
      if (comparison.hasDifferences) {
        this.log(`❌ ${comparison.profileName} - HAS DIFFERENCES`);
        this.log(
          `   Added: ${comparison.addedLines}, Removed: ${comparison.removedLines}, Changed: ${comparison.changedLines}`
        );
      } else {
        this.log(`✅ ${comparison.profileName} - NO DIFFERENCES`);
      }
    }

    this.log('');
  }
}
