# summary

Compare local Profile metadata with the version in Salesforce org.

# description

The profiler compare command compares a local profile file with its version in the target org, showing the differences line by line. This is useful for identifying what has changed between your local version and the org version before committing or deploying changes.

# flags.target-org.summary

The target org to compare profiles against.

# flags.name.summary

The name of a specific profile or comma-separated list of profiles to compare.

# flags.name.description

Specify one or more profile names (without the .profile-meta.xml extension). You can provide a single profile or multiple profiles separated by commas. If not provided, all local profiles will be compared. Examples: "Admin", "Admin,Sales Profile,Custom".

# flags.api-version.summary

Override the API version used for metadata operations.

# flags.api-version.description

Specify the API version to use for the comparison. Defaults to the org's API version.

# flags.exclude-managed.summary

Exclude metadata from managed packages (with namespace prefixes).

# flags.exclude-managed.description

When enabled, filters out all metadata components that belong to managed packages (identified by namespace prefixes like "namespace\_\_ComponentName"). This helps avoid errors when comparing profiles that reference components from uninstalled or inaccessible managed packages.

# flags.sources.summary

Compare profiles across multiple Salesforce environments (comma-separated org aliases).

# flags.sources.description

Enables multi-source comparison by specifying a comma-separated list of org aliases. Instead of comparing local vs. org, this compares the same profile across multiple environments. Example: "dev,qa,uat,prod". Requires authenticated orgs. Retrieves profiles in parallel for performance.

# flags.output-file.summary

Export comparison results to a file.

# flags.output-file.description

Specify a file path to export the comparison matrix results. The output format is determined by the --output-format flag. Example: "./comparison-report.html". Useful for documentation, reports, or sharing results with team members.

# flags.output-format.summary

Output format for comparison results (table, json, html).

# flags.output-format.description

Choose the output format for displaying or exporting comparison matrices. Options: "table" (ASCII table for terminal), "json" (machine-readable structured data), "html" (web-friendly formatted output with styling). Default is "table" for terminal display. Use "json" for automation or "html" for reports.

# flags.quiet.summary

Disable progress indicators and status messages.

# flags.quiet.description

When enabled, suppresses spinners, progress bars, and status messages. Useful for scripting and CI/CD environments where minimal output is desired.

# examples

- Compare a specific profile:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name "Admin"

- Compare all profiles:

  <%= config.bin %> <%= command.id %> --target-org myOrg

- Compare with specific API version:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name "Sales" --api-version 60.0

- Compare excluding managed package metadata:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name "Admin" --exclude-managed

- Compare profiles across multiple environments:

  <%= config.bin %> <%= command.id %> --name "Admin" --sources "dev,qa,prod"

- Multi-source comparison with multiple profiles:

  <%= config.bin %> <%= command.id %> --name "Admin,Sales Profile" --sources "dev,qa,uat,prod"

- Export comparison matrix to HTML file:

  <%= config.bin %> <%= command.id %> --name "Admin" --sources "dev,qa,prod" --output-format html --output-file "./comparison-report.html"

- Get comparison results as JSON:

  <%= config.bin %> <%= command.id %> --name "Admin" --sources "dev,qa,prod" --output-format json

# info.starting

Starting profile comparison for org: %s

# info.comparing-profile

Comparing profile: %s

# info.retrieving-org-version

Retrieving profile from org...

# info.no-differences

✓ No differences found for profile: %s

# info.differences-found

✗ Differences found for profile: %s

# info.total-profiles-compared

Total profiles compared: %s

# info.profiles-with-differences

Profiles with differences: %s

# info.multi-source-mode

🌍 Multi-source comparison mode enabled (%s environments)

# info.retrieving-from-source

Retrieving from %s...

# info.line-added

- Added (in org, not in local):

# info.line-removed

- Removed (in local, not in org):

# info.line-changed

~ Changed:

# success.comparison-complete

Profile comparison completed successfully!

# error.profile-not-found-locally

Profile not found locally: %s
Check that the profile exists in force-app/main/default/profiles/

# error.profile-not-found-org

Profile not found in org: %s

# error.retrieve-failed

Failed to retrieve profile from org: %s

# error.comparison-failed

Comparison failed: %s

# error.no-profiles-found

No profiles found in the project.
Make sure you have profiles in force-app/main/default/profiles/

# warning.temp-dir-cleanup

Could not clean up temporary comparison directory
