/*
 * Copyright (c) 2024, Jorge Terrats
 * All rights reserved.
 * Licensed under the MIT License.
 * For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Messages, SfError, SfProject, AuthInfo, Connection, Org, StateAggregator } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

import { validateProfileOperation, type ValidateInput, type ValidationResult } from '../../operations/index.js';
import { Spinner, StatusMessage, type ProgressOptions } from '../../core/ui/progress.js';
import type { Result } from '../../core/monad/index.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@jterrats/profiler', 'profiler.validate');

export type ProfilerValidateResult = {
  success: boolean;
  profilesValidated: number;
  profilesValid: number;
  profilesInvalid: number;
  totalIssues: number;
  totalErrors: number;
  totalWarnings: number;
  results: Array<{
    profileName: string;
    valid: boolean;
    issues: Array<{
      type: string;
      severity: string;
      element: string;
      message: string;
      suggestion?: string;
    }>;
  }>;
};

export default class ProfilerValidate extends SfCommand<ProfilerValidateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  public static readonly flags = {
    'target-org': Flags.string({
      char: 'o',
      summary: messages.getMessage('flags.target-org.summary'),
      description: messages.getMessage('flags.target-org.description'),
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
    strict: Flags.boolean({
      summary: messages.getMessage('flags.strict.summary'),
      description: messages.getMessage('flags.strict.description'),
      default: false,
    }),
    quiet: Flags.boolean({
      summary: messages.getMessage('flags.quiet.summary'),
      description: messages.getMessage('flags.quiet.description'),
      default: false,
    }),
  };

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
  public async run(): Promise<ProfilerValidateResult> {
    const { flags } = await this.parse(ProfilerValidate);
    const profileName = flags.name;
    const strictMode = flags.strict ?? false;
    const quiet = flags.quiet ?? false;
    const apiVersion = flags['api-version'];

    const progressOptions: ProgressOptions = { quiet };
    const status = new StatusMessage(progressOptions);

    const project = await SfProject.resolve();
    const projectPath = project.getPath();

    // Resolve org if provided
    let org: Org | undefined;
    if (flags['target-org']) {
      org = await this.resolveOrg(flags['target-org']);
    }

    const profileNames = this.getProfilesToValidate(profileName);
    const resolvedApiVersion = apiVersion ?? (org ? await org.retrieveMaxApiVersion() : undefined);

    const spinner = new Spinner(
      profileNames.length === 1
        ? `Validating profile '${profileNames[0]}'...`
        : `Validating ${profileNames.length} profiles...`,
      progressOptions
    );
    const startTime = Date.now();

    if (org && !quiet) {
      status.info(`Validating against org: ${org.getUsername() ?? org.getOrgId()}`);
    }

    const validationResults = await this.executeValidations(
      profileNames,
      projectPath,
      org,
      resolvedApiVersion,
      spinner
    );
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const { results, stats } = this.processValidationResults(
      validationResults,
      strictMode,
      spinner,
      elapsed,
      profileNames.length,
      quiet
    );

    const success = stats.profilesInvalid === 0;
    const finalResult: ProfilerValidateResult = {
      success,
      profilesValidated: profileNames.length,
      profilesValid: stats.profilesValid,
      profilesInvalid: stats.profilesInvalid,
      totalIssues: stats.totalIssues,
      totalErrors: stats.totalErrors,
      totalWarnings: stats.totalWarnings,
      results,
    };

    if (!success || (strictMode && stats.totalWarnings > 0)) {
      process.exitCode = 1;
    }

    return finalResult;
  }

  // eslint-disable-next-line class-methods-use-this
  private getProfilesToValidate(profileName?: string): string[] {
    const profileNames = profileName
      ? profileName
          .split(',')
          .map((name: string) => name.trim())
          .filter((name: string) => name.length > 0)
      : undefined;

    if (!profileNames || profileNames.length === 0) {
      throw new SfError(messages.getMessage('error.profile-not-found', ['<none specified>']));
    }

    return profileNames;
  }

  // eslint-disable-next-line class-methods-use-this
  private async resolveOrg(targetOrg: string): Promise<Org> {
    try {
      const aliases = await StateAggregator.getInstance();
      const username = aliases.aliases.getUsername(targetOrg) ?? targetOrg;
      const authInfo = await AuthInfo.create({ username });
      const connection = await Connection.create({ authInfo });
      return await Org.create({ connection });
    } catch (error) {
      throw new SfError(
        `Failed to authenticate to org '${targetOrg}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private async executeValidations(
    profileNames: string[],
    projectPath: string,
    org: Org | undefined,
    apiVersion: string | undefined,
    spinner: Spinner
  ): Promise<
    Array<{
      name: string;
      result: Result<ValidationResult>;
    }>
  > {
    const validationPromises = profileNames.map(async (name, index) => {
      if (profileNames.length > 1) {
        spinner.updateText(`Validating ${index + 1}/${profileNames.length}: ${name}...`);
      }
      const validateInput: ValidateInput = {
        profileName: name,
        projectPath,
        org,
        apiVersion,
      };
      const result = await validateProfileOperation(validateInput).run();
      return { name, result };
    });

    return Promise.all(validationPromises);
  }

  private processValidationResults(
    validationResults: Array<{
      name: string;
      result: Result<ValidationResult>;
    }>,
    strictMode: boolean,
    spinner: Spinner,
    elapsed: string,
    totalProfiles: number,
    quiet: boolean
  ): {
    results: Array<{ profileName: string; valid: boolean; issues: ValidationResult['issues'] }>;
    stats: {
      profilesValid: number;
      profilesInvalid: number;
      totalIssues: number;
      totalErrors: number;
      totalWarnings: number;
    };
  } {
    const status = new StatusMessage({ quiet });
    let profilesValid = 0;
    let profilesInvalid = 0;
    let totalIssues = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    const results = validationResults.map(({ name, result }) => {
      if (result.isFailure()) {
        const error = result.error;
        if (!error) {
          throw new SfError(`Validation failed for profile '${name}' but no error details available`);
        }
        const failureIssues: ValidationResult['issues'] = [
          {
            type: 'xml-error',
            severity: 'error',
            element: 'Profile',
            message: error.message,
            suggestion: 'Check that the profile file exists and is valid XML',
          },
        ];
        profilesInvalid++;
        totalIssues += failureIssues.length;
        totalErrors += failureIssues.length;
        this.log(messages.getMessage('info.profile-invalid', [name]));
        return { profileName: name, valid: false, issues: failureIssues };
      }

      const validationResult = result.value;
      if (!validationResult) {
        throw new SfError(`Validation succeeded for profile '${name}' but no result available`);
      }
      const issues = validationResult.issues;
      const errors = issues.filter((i) => i.severity === 'error').length;
      const warnings = issues.filter((i) => i.severity === 'warning').length;
      const isValid = strictMode ? validationResult.valid && warnings === 0 : validationResult.valid;

      if (isValid) {
        this.log(messages.getMessage('info.profile-valid', [name]));
        profilesValid++;
      } else {
        this.log(messages.getMessage('info.profile-invalid', [name]));
        this.log(
          messages.getMessage('info.issues-found', [issues.length.toString(), errors.toString(), warnings.toString()])
        );
        profilesInvalid++;
      }

      totalIssues += issues.length;
      totalErrors += strictMode ? errors + warnings : errors;
      totalWarnings += warnings;

      // Display issues
      for (const issue of issues) {
        const severity = strictMode && issue.severity === 'warning' ? 'error' : issue.severity;
        if (severity === 'error') {
          this.log(`  ❌ ${issue.element}: ${issue.message}`);
          if (issue.suggestion) {
            this.log(`     💡 ${issue.suggestion}`);
          }
        } else {
          this.log(`  ⚠️  ${issue.element}: ${issue.message}`);
          if (issue.suggestion) {
            this.log(`     💡 ${issue.suggestion}`);
          }
        }
      }

      return { profileName: name, valid: isValid, issues };
    });

    if (profilesValid === totalProfiles) {
      spinner.succeed(`All ${profilesValid} profile(s) valid (${elapsed}s)`);
      status.success(`Validation complete: ${profilesValid} profile(s) valid, ${totalIssues} issue(s) found`);
    } else {
      spinner.fail(`${profilesInvalid} profile(s) invalid (${elapsed}s)`);
      status.error(
        `Validation failed: ${profilesInvalid} profile(s) invalid, ${totalErrors} error(s), ${totalWarnings} warning(s)`
      );
    }

    if (!quiet) {
      this.log(messages.getMessage('info.validation-complete'));
    }

    return {
      results,
      stats: { profilesValid, profilesInvalid, totalIssues, totalErrors, totalWarnings },
    };
  }
}
