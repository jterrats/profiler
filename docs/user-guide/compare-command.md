# Profiler Compare Command - Documentation

## Overview

The `sf profiler compare` command compares local Profile metadata files with their versions in a Salesforce org, showing line-by-line differences. This is useful for:

- Identifying changes before committing to version control
- Understanding what has drifted between local and org versions
- Validating profile changes before deployment
- Auditing profile modifications

## Usage

```bash
sf profiler compare --target-org <org-alias> [--name <profile-name>] [--api-version <version>]
```

## Flags

| Flag | Alias | Required | Description |
|------|-------|----------|-------------|
| `--target-org` | | Yes | The target org to compare profiles against |
| `--name` | `-n` | No | The name of a specific profile to compare (without .profile-meta.xml) |
| `--exclude-managed` | | No | Exclude metadata from managed packages (with namespace prefixes) |
| `--api-version` | | No | Override the API version used for metadata operations |
| `--json` | | No | Format output as JSON |

## Examples

### Compare a Specific Profile

Compare the "Admin" profile between local and org:

```bash
sf profiler compare --target-org production --name "Admin"
```

### Compare All Profiles

Compare all profiles in your project:

```bash
sf profiler compare --target-org dev-sandbox
```

### Compare with Specific API Version

```bash
sf profiler compare --target-org integration --name "Sales" --api-version 60.0
```

### Exclude Managed Packages

Compare profiles while excluding managed package components:

```bash
sf profiler compare --target-org production --name "Admin" --exclude-managed
```

This is useful when comparing profiles that reference managed package components that may not be installed or accessible.

### JSON Output for Automation

```bash
sf profiler compare --target-org qa-org --json | jq '.result.profilesWithDifferences'
```

## Output Format

### Console Output

The command displays results organized by profile:

```
================================================================================
Profile: Admin
================================================================================
✗ Differences found for profile: Admin
Total differences: 15

+ Added (in org, not in local):
  Line 45: <userPermissions><enabled>true</enabled><name>ViewSetup</name></userPermissions>
  Line 67: <applicationVisibilities><application>MyNewApp</application><visible>true</visible></applicationVisibilities>

- Removed (in local, not in org):
  Line 23: <userPermissions><enabled>false</enabled><name>OldPermission</name></userPermissions>

~ Changed:
  Line 102:
    Local:  <enabled>false</enabled>
    Org:    <enabled>true</enabled>
  Line 156:
    Local:  <default>Standard</default>
    Org:    <default>Custom</default>
```

### JSON Output

```json
{
  "status": 0,
  "result": {
    "success": true,
    "totalProfilesCompared": 3,
    "profilesWithDifferences": 1,
    "comparisons": [
      {
        "profileName": "Admin",
        "hasDifferences": true,
        "differences": [
          {
            "lineNumber": 45,
            "type": "added",
            "orgLine": "<userPermissions>...</userPermissions>"
          },
          {
            "lineNumber": 102,
            "type": "changed",
            "localLine": "<enabled>false</enabled>",
            "orgLine": "<enabled>true</enabled>"
          }
        ]
      }
    ]
  }
}
```

## Difference Types

The command identifies three types of differences:

### 1. Added Lines (+ symbol)
Lines that exist in the org version but not in the local version.

**Example:**
```
+ Line 45: <userPermissions><enabled>true</enabled><name>NewFeature</name></userPermissions>
```

**Meaning:** This permission exists in the org but hasn't been retrieved locally yet.

### 2. Removed Lines (- symbol)
Lines that exist in the local version but not in the org version.

**Example:**
```
- Line 23: <userPermissions><enabled>false</enabled><name>OldPermission</name></userPermissions>
```

**Meaning:** This permission exists locally but has been removed from the org (or never existed).

### 3. Changed Lines (~ symbol)
Lines that exist in both versions but with different content.

**Example:**
```
~ Line 102:
  Local:  <enabled>false</enabled>
  Org:    <enabled>true</enabled>
```

**Meaning:** The same element exists in both places but with different values.

## How It Works

1. **Local Profile Identification**: Reads profile(s) from `force-app/main/default/profiles/`
2. **Org Retrieval**: Retrieves the same profile(s) from the target org using Metadata API
3. **Line-by-Line Comparison**: Compares content line by line
4. **Difference Classification**: Categorizes differences as added, removed, or changed
5. **Report Generation**: Displays organized results
6. **Cleanup**: Removes temporary files used for comparison

## Use Cases

### 1. Pre-Commit Validation

Before committing profile changes to Git:

```bash
# Compare all profiles
sf profiler compare --target-org dev-sandbox

# Review differences
# Commit only if changes are expected
git add force-app/main/default/profiles/
git commit -m "Update profile permissions"
```

### 2. Deployment Preparation

Before deploying to a higher environment:

```bash
# Compare profiles between environments
sf profiler retrieve --target-org dev-sandbox
sf profiler compare --target-org staging --name "Admin"

# Review differences to understand impact
# Deploy if changes are acceptable
sf project deploy start --target-org staging
```

### 3. Profile Drift Detection

Check if org profiles have drifted from version control:

```bash
# Compare all profiles
sf profiler compare --target-org production

# Investigate profiles with differences
# Update local version if needed
sf profiler retrieve --target-org production --name "Sales"
```

### 4. Security Audit

Verify profile permissions haven't changed unexpectedly:

```bash
# Compare sensitive profiles
sf profiler compare --target-org production --name "System Administrator"
sf profiler compare --target-org production --name "Security"

# Review any unexpected changes
# Take action if unauthorized modifications detected
```

### 5. CI/CD Integration

Automated comparison in pipelines:

```bash
# Compare and get JSON output
RESULT=$(sf profiler compare --target-org qa-org --json)

# Parse results
DIFFERENCES=$(echo $RESULT | jq '.result.profilesWithDifferences')

# Fail pipeline if unexpected differences
if [ "$DIFFERENCES" -gt 0 ]; then
  echo "Profile differences detected!"
  exit 1
fi
```

## Advanced Usage

### Compare Specific Profiles in Bulk

```bash
# Create a script to compare multiple specific profiles
for profile in "Admin" "Sales" "Support"; do
  echo "Comparing $profile..."
  sf profiler compare --target-org production --name "$profile"
done
```

### Automated Daily Comparison

```bash
#!/bin/bash
# daily-profile-check.sh

echo "Daily Profile Comparison - $(date)"
sf profiler compare --target-org production --json > profile-comparison-$(date +%Y%m%d).json

# Alert if differences found
DIFFS=$(jq '.result.profilesWithDifferences' profile-comparison-$(date +%Y%m%d).json)
if [ "$DIFFS" -gt 0 ]; then
  echo "⚠️ $DIFFS profiles have differences!"
  # Send notification (email, Slack, etc.)
fi
```

## Limitations

1. **Requires Local Profiles**: Profiles must exist in your local project for comparison
2. **Line-Based Comparison**: Compares exact lines, so formatting changes show as differences
3. **No Semantic Understanding**: Doesn't understand XML structure, just compares text
4. **Temporary Storage**: Creates temporary files during comparison (cleaned up automatically)

## Troubleshooting

### No Profiles Found

**Error:**
```
No profiles found in the project.
```

**Solution:**
```bash
# Make sure you're in a Salesforce project
cd your-salesforce-project

# Verify profiles exist
ls force-app/main/default/profiles/
```

### Profile Not Found in Org

**Warning:**
```
Profile not found in org: CustomProfile
```

**Possible Causes:**
- Profile doesn't exist in the org
- Profile name is misspelled
- User doesn't have permission to see the profile

**Solution:**
```bash
# List profiles in org
sf data query --query "SELECT Name FROM Profile" --target-org your-org

# Check exact name (case-sensitive)
```

### Retrieve Failed

**Error:**
```
Failed to retrieve profile from org: INVALID_TYPE
```

**Solution:**
- Verify org authentication: `sf org display --target-org your-org`
- Check user permissions
- Try with a different API version: `--api-version 59.0`

## Best Practices

1. **Regular Comparisons**: Run comparisons regularly to catch drift early
2. **Before Commits**: Always compare before committing profile changes
3. **Use Specific Names**: When possible, compare specific profiles for faster results
4. **Document Differences**: Keep notes on intentional differences
5. **Automate in CI/CD**: Include in your pipeline for continuous monitoring
6. **Review Carefully**: Not all differences are problems - some may be intentional
7. **Combine with Retrieve**: Use `compare` to identify differences, then `retrieve` to sync

## Integration with Other Commands

### Compare → Retrieve Workflow

```bash
# 1. Compare to see what's different
sf profiler compare --target-org dev-org --name "Admin"

# 2. If differences are expected, retrieve the org version
sf profiler retrieve --target-org dev-org

# 3. Compare again to verify
sf profiler compare --target-org dev-org --name "Admin"
```

### Retrieve → Compare → Deploy Workflow

```bash
# 1. Retrieve profiles from source org
sf profiler retrieve --target-org source-org

# 2. Compare with target org
sf profiler compare --target-org target-org

# 3. Review differences and deploy if acceptable
sf project deploy start --target-org target-org
```

## Performance Considerations

- **Single Profile**: ~5-10 seconds depending on profile size
- **All Profiles**: Time scales with number of profiles (1-2 min for 20+ profiles)
- **Parallel Processing**: Multiple profiles are compared in parallel
- **Network Speed**: Retrieval time depends on connection to Salesforce

## Future Enhancements

Potential improvements for future versions:

1. **XML-Aware Comparison**: Understand XML structure instead of line-based
2. **Ignore Formatting**: Option to ignore whitespace/formatting differences
3. **Diff Visualization**: Color-coded diff output
4. **Export to HTML**: Generate HTML reports of differences
5. **Permission-Level Comparison**: Compare at permission level, not line level
6. **Baseline Tracking**: Track comparison history over time

## Related Commands

- `sf profiler retrieve` - Retrieve profiles from org
- `sf project deploy start` - Deploy profiles to org
- `sf project retrieve start` - Standard Salesforce retrieve
- `sf data query` - Query profile metadata

## Support

For issues or questions:
- Check the main [README](README.md)
- Review [USAGE](USAGE.md)
- Open an issue on GitHub


