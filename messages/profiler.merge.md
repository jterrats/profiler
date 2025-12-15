# summary

Merge changes from a Salesforce org into a local Profile metadata file.

# description

The profiler merge command merges changes from a Salesforce org into your local Profile metadata file. It detects conflicts between local and org versions and resolves them according to the specified merge strategy. Use --dry-run to preview changes before applying them.

# flags.target-org.summary

The target org to merge changes from.

# flags.target-org.description

Specify the alias or username of the Salesforce org to merge changes from. The command will retrieve the profile from this org and merge it with your local version.

# flags.name.summary

The name of the profile to merge.

# flags.name.description

Specify the name of the profile to merge (without the .profile-meta.xml extension). Only one profile can be merged at a time. Example: "Admin", "Standard User".

# flags.strategy.summary

Merge strategy to use for resolving conflicts.

# flags.strategy.description

Specify how to resolve conflicts between local and org versions:

- **local-wins**: Keep local values for conflicts, add new elements from org (dev-friendly, default)
- **org-wins**: Keep org values for conflicts, preserve local-only elements (production-friendly)
- **union**: Combine all permissions (additive merge, never removes permissions)
- **local**: Keep entire local version, discard all org changes
- **org**: Use entire org version, discard all local changes
- **interactive**: Prompt user to select which changes to apply (requires TTY)
- **abort-on-conflict**: Fail if any conflicts are detected (safe mode)

# flags.api-version.summary

Override the API version used for metadata operations.

# flags.api-version.description

Specify the API version to use for retrieving the profile from the org. Defaults to the org's API version.

# flags.dry-run.summary

Preview changes without applying them.

# flags.dry-run.description

When enabled, shows what changes would be made without actually modifying the local profile file. Useful for reviewing merge results before applying them.

# flags.skip-backup.summary

Skip creating a backup of the local profile before merging.

# flags.skip-backup.description

By default, a backup file (.backup) is created before merging. Use this flag to skip backup creation. Not recommended unless you're certain about the merge result.

# flags.quiet.summary

Disable progress indicators and status messages.

# flags.quiet.description

When enabled, suppresses spinners, progress bars, and status messages. Useful for scripting and CI/CD environments where minimal output is desired.

# examples

- Merge a profile using default strategy (local-wins):

  <%= config.bin %> <%= command.id %> --target-org myOrg --name Admin

- Merge a profile with org-wins strategy:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name Admin --strategy org-wins

- Preview merge changes without applying:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name Admin --dry-run

- Merge with union strategy (additive):

  <%= config.bin %> <%= command.id %> --target-org myOrg --name Admin --strategy union

- Merge and fail if conflicts detected:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name Admin --strategy abort-on-conflict

- Interactive merge (select changes to apply):

  <%= config.bin %> <%= command.id %> --target-org myOrg --name Admin --strategy interactive

- Merge without creating backup:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name Admin --skip-backup

# info.starting

Starting merge for profile: %s

# info.retrieving-org-profile

Retrieving profile from org: %s

# info.detecting-conflicts

Detecting conflicts between local and org versions...

# info.conflicts-detected

Detected %s conflict(s)

# info.no-conflicts

No conflicts detected. Profiles are identical.

# info.merging

Merging profiles using strategy: %s

# info.dry-run-mode

DRY RUN MODE - No changes will be applied

# info.backup-created

Backup created: %s

# info.merge-complete

Merge complete

# info.preview-changes

Preview of changes that would be applied:

# error.profile-not-found-local

Profile "%s" not found in local project.

# error.profile-not-found-org

Profile "%s" not found in org '%s'.

# error.org-auth-failed

Failed to authenticate to org '%s': %s

# error.merge-failed

Merge failed: %s

# error.conflicts-detected

Cannot merge: %s conflict(s) detected. Use --strategy to resolve or --strategy abort-on-conflict to fail on conflicts.

# error.no-changes

No changes to merge. Profiles are identical.

# error.backup-failed

Failed to create backup: %s
