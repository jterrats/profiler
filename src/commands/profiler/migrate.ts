/**
 * @fileoverview Migrate Command - Profile to Permission Set Migration
 *
 * Migrates permissions from Profiles to Permission Sets.
 * Supports multiple permission types: FLS, Apex, Flows, Tabs, Record Types.
 * Provides preview (dry-run) with multiple output formats.
 */

import * as path from 'node:path';
import { Messages, SfProject, Org } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

import { migratePermissionsOperation, type MigrateInput, type MigrateResult } from '../../operations/migrate-operation.js';
import {
  formatMigrationPreview,
  exportMigrationPreview,
  type FormattedMigrationOutput,
} from '../../core/formatters/migration-formatter.js';
import { Spinner, StatusMessage, type ProgressOptions } from '../../core/ui/progress.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@jterrats/profiler', 'profiler.migrate');

export type ProfilerMigrateResult = {
  success: boolean;
  dryRun: boolean;
  profileName: string;
  permissionSetName: string;
  permissionsMigrated: number;
  permissionTypes: string[];
  previewFile?: string;
};

export default class ProfilerMigrate extends SfCommand<ProfilerMigrateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;

  public static readonly flags = {
    'target-org': Flags.string({
      char: 'o',
      summary: messages.getMessage('flags.target-org.summary'),
      description: messages.getMessage('flags.target-org.description'),
      required: false,
    }),
    from: Flags.string({
      char: 'f',
      summary: messages.getMessage('flags.from.summary'),
      description: messages.getMessage('flags.from.description'),
      required: true,
    }),
    section: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.section.summary'),
      description: messages.getMessage('flags.section.description'),
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      description: messages.getMessage('flags.name.description'),
      required: false,
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      description: messages.getMessage('flags.dry-run.description'),
      default: false,
    }),
    format: Flags.string({
      summary: messages.getMessage('flags.format.summary'),
      description: messages.getMessage('flags.format.description'),
      options: ['table', 'json', 'html', 'markdown', 'csv', 'yaml'],
      default: 'table',
    }),
    'output-file': Flags.string({
      summary: messages.getMessage('flags.output-file.summary'),
      description: messages.getMessage('flags.output-file.description'),
    }),
    'create-if-missing': Flags.boolean({
      summary: messages.getMessage('flags.create-if-missing.summary'),
      description: messages.getMessage('flags.create-if-missing.description'),
      default: true,
    }),
    quiet: Flags.boolean({
      summary: 'Disable progress indicators',
      description: 'Suppress spinners and status messages',
      default: false,
    }),
    open: Flags.boolean({
      summary: 'Open HTML output in browser',
      description: 'Automatically open the generated HTML file in the default browser (only works with --format html)',
      default: false,
    }),
  };

  public async run(): Promise<ProfilerMigrateResult> {
    const { flags } = await this.parse(ProfilerMigrate);
    const project = await SfProject.resolve();
    const projectPath = project.getPath();

    const parsed = this.parseFlags(flags);
    const { profileName, permissionTypes, permissionSetName, dryRun, format, outputFile, createIfMissing, quiet, open } =
      parsed;

    const finalPermissionSetName = this.generatePermissionSetName(permissionSetName, profileName);

    const progressOptions: ProgressOptions = { quiet };
    const status = new StatusMessage(progressOptions);

    const org = await this.resolveOrgIfNeeded(dryRun, flags['target-org']);

    this.showPreviewMessage(status, dryRun, profileName, finalPermissionSetName);

    const input: MigrateInput = {
      profileName,
      permissionTypes,
      permissionSetName: finalPermissionSetName,
      projectPath,
      org,
      dryRun,
      createIfMissing,
    };

    const migrationResult = await this.executeMigration(input, progressOptions);

    const formatted = formatMigrationPreview(migrationResult, {
      format,
      includeDetails: true,
    });

    await this.handleOutput(outputFile, migrationResult, formatted, format, status, open);

    if (!dryRun && migrationResult.permissionsMigrated > 0) {
      const permissionSetPath = path.join(
        projectPath,
        'force-app',
        'main',
        'default',
        'permissionsets',
        `${finalPermissionSetName}.permissionset-meta.xml`
      );
      status.success(
        messages.getMessage('info.complete', [migrationResult.permissionsMigrated, permissionSetPath])
      );
    } else if (!dryRun && migrationResult.permissionsMigrated === 0) {
      status.warn('No permissions to migrate - Permission Set XML not generated');
    }

    return {
      success: true,
      dryRun,
      profileName,
      permissionSetName: finalPermissionSetName,
      permissionsMigrated: migrationResult.permissionsMigrated,
      permissionTypes,
      previewFile: outputFile,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  private parseFlags(flags: Record<string, unknown>): {
    profileName: string;
    permissionTypes: Array<
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
      | 'customsettings'
    >;
    permissionSetName: string | undefined;
    dryRun: boolean;
    format: 'table' | 'json' | 'html' | 'markdown' | 'csv' | 'yaml';
    outputFile: string | undefined;
    createIfMissing: boolean;
    quiet: boolean;
    open: boolean;
  } {
    const profileName = String(flags.from ?? '');
    const permissionTypesStr = String(flags.section ?? '');
    const permissionSetName = flags.name ? String(flags.name) : undefined;
    const dryRun = Boolean(flags['dry-run'] ?? false);
    const format = (flags.format ?? 'table') as 'table' | 'json' | 'html' | 'markdown' | 'csv' | 'yaml';
    const outputFile = flags['output-file'] ? String(flags['output-file']) : undefined;
    const createIfMissing = Boolean(flags['create-if-missing'] ?? true);
    const quiet = Boolean(flags.quiet ?? false);
    const open = Boolean(flags.open ?? false);

    // Parse permission types
    const permissionTypes = permissionTypesStr
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0) as Array<
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
      | 'customsettings'
    >;

    // Validate permission types
    const validTypes: Array<
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
      | 'customsettings'
    > = [
      'fls',
      'apex',
      'flows',
      'tabs',
      'recordtype',
      'objectaccess',
      'connectedapps',
      'custompermissions',
      'userpermissions',
      'visualforce',
      'custommetadatatypes',
      'externalcredentials',
      'dataspaces',
      'applications',
      'customsettings',
    ];
    const invalidTypes = permissionTypes.filter((t) => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      throw new Error(`Invalid permission types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`);
    }

    return { profileName, permissionTypes, permissionSetName, dryRun, format, outputFile, createIfMissing, quiet, open };
  }

  // eslint-disable-next-line class-methods-use-this
  private generatePermissionSetName(permissionSetName: string | undefined, profileName: string): string {
    return (
      permissionSetName ??
      `Migrated_From_${profileName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`
    );
  }

  // eslint-disable-next-line class-methods-use-this
  private async resolveOrgIfNeeded(dryRun: boolean, targetOrg: string | undefined): Promise<Org | undefined> {
    if (dryRun) {
      return undefined;
    }

    if (!targetOrg) {
      throw new Error('--target-org is required when not using --dry-run');
    }

    const { Org: OrgClass } = await import('@salesforce/core');
    return OrgClass.create({ aliasOrUsername: targetOrg });
  }

  // eslint-disable-next-line class-methods-use-this
  private showPreviewMessage(
    status: StatusMessage,
    dryRun: boolean,
    profileName: string,
    permissionSetName: string
  ): void {
    if (dryRun) {
      status.info(messages.getMessage('info.starting', [profileName]));
    } else {
      status.info(messages.getMessage('info.migrating', [profileName, permissionSetName]));
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private async executeMigration(input: MigrateInput, progressOptions: ProgressOptions): Promise<MigrateResult> {
    const spinner = new Spinner('Analyzing profile permissions...', progressOptions);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const result = await migratePermissionsOperation(input).run();

    if (result.isFailure()) {
      spinner.fail('Migration failed');
      throw result.error;
    }

    spinner.succeed('Analysis complete');
    return result.value;
  }

  // eslint-disable-next-line class-methods-use-this
  private async handleOutput(
    outputFile: string | undefined,
    migrationResult: MigrateResult,
    formatted: FormattedMigrationOutput,
    format: 'table' | 'json' | 'html' | 'markdown' | 'csv' | 'yaml',
    status: StatusMessage,
    openInBrowser: boolean
  ): Promise<void> {
    if (outputFile) {
      await exportMigrationPreview(migrationResult, outputFile, {
        format,
        includeDetails: true,
      });
      status.success(messages.getMessage('info.preview-generated', [outputFile]));

      // Automatically open HTML file in browser (or if --open flag is used)
      if (format === 'html') {
        await this.openInBrowser(outputFile, status);
      } else if (openInBrowser && format !== 'html') {
        status.warn('--open flag only works with --format html');
      }
    }

    if (!outputFile && formatted) {
      this.log(String(formatted.content));
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private async openInBrowser(filePath: string, status: StatusMessage): Promise<void> {
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      const platform = process.platform;
      let command: string;

      if (platform === 'darwin') {
        // macOS
        command = `open "${filePath}"`;
      } else if (platform === 'win32') {
        // Windows
        command = `start "" "${filePath}"`;
      } else {
        // Linux and other Unix-like systems
        command = `xdg-open "${filePath}"`;
      }

      await execAsync(command);
      status.info(`Opened ${filePath} in browser`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      status.warn(`Failed to open browser: ${err.message}`);
    }
  }
}

