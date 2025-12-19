# E2E Expected Test Files

This directory contains expected output files for E2E tests. These files are used to validate that command outputs match expected structures and formats.

## Directory Structure

```
test-e2e-expected/
├── migrate/          # Expected files for migrate command
│   ├── migrate-fls-expected.json
│   ├── migrate-fls-apex-expected.json
│   ├── migrate-applications-expected.json
│   ├── migrate-customsettings-expected.json
│   ├── migrate-all-types-expected.json
│   ├── migrate-expected.md
│   ├── migrate-expected.csv
│   ├── migrate-expected.yaml
│   └── migrate-expected.html
└── compare/          # Expected files for compare command
    └── compare-expected.json
```

## Usage in E2E Tests

These files are used by `scripts/e2e-test.sh` to validate command outputs. The tests:

1. Run commands and capture output
2. Compare output structure against expected files
3. Validate that formats match expected patterns

## File Formats

### Migrate Command

- **JSON**: Validates JSON structure and required fields
  - `migrate-fls-expected.json`: Expected structure for FLS migration
  - `migrate-fls-apex-expected.json`: Expected structure for FLS + Apex migration
  - `migrate-applications-expected.json`: Expected structure for Application Visibilities migration
  - `migrate-customsettings-expected.json`: Expected structure for Custom Settings migration
  - `migrate-all-types-expected.json`: Expected structure for all 15 metadata types migration
- **HTML**: Validates HTML structure and key elements (DOCTYPE, table, etc.)
- **Markdown**: Validates Markdown headers and table structure
- **CSV**: Validates CSV header row format
- **YAML**: Validates YAML structure and indentation

## Supported Metadata Types

The migrate command supports 15 different metadata types:

1. `fls` - Field Level Security
2. `apex` - Apex Class Access
3. `flows` - Flow Access
4. `tabs` - Tab Visibility
5. `recordtype` - Record Type Access
6. `objectaccess` - Object Permissions
7. `connectedapps` - Connected App Access
8. `custompermissions` - Custom Permissions
9. `userpermissions` - User Permissions
10. `visualforce` - Visualforce Page Access
11. `custommetadatatypes` - Custom Metadata Type Access
12. `externalcredentials` - External Credential Access
13. `dataspaces` - Data Space Access
14. `applications` - Application Visibilities
15. `customsettings` - Custom Setting Access

### Compare Command

- **JSON**: Validates JSON structure with comparison results

## Notes

- These files represent **minimum expected structures**, not exact content
- Actual content may vary based on org data
- Tests validate structure and format, not exact content matching
- Files are templates that should match the general structure of outputs

