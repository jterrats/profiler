# summary

Validate Profile metadata for common issues and errors.

# description

The profiler validate command checks Profile metadata files for common issues including XML structure validity, duplicate entries, invalid permissions, and missing metadata references. Use --target-org to validate that referenced metadata exists in your Salesforce org.

# flags.name.summary

The name of a specific profile or comma-separated list of profiles to validate.

# flags.name.description

When specified, only validates the named profile(s) instead of all profiles. You can specify a single profile or multiple profiles separated by commas. Profile names should match exactly (e.g., "Admin", "Standard User", "Admin,Custom Profile,Sales").

# flags.target-org.summary

The target org to validate metadata references against.

# flags.target-org.description

When specified, validates that all metadata referenced in the profile (Apex Classes, Custom Objects, etc.) actually exists in the target org. Without this flag, only local validation is performed (XML structure, duplicates, etc.).

# flags.api-version.summary

Override the API version used for metadata operations.

# flags.api-version.description

Specify the API version to use for org metadata validation. Defaults to the org's API version.

# flags.strict.summary

Treat warnings as errors.

# flags.strict.description

When enabled, any validation warnings (such as missing metadata references) are treated as errors, causing the command to exit with code 1. Useful for CI/CD pipelines where you want to fail on any issues.

# flags.quiet.summary

Disable progress indicators and status messages.

# flags.quiet.description

When enabled, suppresses spinners, progress bars, and status messages. Useful for scripting and CI/CD environments where minimal output is desired.

# examples

- Validate a specific profile:

  <%= config.bin %> <%= command.id %> --name Admin

- Validate multiple profiles:

  <%= config.bin %> <%= command.id %> --name "Admin,Standard User"

- Validate with org reference check:

  <%= config.bin %> <%= command.id %> --name Admin --target-org myOrg

- Validate in strict mode (warnings = errors):

  <%= config.bin %> <%= command.id %> --name Admin --target-org myOrg --strict

- Validate and output JSON:

  <%= config.bin %> <%= command.id %> --name Admin --target-org myOrg --json

- Validate all profiles in project:

  <%= config.bin %> <%= command.id %>

# info.starting

Starting validation for profile: %s

# info.starting-multiple

Starting validation for %s profiles

# info.validating-with-org

Validating against org: %s

# info.validation-complete

Validation complete

# info.profile-valid

Profile "%s" is valid

# info.profile-invalid

Profile "%s" has validation issues

# info.issues-found

Found %s issue(s): %s error(s), %s warning(s)

# warn.missing-reference

Missing metadata reference: %s (%s)

# warn.managed-package

Managed package component: %s (%s) - may not be available in all orgs

# error.duplicate-entry

Duplicate entry found: %s

# error.invalid-permission

Invalid permission: %s - %s

# error.xml-error

XML parsing error: %s

# error.validation-failed

Validation failed: %s

# error.profile-not-found

Profile "%s" not found in project

# error.profiles-not-found

None of the specified profiles were found in project

# error.org-required-for-reference-check

Target org required for metadata reference validation. Use --target-org flag.
