# Publishing to npm with Provenance

This guide explains how to publish `@jterrats/profiler` to npm with cryptographic provenance using Sigstore.

## 🔐 What is npm Provenance?

npm provenance is a security feature that:

- **Cryptographically signs** your package using Sigstore
- **Links the package** to the exact source code and build process
- **Provides transparency** through public logs (Rekor)
- **Allows verification** without managing long-lived certificates
- **Uses OIDC tokens** from GitHub Actions (no private keys to manage)

### Benefits

- ✅ **Trust**: Users can verify the package came from your GitHub repo
- ✅ **Security**: Prevents supply chain attacks
- ✅ **Transparency**: Build process is publicly auditable
- ✅ **Easy**: Automatic when publishing from GitHub Actions
- ✅ **Free**: No cost, no certificate management

## 📋 Prerequisites

### 1. npm Account and Token

1. Create an account at [npmjs.com](https://www.npmjs.com/) (if you don't have one)
2. Enable 2FA (Two-Factor Authentication) - **Recommended**
3. Generate an **Automation Token**:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token"
   - Select **"Automation"** (not Classic)
   - Copy the token (starts with `npm_...`)

### 2. Add NPM_TOKEN to GitHub Secrets

1. Go to your GitHub repo: https://github.com/jterrats/profiler
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click **"Add secret"**

## 🚀 Publishing Process

### Automatic Publishing (Recommended)

Publishing happens automatically when you create a GitHub Release:

```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Commit and push
git add package.json
git commit -m "chore: bump version to X.Y.Z"
git push

# 3. Create and push tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push --tags

# 4. Create GitHub Release
# Go to: https://github.com/jterrats/profiler/releases/new
# - Select the tag you just created
# - Add release notes from CHANGELOG.md
# - Click "Publish release"

# 5. GitHub Actions will automatically:
#    - Build the plugin
#    - Run tests
#    - Run linter
#    - Publish to npm with provenance
```

### Manual Publishing (Alternative)

If you need to publish manually:

```bash
# 1. Ensure you're on main branch and up to date
git checkout main
git pull

# 2. Install dependencies and build
yarn install
yarn build

# 3. Run tests
yarn test

# 4. Login to npm (if not already)
npm login

# 5. Publish with provenance (requires publishing from CI)
npm publish --access public

# Note: Manual publishing won't include provenance.
# For provenance, use GitHub Actions workflow.
```

## 📊 Workflow Details

The `.github/workflows/publish-npm.yml` workflow:

### Trigger

```yaml
on:
  release:
    types: [published]
```

Only runs when a GitHub Release is published.

### Permissions

```yaml
permissions:
  contents: read
  id-token: write # Required for Sigstore provenance
```

The `id-token: write` permission allows GitHub Actions to request an OIDC token from GitHub's OIDC provider, which Sigstore uses to sign the package.

### Steps

1. **Checkout**: Get the source code
2. **Setup Node.js**: Install Node.js 18 with npm registry config
3. **Install**: `yarn install --frozen-lockfile`
4. **Build**: `yarn build`
5. **Test**: `yarn test`
6. **Lint**: `yarn lint`
7. **Verify**: Check package contents with `npm pack --dry-run`
8. **Publish**: `npm publish --provenance --access public`
9. **Verify**: Check the published version
10. **Summary**: Create GitHub Actions summary with details

### Environment Variables

- `NODE_AUTH_TOKEN`: Set from `secrets.NPM_TOKEN`

## 🔍 Verifying Provenance

After publishing, users can verify the package:

### View Provenance Information

```bash
# View package details including provenance
npm view @jterrats/profiler --json | jq '.dist'
```

Output includes:

```json
{
  "integrity": "sha512-...",
  "shasum": "...",
  "tarball": "https://registry.npmjs.org/@jterrats/profiler/-/profiler-X.Y.Z.tgz",
  "attestations": {
    "url": "https://registry.npmjs.org/-/npm/v1/attestations/@jterrats/profiler@X.Y.Z",
    "provenance": {
      "predicateType": "https://slsa.dev/provenance/v1"
    }
  }
}
```

### Verify Signatures

```bash
# Audit package signatures
npm audit signatures
```

### Check Provenance Details

On npm website:

1. Go to https://www.npmjs.com/package/@jterrats/profiler
2. Click on a version
3. Look for **"Provenance"** section
4. See:
   - GitHub repository
   - Commit SHA
   - Workflow run
   - Public build logs

## 📝 Version Management

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): New features, backwards-compatible
- **PATCH** (0.0.X): Bug fixes, backwards-compatible

### Updating Versions

```bash
# Patch release (bug fixes)
npm version patch
# 2.0.0 → 2.0.1

# Minor release (new features)
npm version minor
# 2.0.1 → 2.1.0

# Major release (breaking changes)
npm version major
# 2.1.0 → 3.0.0
```

This command:

- Updates `package.json`
- Creates a git commit
- Creates a git tag

### Update CHANGELOG.md

Before releasing, update `CHANGELOG.md`:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New features

### Changed

- Changes to existing features

### Fixed

- Bug fixes

### Removed

- Removed features
```

## 🛠️ Troubleshooting

### Error: "This operation requires a one-time password"

You have 2FA enabled. Generate an **Automation token** instead of a Classic token.

### Error: "You do not have permission to publish"

Make sure:

1. You're logged into the correct npm account
2. Your npm token has publish permissions
3. You're using `--access public` for scoped packages

### Error: "Cannot publish over existing version"

The version already exists on npm. Bump the version:

```bash
npm version patch
git push --follow-tags
```

### Provenance Not Showing

Provenance only works when publishing from GitHub Actions with:

- `id-token: write` permission
- `--provenance` flag
- Valid GitHub OIDC token

## 📚 Additional Resources

- [npm Provenance Documentation](https://docs.npmjs.com/generating-provenance-statements)
- [Sigstore](https://www.sigstore.dev/)
- [SLSA Framework](https://slsa.dev/)
- [GitHub OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)

## 🔄 Release Checklist

Use this checklist for each release:

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md` with release notes
- [ ] Commit changes: `git commit -m "chore: release vX.Y.Z"`
- [ ] Create git tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
- [ ] Push changes: `git push`
- [ ] Push tags: `git push --tags`
- [ ] Create GitHub Release with notes from CHANGELOG
- [ ] Wait for GitHub Actions to publish
- [ ] Verify publication: `npm view @jterrats/profiler`
- [ ] Test installation: `sf plugins install @jterrats/profiler`
- [ ] Announce release (optional)

## 🎯 Quick Reference

```bash
# Complete release process
npm version patch                                    # Bump version
git add CHANGELOG.md                                 # Stage changelog
git commit --amend --no-edit                         # Amend version commit
git tag -a v$(node -p "require('./package.json').version") -m "Release v$(node -p "require('./package.json').version")"
git push --follow-tags                               # Push with tags

# Then create GitHub Release at:
# https://github.com/jterrats/profiler/releases/new
```
