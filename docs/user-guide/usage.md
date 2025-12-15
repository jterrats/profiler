# Profiler Plugin - Usage Guide

## Installation

### Install from local development

```bash
# Clone the repository
git clone <repository-url>
cd profiler

# Install dependencies
yarn install

# Build the plugin
yarn build

# Link the plugin to Salesforce CLI
sf plugins link .
```

### Install from npm (when published)

```bash
sf plugins install @jterrats/profiler
```

## Commands

### `sf profiler retrieve`

Retrieves Profile metadata along with all required dependencies from a Salesforce org.

**🔒 SAFETY GUARANTEE (v2.3.0+)**: This command retrieves metadata to an isolated temporary SFDX project, then copies ONLY profiles to your local project. Your other metadata (ApexClass, CustomObject, Flow, Layout, etc.) is NEVER modified. See [Safety Guarantees](SAFETY.md) for details.

#### Basic Usage

Retrieve ALL profiles without Field Level Security (FLS):

```bash
sf profiler retrieve --target-org myOrg
```

#### Retrieve Specific Profile(s)

Retrieve one or more specific profiles by name:

```bash
# Single profile
sf profiler retrieve --target-org myOrg --name Admin

# Multiple profiles (comma-separated)
sf profiler retrieve --target-org myOrg --name "Admin,Custom Profile,Sales Profile"
```

#### With Field Level Security

Retrieve profiles including Field Level Security permissions:

```bash
# All profiles with FLS
sf profiler retrieve --target-org myOrg --all-fields

# Specific profiles with FLS
sf profiler retrieve --target-org myOrg --name "Admin,Sales" --all-fields
```

#### With Custom API Version

Specify a custom API version for the retrieve operation:

```bash
sf profiler retrieve --target-org myOrg --api-version 60.0
```

#### Exclude Managed Packages

Filter out metadata from managed packages (with namespace prefixes):

```bash
# Retrieve profiles without managed package components
sf profiler retrieve --target-org myOrg --exclude-managed

# Useful when managed packages are uninstalled or inaccessible
sf profiler retrieve --target-org myOrg --name "Admin" --exclude-managed
```

This flag filters out all metadata components with namespace prefixes (e.g., `namespace__ComponentName`), helping avoid errors when profiles reference components from uninstalled or inaccessible managed packages.

#### Incremental Retrieve (Performance Optimization)

**NEW in v2.4.0**: Automatic incremental retrieve for 10x faster operations when no changes exist.

By default, the plugin now uses **incremental retrieve** which compares local metadata with org metadata and only retrieves what has changed:

```bash
# Default behavior - incremental retrieve
sf profiler retrieve --target-org myOrg
# ✨ No changes detected. Profiles are up to date! (~3s vs ~30s)
```

**How it works:**

1. Reads local `force-app/` metadata
2. Lists org metadata via API
3. Compares to find new/changed items
4. If no changes → skips retrieve (10x faster)
5. If changes found → retrieves only changed items
6. On any error → automatically falls back to full retrieve (safe)

**Control incremental behavior:**

```bash
# Force full retrieve (bypass incremental optimization)
sf profiler retrieve --target-org myOrg --force

# Preview what would be retrieved (dry run)
sf profiler retrieve --target-org myOrg --dry-run

# Dry run with specific profile
sf profiler retrieve --target-org myOrg --name Admin --dry-run
```

**When incremental is skipped:**

- `--from-project` flag is used (reads local, not org)
- `--force` flag is used (explicit full retrieve)
- Local metadata cannot be read (auto-fallback to full)
- Comparison fails (auto-fallback to full)

**Performance targets:**

- No changes: ~3s (vs ~30s) = **10x faster** ⚡
- Few changes: ~12s (vs ~30s) = **2.5x faster**
- Many changes: ~30s (same as full retrieve)

#### JSON Output

Get the results in JSON format:

```bash
sf profiler retrieve --target-org myOrg --json
```

#### Quiet Mode

Disable progress indicators for scripting or CI/CD:

```bash
sf profiler retrieve --target-org myOrg --quiet
```

See [Progress Indicators](progress-indicators.md) for detailed information about progress indicators and quiet mode.

### `sf profiler compare`

Compare Profile metadata between your local project and a Salesforce org, or across multiple Salesforce environments.

#### Basic Usage - Local vs. Org

Compare local profiles with their versions in the target org:

```bash
# Compare all profiles
sf profiler compare --target-org myOrg

# Compare specific profile
sf profiler compare --target-org myOrg --name Admin

# Compare multiple profiles
sf profiler compare --target-org myOrg --name "Admin,Sales Profile,Custom"
```

#### Multi-Source Comparison

**NEW in v2.4.0**: Compare the same profiles across multiple Salesforce environments in parallel.

```bash
# Compare Admin profile across 3 environments
sf profiler compare --name Admin --sources "dev,qa,prod"

# Compare multiple profiles across environments
sf profiler compare --name "Admin,Sales Profile" --sources "dev,qa,uat,prod"

# Compare all profiles across environments
sf profiler compare --sources "dev,qa,prod"
```

**Key Features:**

- **Parallel Retrieval**: Fetches profiles from all orgs concurrently for maximum speed
- **Graceful Degradation**: Continues with successful orgs if some fail
- **Comparison Matrix**: Shows differences across all environments side-by-side

**Requirements:**

- All org aliases must be pre-authenticated using `sf org login`
- Minimum 2 org aliases required
- Flag `--sources` is mutually exclusive with `--target-org`

#### Exclude Managed Packages

Filter out metadata from managed packages during comparison:

```bash
sf profiler compare --target-org myOrg --name Admin --exclude-managed
```

#### Custom API Version

Specify a custom API version for the comparison:

```bash
sf profiler compare --target-org myOrg --api-version 60.0
```

#### Quiet Mode

Disable progress indicators for scripting or CI/CD:

```bash
sf profiler compare --name Admin --target-org myOrg --quiet
```

See [Progress Indicators](progress-indicators.md) for detailed information about progress indicators and quiet mode.

#### Comparison Modes

**Local vs. Org (Single-Source)**:

- Compares your local profile files with their versions in a single org
- Shows additions, deletions, and changes
- Useful for validating changes before deployment

**Multi-Source Comparison**:

- Compares the same profiles across multiple environments
- Identifies configuration drift between environments
- Helps ensure consistency across dev/qa/uat/prod

#### Example Workflows

**Pre-deployment Validation:**

```bash
# Verify local changes before deploying to QA
sf profiler compare --target-org qa --name "Admin,Sales"

# If no differences, safe to deploy
sf project deploy start --target-org qa
```

**Environment Consistency Check:**

```bash
# Check if Admin profile is consistent across all environments
sf profiler compare --name Admin --sources "dev,qa,uat,prod"

# Review differences and sync environments as needed
```

**Change Detection:**

```bash
# Compare all profiles to detect recent org changes
sf profiler compare --target-org myOrg

# Retrieve any profiles with differences
sf profiler retrieve --target-org myOrg --name "ProfileWithChanges"
```

## What Gets Retrieved

The plugin automatically retrieves the following metadata types along with profiles:

1. **ApexClass** - All Apex classes in the org
2. **ApexPage** - Visualforce pages
3. **ConnectedApp** - Connected applications
4. **CustomApplication** - Custom applications
5. **CustomObject** - All custom and standard objects (includes RecordTypes)
6. **CustomPermission** - Custom permissions
7. **CustomTab** - Custom tabs
8. **Flow** - Flows and Process Builder processes
9. **Layout** - Page layouts
10. **Profile** - All profiles

## Field Level Security (FLS)

By default, the plugin retrieves profiles **without** Field Level Security settings to keep the metadata clean and manageable.

- **Without `--all-fields`**: Profile metadata is retrieved without FLS, making it easier to manage and deploy.
- **With `--all-fields`**: Complete profile metadata including all field-level permissions for every field on every object.

## How It Works

1. **Connects to the target org** using the provided org alias or username
2. **Lists all metadata** for each supported metadata type using the Metadata API
3. **Generates a package.xml** file with all discovered components
4. **Retrieves the metadata** using the Source API
5. **Processes the profiles** to remove FLS if `--all-fields` is not specified
6. **Cleans up temporary files** after the operation completes

## Requirements

- Salesforce CLI (`sf`) must be installed
- You must be in a Salesforce project directory (with `sfdx-project.json`)
- You must have authenticated to the target org

## Troubleshooting

### "This command is required to run within a Salesforce project"

Make sure you're running the command from within a directory that contains a `sfdx-project.json` file.

### "No default org found"

You need to specify the `--target-org` flag with a valid org alias or username.

### Permission Errors

Ensure your authenticated user has the necessary permissions to retrieve metadata from the org:

- View All Data
- Modify All Data (for some metadata types)

## Examples

### Complete Profile Retrieval Workflow

```bash
# Authenticate to your org
sf org login web --alias myOrg

# Create or navigate to your Salesforce project
cd my-salesforce-project

# Retrieve profiles with all dependencies (no FLS)
sf profiler retrieve --target-org myOrg

# Check the retrieved profiles
ls -la force-app/main/default/profiles/
```

### Retrieve with FLS for Deployment

```bash
# Retrieve profiles with Field Level Security
sf profiler retrieve --target-org myOrg --all-fields

# Deploy to another org
sf project deploy start --target-org targetOrg
```

## Progress Indicators

The plugin provides visual feedback during operations through progress indicators (spinners, progress bars, and status messages). Use the `--quiet` flag to disable them for scripting.

**See [Progress Indicators Guide](progress-indicators.md) for complete documentation.**

## Best Practices

1. **Use `--all-fields` sparingly**: Only include FLS when you specifically need to manage field-level permissions. This keeps your profile files smaller and easier to manage.

2. **Review changes before committing**: Always review the retrieved profiles before committing them to version control. Profiles can contain sensitive information or unwanted changes.

3. **Use with version control**: The plugin works best when combined with Git to track changes to profile metadata over time.

4. **Test in sandbox first**: Always test the retrieve operation in a sandbox environment before using it with production orgs.

## Author

Jaime Terrats

## License

MIT
