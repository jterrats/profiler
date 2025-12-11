# NUT Tests (Non-Unit Tests)

## Overview

NUT tests are **integration tests that require real Salesforce org connections**. Unlike unit tests that use mocks, NUT tests validate the plugin's functionality end-to-end with actual Salesforce APIs.

## Test Coverage

| Test Suite | Basic Tests | Org-Dependent Tests | Total |
|------------|-------------|---------------------|-------|
| `retrieve.nut.ts` | 2 | 6 | 8 |
| `compare.nut.ts` | 2 | 8 | 10 |
| `docs.nut.ts` | 2 | 0 | 2 |
| **TOTAL** | **6** | **14** | **20** |

**Basic Tests** (no org required):
- Command help output
- Error handling without org

**Org-Dependent Tests** (require real orgs):
- Full retrieve operations
- Incremental retrieve (`--force`, `--dry-run`)
- Single-org comparison
- Multi-source comparison
- Output formats (JSON, HTML, table)

## Setup

### Prerequisites

1. **Authenticated Salesforce Orgs**

You need to authenticate with Salesforce orgs using `sf org login`:

```bash
# For single-org tests (retrieve + compare)
sf org login web --alias grg-poc

# For multi-source tests (compare only)
sf org login web --alias grg-qa
sf org login web --alias grg-uat
```

2. **Environment Variables**

Set the following environment variables:

```bash
# Required for single-org tests
export PROFILER_TEST_ORG_ALIAS=grg-poc

# Required for multi-source tests (in addition to above)
export PROFILER_TEST_ORG_ALIAS_2=grg-qa
export PROFILER_TEST_ORG_ALIAS_3=grg-uat
```

### Quick Setup Script

Save this to `~/.profiler-test-env`:

```bash
#!/bin/bash
# Profiler NUT Test Environment Configuration

export PROFILER_TEST_ORG_ALIAS=grg-poc
export PROFILER_TEST_ORG_ALIAS_2=grg-qa
export PROFILER_TEST_ORG_ALIAS_3=grg-uat

echo "✅ Profiler test environment configured:"
echo "   Primary org: $PROFILER_TEST_ORG_ALIAS"
echo "   Secondary org: $PROFILER_TEST_ORG_ALIAS_2"
echo "   Tertiary org: $PROFILER_TEST_ORG_ALIAS_3"
```

Then source it before running tests:

```bash
source ~/.profiler-test-env
```

## Running NUT Tests

### Run All NUT Tests

```bash
npm run test:nuts
```

### Run Specific Test Suite

```bash
# Only retrieve tests
npm run test:nuts -- test/commands/profiler/retrieve.nut.ts

# Only compare tests
npm run test:nuts -- test/commands/profiler/compare.nut.ts

# Only docs tests (no org required)
npm run test:nuts -- test/commands/profiler/docs.nut.ts
```

### Run Only Basic Tests (no org required)

If you don't have orgs configured, you can still run basic tests:

```bash
# This will skip org-dependent tests automatically
unset PROFILER_TEST_ORG_ALIAS
unset PROFILER_TEST_ORG_ALIAS_2
unset PROFILER_TEST_ORG_ALIAS_3

npm run test:nuts
```

Output will show:
```
✓ should display help for profiler retrieve
✓ should fail without target-org flag
- with real org connection (6 tests skipped)
```

## Test Behavior

### Conditional Test Execution

Tests automatically skip if required environment variables are not set:

```typescript
// Single-org tests run only if PROFILER_TEST_ORG_ALIAS is set
(testOrgAlias ? describe : describe.skip)('with real org connection', () => {
  // tests here
});

// Multi-source tests run only if all 3 aliases are set
(testOrgAlias && testOrgAlias2 && testOrgAlias3 ? describe : describe.skip)('with multiple orgs', () => {
  // tests here
});
```

### Test Isolation

Each test uses a temporary test session:
- Tests run in isolation
- No side effects between tests
- Clean up after execution

### Timeouts

Some tests (especially file operations) have extended timeouts:

```typescript
it('should compare with --output-file', function () {
  this.timeout(60000); // 60 seconds
  // test code
});
```

## CI/CD Integration (Optional)

### GitHub Actions

To run NUT tests in GitHub Actions, you need to:

1. **Add org credentials as secrets**:
   - `SF_AUTH_URL_DEV_ORG` (for primary org)
   - `SF_AUTH_URL_DEV_ORG_2` (for secondary org)
   - `SF_AUTH_URL_DEV_ORG_3` (for tertiary org)

2. **Update `.github/workflows/test.yml`**:

```yaml
jobs:
  nuts:
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 'lts/*'
      - run: npm ci
      
      # Authenticate orgs
      - name: Authenticate Test Orgs
        run: |
          echo "${{ secrets.SF_AUTH_URL_DEV_ORG }}" > authfile.txt
          sf org login sfdx-url --sfdx-url-file authfile.txt --alias grg-poc
          
          echo "${{ secrets.SF_AUTH_URL_DEV_ORG_2 }}" > authfile2.txt
          sf org login sfdx-url --sfdx-url-file authfile2.txt --alias grg-qa
          
          echo "${{ secrets.SF_AUTH_URL_DEV_ORG_3 }}" > authfile3.txt
          sf org login sfdx-url --sfdx-url-file authfile3.txt --alias grg-uat
          
          rm authfile*.txt
      
      # Set environment variables
      - name: Set Test Env Vars
        run: |
          echo "PROFILER_TEST_ORG_ALIAS=grg-poc" >> $GITHUB_ENV
          echo "PROFILER_TEST_ORG_ALIAS_2=grg-qa" >> $GITHUB_ENV
          echo "PROFILER_TEST_ORG_ALIAS_3=grg-uat" >> $GITHUB_ENV
      
      # Run NUT tests
      - name: Run NUT Tests
        run: npm run test:nuts
```

### Trade-offs

**Pros**:
- Automated validation on every PR
- Catches integration bugs early
- No manual testing needed

**Cons**:
- Slower CI/CD pipeline (~5-10 minutes)
- Requires maintaining test orgs
- Uses Salesforce API calls (rate limits)
- More complex setup

**Recommendation**: Start with **manual E2E testing** pre-release, add automated NUT tests later if needed.

## Troubleshooting

### Error: "No authorization information found"

**Cause**: Org alias not authenticated or expired.

**Solution**:
```bash
sf org list
sf org login web --alias grg-poc
```

### Error: "Command failed with exit code 1"

**Cause**: Project doesn't have profiles to compare.

**Solution**: Run from a valid Salesforce DX project with profiles in `force-app/main/default/profiles/`.

### Tests are skipped

**Cause**: Environment variables not set.

**Solution**:
```bash
echo $PROFILER_TEST_ORG_ALIAS  # Should not be empty
source ~/.profiler-test-env
```

### Timeout errors

**Cause**: Slow network or large metadata.

**Solution**: Increase timeout in test:
```typescript
this.timeout(120000); // 2 minutes
```

## Test Maintenance

### Adding New Tests

1. Add test to appropriate `.nut.ts` file
2. Use conditional execution if org is required
3. Add documentation here
4. Test locally before committing

### Updating Orgs

If you change test org aliases:

1. Update environment variables
2. Re-authenticate with new aliases
3. Run tests to verify

## Related Documentation

- [E2E Testing Guide](./E2E_TESTING.md) - Manual end-to-end testing
- [Development Setup](./DEVELOPMENT.md) - General development guide
- [Error Catalog](./ERROR_CATALOG.md) - Error handling reference

