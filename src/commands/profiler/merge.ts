/*
 * Copyright (c) 2024, Jorge Terrats
 * All rights reserved.
 * Licensed under the MIT License.
 * For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import { Messages, SfError, SfProject, AuthInfo, Connection, Org, StateAggregator } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

import { type MergeStrategy } from '../../operations/index.js';
import { readLocalProfile, parseProfileXml, retrieveProfileWithMetadata } from '../../operations/index.js';
import type { ProfileXml } from '../../operations/index.js';
import { Spinner, StatusMessage, type ProgressOptions } from '../../core/ui/progress.js';
import {
  conflictsToChanges,
  promptForChanges,
  promptForPreview,
  isInteractiveTerminal,
} from '../../core/ui/interactive.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@jterrats/profiler', 'profiler.merge');

export type ProfilerMergeResult = {
  success: boolean;
  profileName: string;
  merged: boolean;
  conflicts: number;
  strategy: MergeStrategy;
  backupPath?: string;
  dryRun: boolean;
  previewChanges?: string[];
};

export default class ProfilerMerge extends SfCommand<ProfilerMergeResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  public static readonly flags = {
    'target-org': Flags.string({
      char: 'o',
      required: true,
      summary: messages.getMessage('flags.target-org.summary'),
      description: messages.getMessage('flags.target-org.description'),
    }),
    name: Flags.string({
      char: 'n',
      required: true,
      summary: messages.getMessage('flags.name.summary'),
      description: messages.getMessage('flags.name.description'),
    }),
    strategy: Flags.string({
      summary: messages.getMessage('flags.strategy.summary'),
      description: messages.getMessage('flags.strategy.description'),
      options: ['local-wins', 'org-wins', 'union', 'local', 'org', 'interactive', 'abort-on-conflict'],
      default: 'local-wins',
    }),
    'api-version': Flags.string({
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      description: messages.getMessage('flags.dry-run.description'),
      default: false,
    }),
    'skip-backup': Flags.boolean({
      summary: messages.getMessage('flags.skip-backup.summary'),
      description: messages.getMessage('flags.skip-backup.description'),
      default: false,
    }),
    quiet: Flags.boolean({
      summary: messages.getMessage('flags.quiet.summary'),
      description: messages.getMessage('flags.quiet.description'),
      default: false,
    }),
  };

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
  public async run(): Promise<ProfilerMergeResult> {
    const { flags } = await this.parse(ProfilerMerge);
    const profileName = flags.name;
    const strategy = (flags.strategy ?? 'local-wins') as MergeStrategy;
    const dryRun = flags['dry-run'] ?? false;
    const skipBackup = flags['skip-backup'] ?? false;
    const quiet = flags.quiet ?? false;
    const apiVersion = flags['api-version'];

    const progressOptions: ProgressOptions = { quiet };
    const status = new StatusMessage(progressOptions);

    const project = await SfProject.resolve();
    const projectPath = project.getPath();

    const spinner = new Spinner(`Merging profile '${profileName}'...`, progressOptions);
    const startTime = Date.now();

    const org = await this.resolveOrg(flags['target-org']);
    const resolvedApiVersion = apiVersion ?? (await org.retrieveMaxApiVersion());

    spinner.updateText('Validating local profile...');
    await this.validateLocalProfile(profileName, projectPath);

    spinner.updateText('Loading local profile...');
    const localProfile = await this.loadLocalProfile(profileName, projectPath);

    spinner.updateText('Retrieving org profile...');
    const orgProfile = await this.loadOrgProfile(
      profileName,
      org,
      resolvedApiVersion,
      projectPath,
      flags['target-org']
    );

    spinner.updateText('Detecting conflicts...');
    const conflicts = await this.detectConflicts(localProfile, orgProfile);

    if (conflicts.length === 0) {
      spinner.succeed('No conflicts detected - profiles are identical');
      return {
        success: true,
        profileName,
        merged: false,
        conflicts: 0,
        strategy,
        dryRun,
      };
    }

    spinner.updateText(`Detected ${conflicts.length} conflict(s)`);
    if (!quiet) {
      this.log(messages.getMessage('info.conflicts-detected', [conflicts.length.toString()]));
    }

    // Handle interactive mode
    let conflictsToMerge = conflicts;
    if (strategy === 'interactive') {
      if (!isInteractiveTerminal()) {
        throw new SfError(
          'Interactive mode requires a TTY. Use a non-interactive strategy or run in an interactive terminal.'
        );
      }

      spinner.succeed('Conflicts detected - switching to interactive mode');
      const changes = conflictsToChanges(conflicts);
      const selectedChangeIds = await promptForChanges(changes);

      if (selectedChangeIds.length === 0) {
        status.info('No changes selected - merge cancelled');
        return {
          success: true,
          profileName,
          merged: false,
          conflicts: conflicts.length,
          strategy,
          dryRun,
        };
      }

      // Filter conflicts based on selection
      conflictsToMerge = conflicts.filter((_, index) => selectedChangeIds.includes(`change-${index}`));

      // Show preview and confirm
      const confirmed = await promptForPreview(selectedChangeIds, changes);
      if (!confirmed) {
        status.info('Merge cancelled by user');
        return {
          success: true,
          profileName,
          merged: false,
          conflicts: conflicts.length,
          strategy,
          dryRun,
        };
      }

      if (!quiet) {
        this.log(`\nApplying ${selectedChangeIds.length} selected change(s)...`);
      }
    } else {
      this.displayDryRunPreview(dryRun, conflicts);
    }

    if (dryRun) {
      spinner.succeed('Dry run complete - no changes applied');
    } else {
      spinner.updateText(`Merging with strategy '${strategy}'...`);
    }

    const result = await this.executeMerge(
      org,
      profileName,
      projectPath,
      strategy,
      resolvedApiVersion,
      skipBackup,
      dryRun,
      conflictsToMerge,
      localProfile,
      orgProfile
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (!dryRun) {
      spinner.succeed(`Merge complete (${elapsed}s)`);
    }

    this.displayMergeResults(result, dryRun);
    if (result.backupPath && !quiet) {
      status.info(`Backup created: ${result.backupPath}`);
    }
    status.success('Merge operation completed successfully');

    return {
      success: true,
      profileName: result.profileName,
      merged: result.merged,
      conflicts: result.conflicts,
      strategy: result.strategy,
      backupPath: result.backupPath,
      dryRun: result.dryRun,
      previewChanges: result.previewChanges,
    };
  }

  private async resolveOrg(targetOrgAlias: string): Promise<Org> {
    try {
      const aliases = await StateAggregator.getInstance();
      const username = aliases.aliases.getUsername(targetOrgAlias) ?? targetOrgAlias;
      const authInfo = await AuthInfo.create({ username });
      const connection = await Connection.create({ authInfo });
      return await Org.create({ connection });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.error(messages.getMessage('error.org-auth-failed', [targetOrgAlias, errorMessage]));
      throw new SfError(messages.getMessage('error.org-auth-failed', [targetOrgAlias, errorMessage]));
    }
  }

  private async validateLocalProfile(profileName: string, projectPath: string): Promise<void> {
    const localProfilePath = path.join(
      projectPath,
      'force-app',
      'main',
      'default',
      'profiles',
      `${profileName}.profile-meta.xml`
    );
    try {
      await fs.access(localProfilePath);
    } catch {
      this.error(messages.getMessage('error.profile-not-found-local', [profileName]));
      throw new SfError(messages.getMessage('error.profile-not-found-local', [profileName]));
    }
  }

  private async loadLocalProfile(profileName: string, projectPath: string): Promise<ProfileXml> {
    const localProfileResult = await readLocalProfile(profileName, projectPath).run();
    if (localProfileResult.isFailure()) {
      this.error(messages.getMessage('error.profile-not-found-local', [profileName]));
      throw new SfError(messages.getMessage('error.profile-not-found-local', [profileName]));
    }

    const localParsedResult = await parseProfileXml(localProfileResult.value, profileName).run();
    if (localParsedResult.isFailure()) {
      const errorMessage = localParsedResult.error.message;
      this.error(`Failed to parse local profile: ${errorMessage}`);
      throw new SfError(`Failed to parse local profile: ${errorMessage}`);
    }

    return localParsedResult.value;
  }

  private async loadOrgProfile(
    profileName: string,
    org: Org,
    apiVersion: string,
    projectPath: string,
    targetOrgAlias: string
  ): Promise<ProfileXml> {
    this.log(messages.getMessage('info.retrieving-org-profile', [org.getUsername() ?? org.getOrgId()]));

    let orgProfileXml: string;
    try {
      orgProfileXml = await retrieveProfileWithMetadata(profileName, org, apiVersion, projectPath);
    } catch (error) {
      throw new SfError(
        messages.getMessage('error.profile-not-found-org', [profileName, org.getUsername() ?? org.getOrgId()])
      );
    }

    const orgParsedResult = await parseProfileXml(orgProfileXml, `${targetOrgAlias}:${profileName}`).run();
    if (orgParsedResult.isFailure()) {
      throw new SfError(`Failed to parse org profile: ${orgParsedResult.error.message}`);
    }

    return orgParsedResult.value;
  }

  private async detectConflicts(
    localProfile: ProfileXml,
    orgProfile: ProfileXml
  ): Promise<Array<{ element: string; localValue: string; orgValue: string }>> {
    this.log(messages.getMessage('info.detecting-conflicts'));
    const { detectConflicts } = await import('../../operations/merge-operation.js');
    const conflictsResult = await detectConflicts(localProfile, orgProfile).run();
    if (conflictsResult.isFailure()) {
      throw new SfError(`Failed to detect conflicts: ${conflictsResult.error.message}`);
    }
    return conflictsResult.value;
  }

  private displayDryRunPreview(
    dryRun: boolean,
    conflicts: Array<{ element: string; localValue: string; orgValue: string }>
  ): void {
    if (dryRun) {
      this.log(messages.getMessage('info.dry-run-mode'));
      this.log(messages.getMessage('info.preview-changes'));
      for (const conflict of conflicts) {
        this.log(`  - ${conflict.element}: local="${conflict.localValue}", org="${conflict.orgValue}"`);
      }
    }
  }

  private async executeMerge(
    org: Org,
    profileName: string,
    projectPath: string,
    strategy: MergeStrategy,
    apiVersion: string,
    skipBackup: boolean,
    dryRun: boolean,
    conflicts: Array<{ element: string; localValue: string; orgValue: string }>,
    localProfile: ProfileXml,
    orgProfile: ProfileXml
  ): Promise<{
    profileName: string;
    merged: boolean;
    conflicts: number;
    strategy: MergeStrategy;
    backupPath?: string;
    dryRun: boolean;
    previewChanges?: string[];
  }> {
    // Create backup first (unless skipped or dry-run)
    let backupPath: string | undefined;
    if (!dryRun && !skipBackup) {
      const { createBackup } = await import('../../operations/merge-operation.js');
      const backupResult = await createBackup(profileName, projectPath).run();
      if (backupResult.isSuccess()) {
        backupPath = backupResult.value;
      }
    }

    // Execute merge
    this.log(messages.getMessage('info.merging', [strategy]));
    const { mergeProfiles, writeMergedProfile, validateMergedProfile } = await import(
      '../../operations/merge-operation.js'
    );

    const mergedResult = await mergeProfiles(localProfile, orgProfile, conflicts, strategy, profileName).run();
    if (mergedResult.isFailure()) {
      const error = mergedResult.error;
      if (error.message.includes('conflict')) {
        throw new SfError(messages.getMessage('error.conflicts-detected', [conflicts.length.toString()]));
      }
      if (error.message.includes('No changes')) {
        throw new SfError(messages.getMessage('error.no-changes'));
      }
      throw new SfError(messages.getMessage('error.merge-failed', [error.message]));
    }

    const mergedProfile = mergedResult.value;

    // Validate merged profile
    const validationResult = await validateMergedProfile(mergedProfile, profileName).run();
    if (validationResult.isFailure()) {
      throw new SfError(`Validation failed: ${validationResult.error.message}`);
    }

    // Write merged profile (or preview in dry-run)
    const writeResult = await writeMergedProfile(profileName, projectPath, mergedProfile.content, dryRun).run();
    if (writeResult.isFailure()) {
      throw new SfError(`Failed to write merged profile: ${writeResult.error.message}`);
    }

    const previewChanges = dryRun
      ? [
          `Would merge profile '${profileName}' using strategy: ${strategy}`,
          `Detected ${conflicts.length} conflict(s)`,
          'Changes would include:',
          ...conflicts
            .slice(0, 5)
            .map(
              (c) =>
                `  - ${c.element}: local="${c.localValue.substring(0, 50)}...", org="${c.orgValue.substring(0, 50)}..."`
            ),
          conflicts.length > 5 ? `  ... and ${conflicts.length - 5} more conflict(s)` : '',
          `- Update local profile file: ${writeResult.value}`,
        ].filter(Boolean)
      : undefined;

    return {
      profileName,
      merged: !dryRun,
      conflicts: conflicts.length,
      strategy,
      backupPath,
      dryRun,
      previewChanges,
    };
  }

  private displayMergeResults(
    result: { backupPath?: string; dryRun: boolean; previewChanges?: string[] },
    dryRun: boolean
  ): void {
    if (result.backupPath && !dryRun) {
      this.log(messages.getMessage('info.backup-created', [result.backupPath]));
    }

    if (dryRun && result.previewChanges) {
      this.log('');
      for (const change of result.previewChanges) {
        this.log(`  ${change}`);
      }
    }
  }
}
