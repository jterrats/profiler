# Helper Scripts

Quick scripts to facilitate development, testing, and publishing.

## 🔗 link-plugin.sh

Helper script for local testing.

### Usage

```bash
# Link plugin to SF CLI for testing
./scripts/link-plugin.sh link

# Check if plugin is linked
./scripts/link-plugin.sh status

# Rebuild after making changes
./scripts/link-plugin.sh rebuild

# Run tests
./scripts/link-plugin.sh test

# Unlink plugin
./scripts/link-plugin.sh unlink
```

### Workflow

```bash
# 1. Initial setup
./scripts/link-plugin.sh link

# 2. Make code changes
# Edit src/commands/profiler/retrieve.ts

# 3. Rebuild
./scripts/link-plugin.sh rebuild

# 4. Test immediately
sf profiler retrieve --target-org yourOrg -f

# 5. When done
./scripts/link-plugin.sh unlink
```

---

## 🚀 publish-release.sh (RECOMMENDED)

**Automatic publishing via GitHub Release** with npm provenance for supply chain security.

### Usage

```bash
./scripts/publish-release.sh
```

### What it does

1. ✅ Verifies no uncommitted changes
2. ✅ Checks current version from package.json
3. ✅ Creates git tag (e.g., v2.0.0)
4. ✅ Pushes tag to GitHub
5. ✅ Creates GitHub Release
6. ✅ **GitHub Actions automatically publishes to npm with cryptographic signing**

### Prerequisites

- npm token stored in GitHub Secrets as `NPM_TOKEN`
- GitHub CLI (`gh`) installed: `brew install gh`
- GitHub CLI authenticated: `gh auth login`
- Clean working directory
- Version updated in `package.json`

### Benefits

- 🔒 Cryptographic signing with Sigstore (npm provenance)
- 🤖 Fully automated via GitHub Actions
- 📝 Auto-generates release notes from CHANGELOG.md
- ✅ Runs tests before publishing
- 🔐 More secure than local publishing

---

## 📦 publish.sh (LEGACY)

**Manual publishing** - for local testing only.

### Usage

```bash
./scripts/publish.sh
```

### What it does

1. ✅ Runs pre-publish checks
2. ✅ Cleans and rebuilds
3. ✅ Runs tests
4. ✅ Runs linting
5. ✅ Bumps version (patch/minor/major)
6. ✅ Creates git commit and tag
7. ✅ Publishes to npm
8. ✅ Optionally pushes to git

### Prerequisites

- npm account (create at https://www.npmjs.com)
- Logged in: `npm login`
- Clean working directory

⚠️ **Note**: This method does not include npm provenance. Use `publish-release.sh` for production releases.

---

## Quick Reference

### First Time Testing
```bash
# Build and link
./scripts/link-plugin.sh link

# Test
sf profiler retrieve --target-org yourOrg -f
```

### After Making Changes
```bash
# Just rebuild (stay linked)
./scripts/link-plugin.sh rebuild

# Test immediately
sf profiler retrieve --target-org yourOrg
```

### Publishing (Automatic - Recommended)
```bash
# 1. Update version in package.json
# 2. Commit changes
git add .
git commit -m "chore: bump version to 2.0.0"
git push

# 3. Publish via GitHub Release
./scripts/publish-release.sh
```

### Publishing (Manual - Legacy)
```bash
# Interactive publish
./scripts/publish.sh

# Or manual
yarn build
yarn test
npm version patch
npm publish --access public
git push origin main --tags
```

---

## Manual Commands

If you prefer not to use scripts:

### Link Manually
```bash
yarn build
sf plugins link .
sf plugins  # verify
```

### Publish Manually
```bash
# Prepare
yarn clean-all
yarn install
yarn build
yarn test
yarn lint

# Version
npm version patch  # or minor, major

# Publish
npm publish --access public

# Git
git push origin main
git push origin v1.0.1
```

