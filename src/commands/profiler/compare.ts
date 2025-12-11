import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { Messages, SfError, SfProject, AuthInfo, Connection, Org } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

import {
  compareProfileOperation,
  compareMultiSource,
  type CompareInput,
  type MultiSourceCompareInput,
} from '../../operations/index.js';
import {
  PERFORMANCE_FLAGS,
  parsePerformanceFlags,
  resolvePerformanceConfig,
  displayConfigWarnings,
} from '../../core/performance/index.js';
import { formatComparisonMatrix, exportComparisonMatrix } from '../../core/formatters/index.js';

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
    'target-org': Flags.optionalOrg({
      summary: messages.getMessage('flags.target-org.summary'),
      exactlyOne: ['target-org', 'sources'],
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
    'no-cache': Flags.boolean({
      summary: messages.getMessage('flags.no-cache.summary'),
      description: messages.getMessage('flags.no-cache.description'),
      default: false,
    }),
    sources: Flags.string({
      summary: messages.getMessage('flags.sources.summary'),
      description: messages.getMessage('flags.sources.description'),
      exclusive: ['target-org'],
    }),
    'output-file': Flags.string({
      summary: messages.getMessage('flags.output-file.summary'),
      description: messages.getMessage('flags.output-file.description'),
    }),
    'output-format': Flags.string({
      summary: messages.getMessage('flags.output-format.summary'),
      description: messages.getMessage('flags.output-format.description'),
      options: ['table', 'json', 'html'],
      default: 'table',
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
    const sources = flags.sources;

    // Detect comparison mode
    if (sources) {
      return this.runMultiSourceComparison(flags);
    } else {
      return this.runSingleOrgComparison(flags);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runSingleOrgComparison(flags: any): Promise<ProfilerCompareResult> {
    const org = flags['target-org'];
    const profileName = flags.name;
    const noCache = flags['no-cache'] ?? false;
    const apiVersion = flags['api-version'] ?? (await org.retrieveMaxApiVersion());

    // Parse performance flags
    const perfConfig = parsePerformanceFlags(flags);
    const resolvedConfig = resolvePerformanceConfig(perfConfig);
    displayConfigWarnings(resolvedConfig);

    // Show cache bypass info
    if (noCache) {
      this.log('🔄 Cache bypassed - forcing fresh retrieval from org');
    }

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
        noCache,
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
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runMultiSourceComparison(flags: any): Promise<ProfilerCompareResult> {
    const sources = flags.sources as string;
    const profileName = flags.name;
    const noCache = flags['no-cache'] ?? false;

    // Parse org aliases
    const orgAliases = sources
      .split(',')
      .map((alias) => alias.trim())
      .filter((alias) => alias.length > 0);

    if (orgAliases.length < 2) {
      throw new SfError(
        'Multi-source comparison requires at least 2 org aliases. Use comma-separated format: "dev,qa,prod"'
      );
    }

    this.log(messages.getMessage('info.multi-source-mode', [orgAliases.length.toString()]));
    this.log(`Comparing across environments: ${orgAliases.join(', ')}\n`);

    // Resolve orgs from aliases
    const orgSources = await Promise.all(
      orgAliases.map(async (alias) => {
        try {
          const authInfo = await AuthInfo.create({ username: alias });
          const connection = await Connection.create({ authInfo });
          const org = await Org.create({ connection });
          return { alias, org };
        } catch (error) {
          throw new SfError(
            `Failed to authenticate to org '${alias}': ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })
    );

    // Get API version from first org
    const apiVersion = flags['api-version'] ?? (await orgSources[0].org.retrieveMaxApiVersion());

    // Get project path for profile names
    const project = await SfProject.resolve();
    const projectPath = project.getPath();

    // Determine which profiles to compare
    const profileNames = await ProfilerCompare.getProfilesToCompare(projectPath, profileName);

    if (profileNames.length === 0) {
      throw new SfError(messages.getMessage('error.no-profiles-found'));
    }

    this.log(`Comparing ${profileNames.length} profile(s): ${profileNames.join(', ')}`);

    // Execute multi-source comparison
    const input: MultiSourceCompareInput = {
      profileNames,
      sources: orgSources,
      apiVersion,
      noCache,
    };

    const result = await compareMultiSource(input).run();

    if (result.isFailure()) {
      throw new SfError(`Multi-source comparison failed: ${result.error.message}`);
    }

    const multiResult = result.value;

    // Get output format preferences
    const outputFormat = (flags['output-format'] as 'table' | 'json' | 'html') ?? 'table';
    const outputFile = flags['output-file'] as string | undefined;

    // Format the comparison matrix
    const formatted = formatComparisonMatrix(multiResult, {
      format: outputFormat,
      includeDetails: false,
      compact: false,
    });

    // Export to file if requested
    if (outputFile) {
      await exportComparisonMatrix(multiResult, outputFile, {
        format: outputFormat,
        includeDetails: false,
        compact: false,
      });
      this.log(`\n📄 Comparison matrix exported to: ${outputFile}`);
    }

    // Display results (unless it's JSON format which is handled by --json flag)
    if (outputFormat === 'table') {
      this.log(formatted.content);
    } else if (!outputFile) {
      // If JSON/HTML and no output file, still display it
      this.log(formatted.content);
    }

    return {
      success: true,
      totalProfilesCompared: profileNames.length,
      profilesWithDifferences: 0, // TODO: Calculate from matrix
      comparisons: [],
    };
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

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
