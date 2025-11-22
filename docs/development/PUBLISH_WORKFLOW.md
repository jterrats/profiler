# npm Publishing Workflow Documentation

## Overview

This document describes the automated npm publishing workflow for `@jterrats/profiler` with cryptographic provenance.

## Workflow File

**Location:** `.github/workflows/publish-npm.yml`

## How It Works

### 1. Trigger Mechanism

```yaml
on:
  release:
    types: [published]
```

The workflow is triggered when:

- A GitHub Release is **published** (not drafted)
- This ensures intentional releases only

### 2. Security Configuration

```yaml
permissions:
  contents: read # Read repository contents
  id-token: write # Required for Sigstore/provenance
```

**Why `id-token: write`?**

- Allows GitHub Actions to request an OIDC token
- The OIDC token proves the workflow's identity
- Sigstore uses this token to create attestations
- No long-lived secrets needed!

### 3. Provenance with Sigstore

When publishing with `npm publish --provenance`:

1. **npm requests an attestation** from the build environment
2. **GitHub Actions provides an OIDC token** containing:
   - Repository name
   - Commit SHA
   - Workflow run ID
   - Actor (who triggered)
3. **Sigstore signs the attestation** using the OIDC token
4. **Attestation is published** to Rekor (public transparency log)
5. **npm stores the attestation** linked to the package version

**Result:** Anyone can verify:

- The package was built from your GitHub repo
- Which commit was used
- The complete build process (via workflow logs)

### 4. Workflow Steps

#### Build & Test Phase

```yaml
- Install dependencies (with frozen lockfile)
- Build the plugin
- Run all tests
- Run linter
- Verify package contents (dry run)
```

These steps ensure only quality code is published.

#### Publish Phase

```yaml
- name: Publish to npm with provenance
  run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Flags explained:**

- `--provenance`: Enable Sigstore signing
- `--access public`: Required for scoped packages (@jterrats/profiler)

**Environment:**

- `NODE_AUTH_TOKEN`: npm authentication token from GitHub Secrets

#### Verification Phase

```yaml
- Verify the package appears on npm
- Display package distribution info
- Create GitHub Actions summary
```

Ensures the publish succeeded and provides feedback.

## Setting Up

### Required GitHub Secret

**Name:** `NPM_TOKEN`

**How to create:**

1. **Generate npm token:**

   ```bash
   # Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   # Click "Generate New Token" → "Automation"
   # Copy the token (starts with npm_...)
   ```

2. **Add to GitHub:**
   - Go to repo Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token
   - Save

### Token Type: Automation vs Classic

**Use Automation Token:**

- ✅ Works with 2FA
- ✅ Recommended by npm
- ✅ Better security

**Don't use Classic Token:**

- ❌ Requires disabling 2FA for publishing
- ❌ Less secure

## Usage

### Creating a Release

```bash
# 1. Update version
npm version patch  # or minor, or major

# 2. Update CHANGELOG.md
vim CHANGELOG.md

# 3. Commit
git add -A
git commit -m "chore: release v$(node -p "require('./package.json').version")"

# 4. Tag
git tag -a v$(node -p "require('./package.json').version") -m "Release v$(node -p "require('./package.json').version")"

# 5. Push with tags
git push --follow-tags

# 6. Create GitHub Release
# Go to: https://github.com/jterrats/profiler/releases/new
# - Select the tag
# - Add title: "v2.0.0"
# - Add description from CHANGELOG.md
# - Click "Publish release"

# 7. Watch GitHub Actions
# Go to: https://github.com/jterrats/profiler/actions
# The workflow will automatically publish to npm
```

### What Happens Automatically

1. ✅ Code is checked out
2. ✅ Dependencies installed
3. ✅ Plugin built
4. ✅ Tests run
5. ✅ Linter runs
6. ✅ Package verified
7. ✅ Published to npm with provenance
8. ✅ Publication verified
9. ✅ Summary created

### Checking Results

After workflow completes:

**On GitHub:**

- Check the Actions tab for workflow run
- Review the summary with package details

**On npm:**

```bash
# View package
npm view @jterrats/profiler

# View provenance
npm view @jterrats/profiler --json | jq '.dist'

# Audit signatures
npm audit signatures
```

**On npmjs.com:**

- Visit https://www.npmjs.com/package/@jterrats/profiler
- Look for "Provenance" badge/section
- Click to see build details and verification

## Provenance Verification

### What Users See

When a user views the package on npmjs.com:

```
✓ Provenance
  Published from github.com/jterrats/profiler
  Build: .github/workflows/publish-npm.yml
  Commit: abc123...
  View workflow run →
```

### How to Verify

**Command line:**

```bash
npm view @jterrats/profiler dist.attestations
```

**Output:**

```json
{
  "url": "https://registry.npmjs.org/-/npm/v1/attestations/@jterrats/profiler@2.0.0",
  "provenance": {
    "predicateType": "https://slsa.dev/provenance/v1"
  }
}
```

**Programmatically:**

```javascript
const registry = require('@npmcli/arborist');
// Verify attestations
```

## Troubleshooting

### Workflow Not Triggering

**Cause:** Workflow only runs on **published** releases, not drafts.

**Solution:** Make sure to click "Publish release" not "Save draft".

### Error: "id-token permission required"

**Cause:** Missing `id-token: write` permission.

**Solution:** Already configured in the workflow, but if using in other workflows:

```yaml
permissions:
  id-token: write
```

### Error: "npm token invalid"

**Cause:** Token expired or incorrect.

**Solution:**

1. Generate new Automation token on npmjs.com
2. Update `NPM_TOKEN` secret in GitHub

### Provenance Not Showing

**Cause:** Not publishing from GitHub Actions or missing `--provenance` flag.

**Solution:** Always publish via GitHub Release, not manually.

### Error: "Cannot verify OIDC token"

**Cause:** GitHub OIDC provider issue.

**Solution:** Retry the workflow. If persistent, check GitHub Status.

## Security Considerations

### What Provenance Proves

✅ **Proves:**

- Package was built from specified GitHub repo
- Specific commit was used
- Official workflow was used
- No tampering after build

❌ **Does NOT prove:**

- The code is secure
- The dependencies are safe
- The committer's identity (use GPG for that)

### Best Practices

1. **Protect main branch**: Require PR reviews
2. **Use branch protection**: Prevent force pushes
3. **Sign commits**: Use GPG to sign commits
4. **Review dependencies**: Audit before adding
5. **Monitor releases**: Watch GitHub Releases feed
6. **Enable 2FA**: On npm and GitHub

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Release Published                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions Workflow Triggered               │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Checkout   │───▶│    Build     │───▶│     Test     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │     Lint     │───▶│    Verify    │───▶│   Publish    │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│                                                   │           │
│                            ┌──────────────────────┘           │
│                            │ OIDC Token Request               │
│                            ▼                                  │
│                   ┌─────────────────┐                         │
│                   │ GitHub OIDC     │                         │
│                   │ Provider        │                         │
│                   └────────┬────────┘                         │
└────────────────────────────┼──────────────────────────────────┘
                             │ OIDC Token
                             ▼
                    ┌─────────────────┐
                    │    Sigstore     │
                    │   (Fulcio CA)   │
                    └────────┬────────┘
                             │ Attestation
                             ▼
                    ┌─────────────────┐
                    │  Rekor (Public  │
                    │ Transparency Log)│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  npm Registry   │
                    │  with Provenance│
                    └─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Users       │
                    │  (Can Verify)   │
                    └─────────────────┘
```

## Additional Resources

- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [Sigstore Documentation](https://docs.sigstore.dev/)
- [GitHub OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [SLSA Framework](https://slsa.dev/)
- [Rekor Transparency Log](https://docs.sigstore.dev/logging/overview/)
