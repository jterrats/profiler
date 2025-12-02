# Profiler Plugin - Features

## Overview

The Profiler plugin streamlines the process of retrieving Salesforce Profile metadata along with all its dependencies. This plugin is based on the original shell script but provides a more robust, integrated, and user-friendly experience within the Salesforce CLI ecosystem.

## Key Features

### 1. Complete Dependency Retrieval

The plugin automatically identifies and retrieves all metadata types that profiles depend on:

- **Apex Classes**: All class permissions referenced in profiles
- **Apex Pages**: Visualforce page permissions
- **Connected Apps**: Connected application settings
- **Custom Applications**: Application visibility settings
- **Custom Objects**: Object-level permissions (includes RecordTypes)
- **Custom Permissions**: Custom permission assignments
- **Custom Tabs**: Tab visibility settings
- **Flows**: Flow access permissions
- **Layouts**: Page layout assignments
- **Profiles**: The profile metadata itself

### 2. Field Level Security (FLS) Management

#### Default Behavior (Without `--all-fields`)
- Retrieves profile metadata **without** Field Level Security settings
- Results in cleaner, more manageable profile files
- Reduces merge conflicts in version control
- Faster deployment times

#### With `--all-fields` Flag
- Includes complete Field Level Security for all fields
- Useful when you need to audit or manage field permissions
- Required for complete profile deployment with FLS

### 3. Managed Package Filtering

#### With `--exclude-managed` Flag
- Filters out all metadata components from managed packages
- Identifies components by namespace prefixes (e.g., `namespace__ComponentName`)
- Helps avoid errors when managed packages are uninstalled or inaccessible
- Makes profile files cleaner by removing external dependencies
- Custom objects ending in `__c` are always included even with this flag

**Use Cases:**
- Retrieving profiles when managed packages are not installed in target org
- Cleaning up profiles before version control commits
- Generating documentation without third-party package clutter
- Comparing profiles across orgs with different managed packages

### 4. Smart Metadata Restoration

Similar to the original script, the plugin includes smart restoration features:

- Cleans untracked files in the force-app directory
- Restores original versions of non-profile metadata from Git
- Keeps your repository clean and focused on profile changes
- Prevents accidental overwrites of existing metadata

### 4. API Version Flexibility

- Automatically uses the org's maximum API version
- Allows manual override with `--api-version` flag
- Ensures compatibility across different org versions

### 5. Project-Aware

- Requires execution within a Salesforce project
- Validates project structure before execution
- Works seamlessly with `sfdx-project.json` configuration

### 6. Comprehensive Error Handling

- Clear error messages for common issues
- Graceful handling of missing metadata
- Warnings for non-critical operations
- Detailed logging throughout the process

### 7. JSON Output Support

- Native support for `--json` flag
- Structured output for automation and CI/CD pipelines
- Includes detailed result information:
  - Success status
  - Number of components retrieved
  - Number of profiles retrieved
  - List of metadata types processed

## Comparison with Original Shell Script

| Feature | Shell Script | Plugin |
|---------|-------------|--------|
| Profile Retrieval | ✅ | ✅ |
| Dependency Resolution | ✅ | ✅ |
| FLS Control | ❌ | ✅ |
| API Version Override | ❌ | ✅ |
| JSON Output | ❌ | ✅ |
| Error Handling | Basic | Advanced |
| Cross-Platform | Unix only | All platforms |
| Integration with SF CLI | External | Native |
| Type Safety | ❌ | ✅ (TypeScript) |
| Test Coverage | ❌ | ✅ |

## Advantages Over Shell Script

### 1. Cross-Platform Compatibility
- Works on Windows, macOS, and Linux
- No need for bash or Unix tools
- Consistent behavior across all platforms

### 2. Better Integration
- Native Salesforce CLI command
- Uses official Salesforce APIs and libraries
- Follows CLI conventions and patterns

### 3. Enhanced Maintainability
- Written in TypeScript with type safety
- Comprehensive test coverage
- Easier to extend and modify
- Better error handling

### 4. Improved User Experience
- Clear progress indicators
- Structured output options
- Better error messages
- Built-in help documentation

### 5. Version Control Friendly
- Automated cleanup of temporary files
- Smart restoration of unchanged metadata
- Reduced noise in git diffs

## Use Cases

### 1. Profile Development
```bash
# Retrieve profiles for local development
sf profiler retrieve --target-org dev-sandbox
```

### 2. Profile Migration
```bash
# Retrieve from source org
sf profiler retrieve --target-org source-org --all-fields

# Deploy to target org
sf project deploy start --target-org target-org
```

### 3. Security Audit
```bash
# Retrieve complete profiles including FLS
sf profiler retrieve --target-org prod --all-fields

# Review field permissions
git diff
```

### 4. CI/CD Integration
```bash
# Automated profile retrieval in pipeline
sf profiler retrieve --target-org qa-org --json > profile-results.json
```

### 5. Profile Cleanup
```bash
# Retrieve clean profiles without FLS
sf profiler retrieve --target-org dev-org

# Review and commit only meaningful changes
git add force-app/main/default/profiles/
git commit -m "Update profile permissions"
```

## Technical Architecture

### Components

1. **Command Layer** (`retrieve.ts`)
   - Handles command parsing and validation
   - Manages command execution flow
   - Provides user feedback

2. **Metadata API Integration**
   - Lists all metadata components
   - Generates comprehensive package.xml
   - Retrieves metadata using Source API

3. **Post-Processing**
   - Removes FLS when not needed
   - Restores original metadata from Git
   - Cleans up temporary files

4. **Error Handling**
   - Validates prerequisites
   - Handles API failures gracefully
   - Provides actionable error messages

### Dependencies

- `@salesforce/core`: Core Salesforce functionality
- `@salesforce/sf-plugins-core`: Plugin framework
- `@oclif/core`: CLI framework
- Node.js built-in modules for file operations

## Future Enhancements

Potential features for future versions:

1. **Selective Metadata Types**
   - Allow users to choose which metadata types to include
   - Example: `--include ApexClass,CustomObject`

2. **Profile Filtering**
   - Retrieve only specific profiles
   - Example: `--profiles "Admin,Sales*"`

3. **Diff Comparison**
   - Compare profiles between orgs
   - Highlight differences in permissions

4. **Permission Analysis**
   - Generate reports on profile permissions
   - Identify security gaps or over-permissions

5. **Backup and Restore**
   - Create backups before retrieval
   - Restore previous versions if needed

6. **Interactive Mode**
   - Prompt user for metadata types
   - Guide through retrieval process

## Performance Considerations

- **Parallel Processing**: Metadata types are listed sequentially but could be parallelized
- **Caching**: Package.xml generation could be cached for repeated operations
- **Incremental Retrieval**: Currently retrieves all metadata; could support incremental updates
- **Memory Management**: Uses streaming for large file operations

## Security Considerations

- Requires proper org authentication
- Respects user's metadata API access permissions
- Does not store credentials
- All operations use official Salesforce APIs
- Temporary files are automatically cleaned up

## Support and Maintenance

- Regular updates for new API versions
- Bug fixes and improvements
- Community contributions welcome
- Comprehensive test coverage ensures stability

