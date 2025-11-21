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
sf plugins install profiler
```

## Commands

### `sf profiler retrieve`

Retrieves Profile metadata along with all required dependencies from a Salesforce org.

#### Basic Usage

Retrieve profiles without Field Level Security (FLS):

```bash
sf profiler retrieve --target-org myOrg
```

#### With Field Level Security

Retrieve profiles including Field Level Security permissions:

```bash
sf profiler retrieve --target-org myOrg --all-fields
```

#### With Custom API Version

Specify a custom API version for the retrieve operation:

```bash
sf profiler retrieve --target-org myOrg --api-version 60.0
```

#### JSON Output

Get the results in JSON format:

```bash
sf profiler retrieve --target-org myOrg --json
```

## What Gets Retrieved

The plugin automatically retrieves the following metadata types along with profiles:

1. **ApexClass** - All Apex classes in the org
2. **CustomApplication** - Custom applications
3. **CustomObject** - All custom and standard objects
4. **CustomPermission** - Custom permissions
5. **CustomTab** - Custom tabs
6. **Flow** - Flows and Process Builder processes
7. **Layout** - Page layouts
8. **Profile** - All profiles

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

## Best Practices

1. **Use `--all-fields` sparingly**: Only include FLS when you specifically need to manage field-level permissions. This keeps your profile files smaller and easier to manage.

2. **Review changes before committing**: Always review the retrieved profiles before committing them to version control. Profiles can contain sensitive information or unwanted changes.

3. **Use with version control**: The plugin works best when combined with Git to track changes to profile metadata over time.

4. **Test in sandbox first**: Always test the retrieve operation in a sandbox environment before using it with production orgs.

## Author

Jaime Terrats

## License

BSD-3-Clause

