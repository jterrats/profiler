import { Messages, SfError, SfProject } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

import { retrieveProfiles, type RetrieveInput } from '../../operations/index.js';
import {
  PERFORMANCE_FLAGS,
  parsePerformanceFlags,
  resolvePerformanceConfig,
  displayConfigWarnings,
} from '../../core/performance/index.js';

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
    'exclude-managed': Flags.boolean({
      summary: messages.getMessage('flags.exclude-managed.summary'),
      description: messages.getMessage('flags.exclude-managed.description'),
      default: false,
    }),
    force: Flags.boolean({
      summary: messages.getMessage('flags.force.summary'),
      description: messages.getMessage('flags.force.description'),
      default: false,
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      description: messages.getMessage('flags.dry-run.description'),
      default: false,
    }),
    // Performance flags
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    ...(PERFORMANCE_FLAGS as any),
  };

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
  public async run(): Promise<ProfilerRetrieveResult> {
    const { flags } = await this.parse(ProfilerRetrieve);
    const org = flags['target-org'];
    const profileName = flags.name;
    const includeAllFields = flags['all-fields'];
    const fromProject = flags['from-project'];
    const excludeManaged = flags['exclude-managed'];
    const forceFullRetrieve = flags.force;
    const dryRun = flags['dry-run'];
    const apiVersion = flags['api-version'] ?? (await org.retrieveMaxApiVersion());

    // Parse performance flags
    const perfConfig = parsePerformanceFlags(flags);
    const resolvedConfig = resolvePerformanceConfig(perfConfig);
    displayConfigWarnings(resolvedConfig);

    // Parse profile names (comma-separated)
    const profileNames = profileName
      ? profileName
          .split(',')
          .map((name: string) => name.trim())
          .filter((name: string) => name.length > 0)
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
    const projectPath = project.getPath();

    // Build input for monadic operation
    const input: RetrieveInput = {
      org,
      profileNames,
      apiVersion,
      excludeManaged,
      projectPath,
      includeAllFields,
      fromProject,
      performanceConfig: perfConfig,
      forceFullRetrieve,
      dryRun,
    };

    // Show incremental retrieve info
    if (!forceFullRetrieve && !fromProject && !dryRun) {
      this.log('🚀 Incremental retrieve enabled (faster if no changes)');
      this.log('   Use --force to bypass incremental optimization');
    }

    if (dryRun) {
      this.log('🔍 Dry run mode - previewing without executing...');
    }

    // Execute monadic operation
    this.log('Building package.xml...');
    const result = await retrieveProfiles(input).run();

    if (result.isFailure()) {
      throw new SfError(result.error.message, result.error.name);
    }

    const retrieveResult = result.value;

    this.log(`Successfully retrieved ${retrieveResult.profilesRetrieved.length} profile(s)`);

    return {
      success: true,
      componentsRetrieved: retrieveResult.totalComponents,
      metadataTypes: retrieveResult.metadataTypes,
      profilesRetrieved: retrieveResult.profilesRetrieved.length,
    };
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
  }
}
