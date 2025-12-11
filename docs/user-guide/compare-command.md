# Profiler Compare Command - Documentation

## Overview

The `sf profiler compare` command provides two powerful comparison modes:

1. **Single-Source Mode**: Compare local Profile metadata files with their versions in a Salesforce org
2. **Multi-Source Mode** ⭐ NEW in v2.4.0: Compare profiles across multiple Salesforce environments in parallel

This is useful for:

- Identifying changes before committing to version control
- Understanding what has drifted between local and org versions
- Validating profile changes before deployment
- Auditing profile modifications
- **Detecting configuration drift across multiple environments**
- **Ensuring consistency between dev/qa/uat/prod**

## Usage

### Single-Source Mode (Local vs. Org)

```bash
sf profiler compare --target-org <org-alias> [--name <profile-name>] [--api-version <version>]
```

### Multi-Source Mode (Cross-Environment)

```bash
sf profiler compare --sources <org1,org2,org3> [--name <profile-name>] [--output-format <table|json|html>]
```

## Flags

### Common Flags

| Flag                | Alias | Required | Description                                                             |
| ------------------- | ----- | -------- | ----------------------------------------------------------------------- |
| `--name`            | `-n`  | No       | Profile name(s) to compare (comma-separated, without .profile-meta.xml) |
| `--api-version`     |       | No       | Override the API version used for metadata operations                   |
| `--exclude-managed` |       | No       | Exclude metadata from managed packages (with namespace prefixes)        |
| `--json`            |       | No       | Format output as JSON                                                   |

### Single-Source Mode Flags

| Flag           | Required | Description                                |
| -------------- | -------- | ------------------------------------------ |
| `--target-org` | Yes\*    | The target org to compare profiles against |

\*Mutually exclusive with `--sources`

### Multi-Source Mode Flags (v2.4.0+)

| Flag              | Required | Description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `--sources`       | Yes\*    | Comma-separated list of org aliases to compare (e.g., "dev,qa,prod") |
| `--output-format` | No       | Output format: `table` (default), `json`, or `html`                  |
| `--output-file`   | No       | Export comparison results to file                                    |

\*Mutually exclusive with `--target-org`, requires minimum 2 orgs

## Examples

### Single-Source Mode Examples

#### Compare a Specific Profile

Compare the "Admin" profile between local and org:

```bash
sf profiler compare --target-org production --name "Admin"
```

#### Compare All Profiles

Compare all profiles in your project:

```bash
sf profiler compare --target-org dev-sandbox
```

#### Compare with Specific API Version

```bash
sf profiler compare --target-org integration --name "Sales" --api-version 60.0
```

#### Exclude Managed Packages

Compare profiles while excluding managed package components:

```bash
sf profiler compare --target-org production --name "Admin" --exclude-managed
```

This is useful when comparing profiles that reference managed package components that may not be installed or accessible.

#### JSON Output for Automation

```bash
sf profiler compare --target-org qa-org --json | jq '.result.profilesWithDifferences'
```

### Multi-Source Mode Examples (v2.4.0+)

#### Compare Across Multiple Environments

Compare Admin profile across dev, qa, and prod:

```bash
sf profiler compare --name Admin --sources "dev,qa,prod"
```

#### Compare Multiple Profiles Across Environments

```bash
sf profiler compare --name "Admin,Sales Profile,Support" --sources "dev,qa,uat,prod"
```

#### Export to HTML Report

Generate an HTML report for sharing with team:

```bash
sf profiler compare --name Admin --sources "dev,qa,prod" \
  --output-format html --output-file ./comparison-report.html
```

#### Get JSON Output for Automation

```bash
sf profiler compare --name Admin --sources "dev,qa,prod" \
  --output-format json > comparison.json
```

## Multi-Source Comparison (v2.4.0+)

### Overview

Multi-source comparison allows you to compare the same profiles across multiple Salesforce environments simultaneously. This is essential for:

- **Configuration Drift Detection**: Identify when environments have diverged
- **Pre-Release Validation**: Ensure QA/UAT match production before release
- **Environment Consistency**: Verify all environments have correct settings
- **Audit & Compliance**: Document profile state across all orgs

### How It Works

1. **Parallel Retrieval**: Fetches profiles from all specified orgs concurrently (4x faster than sequential)
2. **Comparison Matrix**: Builds a cross-environment comparison matrix
3. **Graceful Degradation**: Continues with successful orgs if some fail
4. **Multiple Formats**: Output as table, JSON, or HTML

### Key Features

✅ **Parallel Execution**: Retrieves from all orgs simultaneously
✅ **Graceful Error Handling**: Partial results if some orgs fail
✅ **Multiple Output Formats**: Table, JSON, HTML
✅ **File Export**: Save results for documentation
✅ **No Local Comparison**: Compares org-to-org directly

### Prerequisites

All org aliases must be pre-authenticated:

```bash
# Authenticate to each environment
sf org login web --alias dev
sf org login web --alias qa
sf org login web --alias uat
sf org login web --alias prod
```

### Output Formats

#### Table Format (Default)

Human-readable ASCII table for terminal display:

```
╔══════════════════════════════════════════════════════════════╗
║      Multi-Source Profile Comparison Matrix                 ║
╚══════════════════════════════════════════════════════════════╝

📊 Profiles Compared: 1
🌍 Environments: 3
✅ Successful: dev, qa, prod

────────────────────────────────────────────────────────────────

Profile: Admin

  Org          Status
  ──────────────────────────
  dev          ✅ Retrieved
  qa           ✅ Retrieved
  prod         ✅ Retrieved

✨ All environments retrieved successfully!
```

#### JSON Format

Machine-readable for automation and CI/CD:

```json
{
  "status": "success",
  "profilesCompared": 1,
  "orgsInvolved": 3,
  "allOrgsSucceeded": true,
  "successfulOrgs": ["dev", "qa", "prod"],
  "failedOrgs": [],
  "matrices": [
    {
      "profileName": "Admin",
      "successfulOrgs": ["dev", "qa", "prod"],
      "failedOrgs": [],
      "orgCount": 3
    }
  ]
}
```

#### HTML Format

Web-friendly with Bootstrap styling for reports:

```bash
sf profiler compare --name Admin --sources "dev,qa,prod" \
  --output-format html --output-file ./report.html
```

Features:

- Responsive design
- Color-coded success/failure indicators
- Professional styling
- Self-contained (no external dependencies)

### Use Cases

#### 1. Pre-Release Validation

Ensure staging matches production before release:

```bash
sf profiler compare --name "Admin,Sales" --sources "staging,prod"
```

#### 2. Environment Consistency Check

Verify all environments are aligned:

```bash
sf profiler compare --name Admin --sources "dev,qa,uat,prod" \
  --output-format html --output-file ./consistency-report.html
```

#### 3. Configuration Drift Detection

Daily automated check for drift:

```bash
#!/bin/bash
# daily-drift-check.sh

sf profiler compare --name Admin --sources "dev,prod" \
  --output-format json > drift-check-$(date +%Y%m%d).json

DIFFS=$(jq '.failedOrgs | length' drift-check-$(date +%Y%m%d).json)
if [ "$DIFFS" -gt 0 ]; then
  echo "⚠️ Drift detected!"
  # Send alert
fi
```

#### 4. Multi-Environment Audit

Generate compliance report across all environments:

```bash
sf profiler compare --name "Admin,Security,Compliance" \
  --sources "dev,qa,uat,prod" \
  --output-format html --output-file ./audit-report.html
```

### Error Handling

The command uses **graceful degradation**:

```bash
# If 1 of 3 orgs fails, continues with the other 2
sf profiler compare --name Admin --sources "dev,qa,prod"

# Output shows partial results:
✅ Successfully retrieved from: dev, prod
⚠️  Failed to retrieve from 1 org(s):
   - qa: Connection timeout

⚠️ 1 environment(s) failed - showing partial results
```

### Performance

| Environments | Sequential | Parallel | Speedup |
| ------------ | ---------- | -------- | ------- |
| 2 orgs       | ~20s       | ~10s     | 2x      |
| 3 orgs       | ~30s       | ~10s     | 3x      |
| 4 orgs       | ~40s       | ~10s     | 4x      |

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
3. **Diff Visualization**: Color-coded diff output in terminal
4. **Permission-Level Comparison**: Compare at permission level, not line level
5. **Baseline Tracking**: Track comparison history over time
6. **Visual Diff Tool**: Interactive UI for exploring differences

✅ **Implemented in v2.4.0:**

- Multi-source comparison across multiple environments
- HTML export with styled reports
- JSON output format for automation
- Parallel retrieval for performance

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
