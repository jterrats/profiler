import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { Messages, SfError, SfProject, Org, AuthInfo, Connection, StateAggregator } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

import {
  compareProfileOperation,
  compareMultiSource,
  type CompareInput,
  type MultiSourceCompareInput,
  type ProfileComparison as OperationProfileComparison,
} from '../../operations/index.js';
import {
  PERFORMANCE_FLAGS,
  parsePerformanceFlags,
  resolvePerformanceConfig,
  displayConfigWarnings,
} from '../../core/performance/index.js';
import { formatComparisonMatrix, exportComparisonMatrix } from '../../core/formatters/index.js';
import { Spinner, StatusMessage, MultiProgressBar, type ProgressOptions } from '../../core/ui/progress.js';

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
    'target-org': Flags.string({
      char: 'o',
      summary: messages.getMessage('flags.target-org.summary'),
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
    sources: Flags.string({
      summary: messages.getMessage('flags.sources.summary'),
      description: messages.getMessage('flags.sources.description'),
    }),
    'output-file': Flags.string({
      char: 'O',
      summary: messages.getMessage('flags.output-file.summary'),
      description: messages.getMessage('flags.output-file.description'),
    }),
    'output-format': Flags.string({
      char: 'F',
      summary: messages.getMessage('flags.output-format.summary'),
      description: messages.getMessage('flags.output-format.description'),
      options: ['table', 'json', 'html'],
      default: 'table',
    }),
    quiet: Flags.boolean({
      summary: messages.getMessage('flags.quiet.summary'),
      description: messages.getMessage('flags.quiet.description'),
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
    const sources = flags.sources;
    const targetOrg = flags['target-org'];

    // Validate that exactly one of target-org or sources is provided
    if (!sources && !targetOrg) {
      throw new SfError(
        'Either --target-org or --sources must be specified. Use --target-org for single-org comparison or --sources for multi-source comparison.'
      );
    }

    if (sources && targetOrg) {
      throw new SfError(
        'Cannot use both --target-org and --sources together. Use --target-org for single-org comparison or --sources for multi-source comparison.'
      );
    }

    // Detect comparison mode
    if (sources) {
      return this.runMultiSourceComparison(flags);
    } else {
      return this.runSingleOrgComparison(flags);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runSingleOrgComparison(flags: any): Promise<ProfilerCompareResult> {
    const targetOrgAlias = flags['target-org'] as string;
    const profileName = flags.name;
    const quiet = flags.quiet ?? false;
    const progressOptions: ProgressOptions = { quiet };
    const status = new StatusMessage(progressOptions);

    // Resolve org from alias/username
    let org: Org;
    try {
      // Use Org.create which handles alias resolution automatically
      org = await Org.create({ aliasOrUsername: targetOrgAlias });
    } catch (error) {
      throw new SfError(
        `Failed to authenticate to org '${targetOrgAlias}': ${error instanceof Error ? error.message : String(error)}`
      );
    }

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

    // Compare each profile with spinner
    const spinner = new Spinner(`Comparing ${profileNames.length} profile(s)...`, progressOptions);
    const startTime = Date.now();

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

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const profilesWithDifferences = comparisons.filter((c) => c.hasDifferences).length;

    spinner.succeed(`Compared ${comparisons.length} profile(s) (${elapsed}s)`);

    // Get output format preferences
    const outputFormat = (flags['output-format'] as 'table' | 'json' | 'html') ?? 'table';
    const outputFile = flags['output-file'] as string | undefined;

    // If output file is specified, export results
    if (outputFile) {
      // For single org comparison, get full comparison results for export
      const fullComparisonPromises = profileNames.map(async (profile) => {
        const input: CompareInput = {
          profileName: profile,
          projectPath,
          org,
          apiVersion,
          performanceConfig: perfConfig,
        };

        const result = await compareProfileOperation(input).run();
        if (result.isFailure()) {
          return null;
        }
        return result.value.comparisons[0];
      });

      const fullResults = await Promise.all(fullComparisonPromises);
      const validResults = fullResults.filter((r): r is OperationProfileComparison => r !== null);

      // Export based on format
      if (outputFormat === 'json') {
        const jsonData = {
          status: 'success',
          org: org.getUsername() ?? org.getOrgId(),
          profilesCompared: validResults.length,
          comparisons: validResults.map((comp) => ({
            profileName: comp.profileName,
            identical: comp.identical,
            differences: comp.differences,
            differenceCount: comp.differences.length,
          })),
        };
        // Ensure directory exists before writing
        const outputDir = path.dirname(outputFile);
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputFile, JSON.stringify(jsonData, null, 2), 'utf-8');
        status.success(`Comparison exported to: ${outputFile}`);
      } else {
        // For HTML/table, use a simplified export
        const exportContent =
          outputFormat === 'html'
            ? this.generateHtmlExport(validResults, org.getUsername() ?? org.getOrgId())
            : this.generateTableExport(validResults);
        await fs.writeFile(outputFile, exportContent, 'utf-8');
        status.success(`Comparison exported to: ${outputFile}`);
      }
    }

    // Display results (unless JSON format with output file)
    if (outputFormat === 'table' || !outputFile) {
      this.displayResults(comparisons);
    }

    status.info(`Total profiles compared: ${comparisons.length}`);
    if (profilesWithDifferences > 0) {
      status.warn(`${profilesWithDifferences} profile(s) have differences`);
    } else {
      status.success('All profiles match - no differences found');
    }

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
    const quiet = flags.quiet ?? false;
    const progressOptions: ProgressOptions = { quiet };
    const status = new StatusMessage(progressOptions);

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

    status.info(`Multi-source comparison mode: ${orgAliases.length} environment(s)`);
    if (!quiet) {
      this.log(`Comparing across environments: ${orgAliases.join(', ')}\n`);
    }

    // Resolve orgs from aliases with spinner
    const spinner = new Spinner('Resolving org connections...', progressOptions);
    const orgSources = await Promise.all(
      orgAliases.map(async (aliasOrUsername) => {
        try {
          // Try to get org using StateAggregator to resolve alias
          const aliasesInstance = await StateAggregator.getInstance();
          const username = aliasesInstance.aliases.getUsername(aliasOrUsername) ?? aliasOrUsername;

          const authInfo = await AuthInfo.create({ username });
          const connection = await Connection.create({ authInfo });
          const org = await Org.create({ connection });
          return { alias: aliasOrUsername, org };
        } catch (error) {
          throw new SfError(
            `Failed to authenticate to org '${aliasOrUsername}': ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      })
    );
    spinner.succeed(`Resolved ${orgSources.length} org connection(s)`);

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

    status.info(`Comparing ${profileNames.length} profile(s): ${profileNames.join(', ')}`);

    // Execute multi-source comparison with progress bars
    const multiProgress = new MultiProgressBar(progressOptions);
    const progressBars = new Map<string, ReturnType<typeof multiProgress.createBar>>();

    // Create progress bars for each org
    for (const source of orgSources) {
      const bar = multiProgress.createBar(source.alias, profileNames.length);
      if (bar) {
        progressBars.set(source.alias, bar);
      }
    }

    const input: MultiSourceCompareInput = {
      profileNames,
      sources: orgSources,
      apiVersion,
      projectPath,
    };

    const startTime = Date.now();
    const result = await compareMultiSource(input).run();

    // Update progress bars as profiles are processed
    // Note: This is a simplified version - in a full implementation,
    // we'd track progress within the operation itself
    for (let i = 0; i < profileNames.length; i++) {
      for (const source of orgSources) {
        const bar = progressBars.get(source.alias);
        if (bar) {
          bar.update(i + 1);
        } else {
          multiProgress.update(source.alias, i + 1, profileNames.length);
        }
      }
    }

    multiProgress.stop();

    if (result.isFailure()) {
      status.error('Multi-source comparison failed');
      throw new SfError(`Multi-source comparison failed: ${result.error.message}`);
    }

    const multiResult = result.value;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    status.success(`Multi-source comparison complete (${elapsed}s)`);

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

  // eslint-disable-next-line class-methods-use-this
  private generateHtmlExport(comparisons: OperationProfileComparison[], orgName: string): string {
    const html = [
      '<!DOCTYPE html>',
      '<html><head><title>Profile Comparison</title>',
      '<style>body{font-family:Arial,sans-serif;margin:20px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#0176d3;color:white;}</style>',
      '</head><body>',
      `<h1>Profile Comparison: ${orgName}</h1>`,
      '<table><tr><th>Profile</th><th>Status</th><th>Differences</th></tr>',
    ];
    for (const comp of comparisons) {
      html.push(
        `<tr><td>${comp.profileName}</td><td>${comp.identical ? '✅ Identical' : '⚠️ Differences'}</td><td>${
          comp.differences.length
        }</td></tr>`
      );
    }
    html.push('</table></body></html>');
    return html.join('\n');
  }

  // eslint-disable-next-line class-methods-use-this
  private generateTableExport(comparisons: OperationProfileComparison[]): string {
    const lines = ['Profile Comparison', '='.repeat(50), ''];
    for (const comp of comparisons) {
      lines.push(`${comp.profileName}: ${comp.identical ? 'Identical' : `${comp.differences.length} differences`}`);
    }
    return lines.join('\n');
  }
}
