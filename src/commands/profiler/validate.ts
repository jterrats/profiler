/*
 * Copyright (c) 2024, Jorge Terrats
 * All rights reserved.
 * Licensed under the MIT License.
 * For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Messages, SfError, SfProject, AuthInfo, Connection, Org, StateAggregator } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

import { validateProfileOperation, type ValidateInput, type ValidationResult } from '../../operations/index.js';

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
  };

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
  public async run(): Promise<ProfilerValidateResult> {
    const { flags } = await this.parse(ProfilerValidate);
    const profileName = flags.name;
    const strictMode = flags.strict ?? false;
    const apiVersion = flags['api-version'];

    const project = await SfProject.resolve();
    const projectPath = project.getPath();

    // Resolve org if provided
    let org: Org | undefined;
    if (flags['target-org']) {
      try {
        const aliases = await StateAggregator.getInstance();
        const username = aliases.aliases.getUsername(flags['target-org']) ?? flags['target-org'];
        const authInfo = await AuthInfo.create({ username });
        const connection = await Connection.create({ authInfo });
        org = await Org.create({ connection });
      } catch (error) {
        throw new SfError(
          `Failed to authenticate to org '${flags['target-org']}': ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const profileNames = profileName
      ? profileName
          .split(',')
          .map((name: string) => name.trim())
          .filter((name: string) => name.length > 0)
      : undefined;

    if (!profileNames || profileNames.length === 0) {
      throw new SfError(messages.getMessage('error.profile-not-found', ['<none specified>']));
    }

    const resolvedApiVersion = apiVersion ?? (org ? await org.retrieveMaxApiVersion() : undefined);

    if (profileNames.length === 1) {
      this.log(messages.getMessage('info.starting', [profileNames[0]]));
    } else {
      this.log(messages.getMessage('info.starting-multiple', [profileNames.length.toString()]));
    }

    if (org) {
      this.log(messages.getMessage('info.validating-with-org', [org.getUsername() ?? org.getOrgId()]));
    }

    const validationPromises = profileNames.map(async (name) => {
      const validateInput: ValidateInput = {
        profileName: name,
        projectPath,
        org,
        apiVersion: resolvedApiVersion,
      };
      const result = await validateProfileOperation(validateInput).run();
      return { name, result };
    });

    const validationResults = await Promise.all(validationPromises);

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

    this.log(messages.getMessage('info.validation-complete'));

    const success = profilesInvalid === 0;
    const finalResult: ProfilerValidateResult = {
      success,
      profilesValidated: profileNames.length,
      profilesValid,
      profilesInvalid,
      totalIssues,
      totalErrors,
      totalWarnings,
      results,
    };

    if (!success || (strictMode && totalWarnings > 0)) {
      process.exitCode = 1;
    }

    return finalResult;
  }
}
