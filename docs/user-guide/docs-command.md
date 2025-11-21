# Profiler Docs Command

## Overview

The `profiler docs` command generates comprehensive Markdown documentation for Salesforce Profile metadata files. It analyzes your local profile XML files and creates human-readable documentation with detailed permission matrices.

## Command Syntax

```bash
sf profiler docs [--name <profile-name>] [--output-dir <directory>]
```

## Flags

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--name` | `-n` | Name of a specific profile to document | (all profiles) |
| `--output-dir` | `-d` | Output directory for generated documentation | `profile-docs` |
| `--json` | - | Format output as JSON | - |

## Usage Examples

### Generate Documentation for All Profiles

```bash
sf profiler docs
```

This will:
- Scan `force-app/main/default/profiles/` for all profile files
- Generate a Markdown file for each profile
- Save output to `profile-docs/` directory

### Generate Documentation for a Specific Profile

```bash
sf profiler docs --name Admin
```

This will generate documentation only for `Admin.profile-meta.xml`.

### Custom Output Directory

```bash
sf profiler docs --output-dir docs/profiles
```

This will save the generated documentation to `docs/profiles/` instead of the default `profile-docs/` directory.

### Combine Flags

```bash
sf profiler docs --name "Sales User" --output-dir salesforce-docs
```

## Generated Documentation Structure

Each generated Markdown file includes:

### 1. Header Information
- Profile name
- File name
- Description (if available)
- Custom profile indicator

### 2. Permission Matrices

#### User Permissions
Shows all system-level permissions with enable/disable status:
- API Enabled
- Edit Events
- Manage Users
- etc.

#### Application Visibilities
Lists which Salesforce applications are visible to the profile:
- Application name
- Visible (✅/❌)
- Default (✅/❌)

#### Apex Class Accesses
Shows which Apex classes the profile can access:
- Class name
- Enabled (✅/❌)

#### Object Permissions
Comprehensive CRUD permissions for all objects:
- Object name
- Create (✅/❌)
- Read (✅/❌)
- Edit (✅/❌)
- Delete (✅/❌)
- View All Records (✅/❌)
- Modify All Records (✅/❌)

#### Field-Level Security (FLS)
Shows field-level permissions:
- Field name (Object.Field format)
- Readable (✅/❌)
- Editable (✅/❌)

#### Record Type Visibilities
Shows record type access:
- Record type name
- Visible (✅/❌)
- Default (✅/❌)

#### Visualforce Page Accesses
Lists accessible Visualforce pages:
- Page name
- Enabled (✅/❌)

#### Tab Visibilities
Shows tab visibility settings:
- Tab name
- Visibility level (DefaultOn, DefaultOff, Hidden)

#### Layout Assignments
Shows page layout assignments:
- Layout name
- Assigned record type

### 3. Summary Statistics
A summary table showing count of permissions in each category:
- Total user permissions
- Total applications
- Total Apex classes
- Total objects
- Total fields (FLS)
- Total record types
- Total Visualforce pages
- Total tabs
- Total layout assignments

## Example Output

Here's what a generated documentation file looks like:

```markdown
# Profile Documentation: Admin

**File Name:** `Admin.profile-meta.xml`

**Description:** System Administrator Profile

**Custom Profile:** false

---

## User Permissions

Total: **147** permissions

| Permission Name | Enabled |
|-----------------|:-------:|
| ApiEnabled | ✅ |
| ManageUsers | ✅ |
| ViewSetup | ✅ |
| ... | ... |

## Object Permissions

Total: **42** objects

| Object | Create | Read | Edit | Delete | View All | Modify All |
|--------|:------:|:----:|:----:|:------:|:--------:|:----------:|
| Account | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contact | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ... | ... | ... | ... | ... | ... | ... |

## Field Level Security (FLS)

Total: **234** field permissions

| Field | Readable | Editable |
|-------|:--------:|:--------:|
| Account.AnnualRevenue | ✅ | ✅ |
| Account.NumberOfEmployees | ✅ | ✅ |
| ... | ... | ... |

---

## Summary Statistics

| Category | Count |
|----------|------:|
| User Permissions | 147 |
| Applications | 12 |
| Apex Classes | 56 |
| Objects | 42 |
| Fields (FLS) | 234 |
| Record Types | 18 |
| Visualforce Pages | 24 |
| Tabs | 35 |
| Layout Assignments | 28 |
| **Total** | **596** |

---

_Documentation generated on 2025-11-21T10:30:00.000Z_
```

## Use Cases

### 1. Profile Documentation for Compliance
Generate documentation for audit purposes or compliance reviews:

```bash
sf profiler docs
git add profile-docs/
git commit -m "docs: update profile documentation for Q4 audit"
```

### 2. Profile Comparison
Compare profiles by reviewing their documentation side-by-side.

### 3. Onboarding New Team Members
Provide clear, human-readable profile documentation to help new developers understand security models.

### 4. Technical Debt Analysis
Quickly identify profiles with excessive permissions or FLS configurations.

### 5. Migration Planning
Document existing profiles before planning a migration to Permission Sets and Permission Set Groups.

## Notes

- The command requires a Salesforce DX project structure with profiles in `force-app/main/default/profiles/`
- Profile files must be in XML format (`.profile-meta.xml`)
- Generated documentation uses GitHub-flavored Markdown
- Icons (✅/❌) are used for better readability
- The output directory is automatically created if it doesn't exist
- The command uses parallel processing for faster execution when documenting multiple profiles

## Integration with CI/CD

You can integrate this command into your CI/CD pipeline to automatically generate documentation:

```yaml
# .github/workflows/generate-docs.yml
name: Generate Profile Documentation

on:
  push:
    paths:
      - 'force-app/main/default/profiles/**'

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install SF CLI
        run: npm install -g @salesforce/cli
      - name: Install Plugin
        run: sf plugins install profiler
      - name: Generate Docs
        run: sf profiler docs
      - name: Commit Documentation
        run: |
          git add profile-docs/
          git commit -m "docs: auto-generate profile documentation"
          git push
```

## Troubleshooting

### Error: Profiles directory not found

**Problem**: The command cannot find the profiles directory.

**Solution**: Make sure you're running the command from the root of a Salesforce DX project with profiles in `force-app/main/default/profiles/`.

### Error: Profile "X" not found

**Problem**: The specified profile name doesn't exist.

**Solution**: Check the profile name (case-sensitive) and ensure the file exists with `.profile-meta.xml` extension.

### Warning: No profiles found to document

**Problem**: No profile files were found in the profiles directory.

**Solution**: Verify that profile XML files exist in `force-app/main/default/profiles/`.

## Related Commands

- [`sf profiler retrieve`](usage.md#profiler-retrieve) - Retrieve profiles from org
- [`sf profiler compare`](usage.md#profiler-compare) - Compare local vs org profiles

## Feedback

If you have suggestions for improving the documentation format or additional information you'd like to see, please [open an issue](https://github.com/jterrats/profiler/issues).

