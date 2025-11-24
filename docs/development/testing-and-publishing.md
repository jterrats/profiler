# Testing and Publishing Guide

## 🧪 Local Testing (Before Publishing)

### Method 1: Link Plugin to SF CLI (Recommended)

This links your local plugin to the Salesforce CLI so you can test it in any project.

#### Step 1: Build the Plugin

```bash
cd /Users/jterrats/dev/profiler
yarn install
yarn build
```

#### Step 2: Link to SF CLI

```bash
sf plugins link .
```

This creates a symlink from SF CLI to your local plugin directory.

#### Step 3: Verify Installation

```bash
# Check plugin is linked
sf plugins

# Should show something like:
# profiler 1.0.0 (link) /Users/jterrats/dev/profiler
```

#### Step 4: Test Commands

```bash
# Test help
sf profiler --help
sf profiler retrieve --help
sf profiler compare --help

# Test actual commands
cd /path/to/your/salesforce/project
sf profiler retrieve --target-org yourOrg --from-project
sf profiler compare --target-org yourOrg --name "Admin"
```

#### Step 5: Make Changes and Rebuild

```bash
# After making code changes
cd /Users/jterrats/dev/profiler
yarn build

# The changes are immediately available (no need to relink)
sf profiler retrieve --target-org yourOrg -f
```

#### Step 6: Unlink When Done Testing

```bash
# To remove the link
sf plugins unlink profiler

# Verify it's gone
sf plugins
```

---

### Method 2: Run with Local Dev Script

Use the local `bin/dev.js` script without linking:

```bash
cd /Users/jterrats/dev/profiler

# Build first
yarn build

# Run commands directly
./bin/dev.js profiler retrieve --help
./bin/dev.js profiler retrieve --target-org yourOrg -f
./bin/dev.js profiler compare --target-org yourOrg
```

**Pros**: No linking needed
**Cons**: Must be in plugin directory to run

---

### Method 3: Test in Another Project

Link and test from a different Salesforce project:

```bash
# In plugin directory
cd /Users/jterrats/dev/profiler
yarn build
sf plugins link .

# Go to test project
cd ~/projects/my-salesforce-project

# Test commands
sf profiler retrieve --target-org myOrg -f
sf profiler compare --target-org myOrg
```

---

## 🚀 Publishing to npm

### Prerequisites

1. **npm Account**

   ```bash
   # Create account at https://www.npmjs.com/signup

   # Login to npm
   npm login
   ```

2. **Update package.json**

   ```bash
   cd /Users/jterrats/dev/profiler
   ```

   Edit `package.json`:

   ```json
   {
     "name": "@jterrats/profiler", // Use scoped package
     "version": "1.0.0",
     "description": "Salesforce CLI plugin for profile management",
     "author": "Jaime Terrats",
     "repository": {
       "type": "git",
       "url": "https://github.com/yourusername/profiler"
     },
     "homepage": "https://github.com/yourusername/profiler",
     "bugs": "https://github.com/yourusername/profiler/issues"
   }
   ```

3. **Add .npmignore** (optional but recommended)

   ```bash
   cat > .npmignore << 'EOF'
   # Source files (only publish compiled)
   src/
   test/

   # Config files
   .eslintrc.cjs
   .eslintignore
   .prettierrc.json
   .mocharc.json
   .nycrc
   tsconfig.json
   commitlint.config.cjs
   .lintstagedrc.cjs

   # Dev dependencies
   .husky/
   .github/
   .vscode/

   # Docs (keep only essential)
   TESTING_AND_PUBLISHING.md
   CONTRIBUTING.md
   ANALYSIS_SUMMARY.md
   ELEMENT_AGGREGATION_ANALYSIS.md
   PROFILE_XML_ELEMENTS.md
   PROJECT_SUMMARY.md
   RESUMEN_COMPARE.md

   # Temporary files
   temp/
   temp-compare/
   *.log
   .DS_Store
   EOF
   ```

---

### Publishing Steps

#### Step 1: Prepare for Publishing

```bash
cd /Users/jterrats/dev/profiler

# Clean and rebuild
yarn clean-all
yarn install
yarn build

# Run tests
yarn test

# Run linting
yarn lint
```

#### Step 2: Update Version (if needed)

```bash
# Bump version (follows semver)
npm version patch   # 1.0.0 -> 1.0.1
# or
npm version minor   # 1.0.0 -> 1.1.0
# or
npm version major   # 1.0.0 -> 2.0.0
```

#### Step 3: Create Git Tag

```bash
git add -A
git commit -m "chore: prepare for release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

#### Step 4: Publish to npm

**Option A: Public Package (Free)**

```bash
# First time publishing
npm publish --access public

# Subsequent publishes
npm publish
```

**Option B: Scoped Package**

```bash
# Publishing scoped package
npm publish --access public
```

**Option C: Private Package** (requires paid npm account)

```bash
npm publish --access restricted
```

---

### Post-Publishing

#### Verify Publication

```bash
# Check on npm
npm view @jterrats/profiler

# Or visit
# https://www.npmjs.com/package/@jterrats/profiler
```

#### Install from npm

```bash
# Users can now install with:
sf plugins install @jterrats/profiler

# Or specific version
sf plugins install @jterrats/profiler@2.0.2
```

---

## 📦 Publishing to GitHub Packages (Alternative)

If you prefer GitHub over npm:

### Step 1: Create .npmrc in project

```bash
cat > .npmrc << 'EOF'
@yourusername:registry=https://npm.pkg.github.com
EOF
```

### Step 2: Update package.json

```json
{
  "name": "@jterrats/profiler",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

### Step 3: Authenticate

```bash
# Create GitHub token with write:packages permission
# https://github.com/settings/tokens

npm login --registry=https://npm.pkg.github.com
```

### Step 4: Publish

```bash
npm publish
```

---

## 🔄 Continuous Deployment (CI/CD)

### GitHub Actions for Auto-Publishing

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: yarn install

      - name: Build
        run: yarn build

      - name: Run tests
        run: yarn test

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Setup**:

1. Create npm token: https://www.npmjs.com/settings/tokens
2. Add to GitHub secrets as `NPM_TOKEN`
3. Create release on GitHub
4. Package auto-publishes!

---

## 🧪 Testing Checklist

Before publishing, test:

### Functionality Tests

- [ ] `sf profiler retrieve --target-org org` works
- [ ] `sf profiler retrieve --target-org org --all-fields` works
- [ ] `sf profiler retrieve --target-org org --from-project` works
- [ ] `sf profiler compare --target-org org` works
- [ ] `sf profiler compare --target-org org --name "Admin"` works
- [ ] All flags work correctly
- [ ] Error messages are clear
- [ ] Help text displays correctly

### Edge Cases

- [ ] Works without profiles in project
- [ ] Handles missing directories gracefully
- [ ] Works with non-existent profile name
- [ ] Handles org authentication errors
- [ ] Cleans up temp files on error

### Cross-Platform

- [ ] Test on macOS
- [ ] Test on Windows (if possible)
- [ ] Test on Linux (if possible)

### Documentation

- [ ] README is accurate
- [ ] Examples work as shown
- [ ] Version number is correct

---

## 📊 Version Management

### Semantic Versioning

Follow semver: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0 -> 2.0.0): Breaking changes

  - Changed command names
  - Removed flags
  - Changed behavior significantly

- **MINOR** (1.0.0 -> 1.1.0): New features (backward compatible)

  - Added new flags
  - Added new commands
  - Enhanced functionality

- **PATCH** (1.0.0 -> 1.0.1): Bug fixes
  - Fixed bugs
  - Improved error messages
  - Updated docs

### Release Process

```bash
# 1. Update CHANGELOG.md
echo "## [1.0.1] - $(date +%Y-%m-%d)
### Fixed
- Fixed issue with temp directory cleanup
" >> CHANGELOG.md

# 2. Commit changes
git add -A
git commit -m "chore: prepare release v1.0.1"

# 3. Bump version
npm version patch

# 4. Push
git push origin main --tags

# 5. Publish
npm publish --access public
```

---

## 🎯 Quick Reference

### Local Testing

```bash
cd /Users/jterrats/dev/profiler
yarn build
sf plugins link .
sf profiler --help
```

### Publishing

```bash
yarn build
yarn test
npm version patch
npm publish --access public
```

### Updating After Changes

```bash
# Local testing
yarn build
# Commands immediately use new code

# Publishing update
npm version patch
npm publish
```

---

## 🐛 Troubleshooting

### "Command not found" after linking

```bash
# Unlink and relink
sf plugins unlink profiler
sf plugins link .

# Or restart terminal
```

### "Module not found" error

```bash
# Rebuild
yarn clean-all
yarn install
yarn build
```

### Publishing fails

```bash
# Check you're logged in
npm whoami

# Check package name is available
npm view @jterrats/profiler
# (should return 404 if available)

# Login again
npm login
```

### Tests fail

```bash
# Clean and rebuild
yarn clean-all
yarn install
yarn build
yarn test
```

---

## ✅ Pre-Publish Checklist

- [ ] Code is working locally
- [ ] All tests pass
- [ ] Linting passes
- [ ] Documentation is updated
- [ ] Version number bumped
- [ ] CHANGELOG.md updated
- [ ] Git committed and tagged
- [ ] Logged into npm
- [ ] Package name is available
- [ ] .npmignore configured
- [ ] README has correct examples

---

## 🎉 After Publishing

### Announce

- Update GitHub README
- Tweet/share on social media
- Post in Salesforce communities
- Update personal website/portfolio

### Monitor

- Watch GitHub issues
- Monitor npm downloads
- Respond to user feedback
- Plan next version

### Maintain

- Fix bugs promptly
- Add requested features
- Keep dependencies updated
- Update for new SF CLI versions

---

**Ready to test and publish!** 🚀
