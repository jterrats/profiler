# GitHub Actions - Testing Workflow

## Overview

This repository uses GitHub Actions for automated testing on every push to the `main` branch (trunk-based development).

## Workflow: Test Plugin on Push

**File**: `.github/workflows/test-on-push.yml`

**Trigger**: Push to `main` branch (excluding documentation changes)

### Jobs

#### 1. 🧪 **test**
Runs unit tests across multiple environments.

**Matrix**:
- OS: Ubuntu, macOS, Windows
- Node.js: 18.x, 20.x

**Steps**:
- Checkout code
- Setup Node.js
- Install dependencies
- Compile TypeScript
- Run linting
- Run unit tests
- Verify compilation output

#### 2. 🔗 **test-plugin-linking**
Tests plugin installation and SF CLI integration.

**Steps**:
- Install Salesforce CLI
- Build plugin
- Link plugin to SF CLI
- Verify plugin is available
- Test help commands
- Unlink plugin

#### 3. 📊 **code-quality**
Performs code quality checks.

**Steps**:
- TypeScript type checking
- Linting
- TODO/FIXME detection
- File size analysis

#### 4. 🔒 **security-check**
Runs security audits.

**Steps**:
- Dependency security audit
- Check for outdated packages

#### 5. 📋 **build-summary**
Generates a summary of all checks.

**Displays**:
- Test results
- Plugin linking results
- Code quality results
- Overall status

---

## Trunk-Based Development

This repository uses **trunk-based development**:

- ✅ Single main branch (`main`)
- ✅ All changes pushed directly to `main`
- ✅ No long-lived feature branches
- ✅ Tests run on every push
- ✅ Keep commits small and atomic

### Best Practices

1. **Push frequently** - Small, incremental changes
2. **Ensure tests pass** - Always run `yarn test` before pushing
3. **Keep main stable** - Don't push broken code
4. **Fix forward** - If something breaks, fix it with another push

---

## Local Testing Before Push

Always test locally before pushing:

```bash
# Build and test
yarn build
yarn test
yarn lint

# Or use the helper script
./scripts/link-plugin.sh test
```

---

## Monitoring Builds

### Check Build Status

After pushing, check the build:

1. Go to: https://github.com/yourusername/profiler/actions
2. Find your commit
3. Watch the tests run in real-time

### Build Badge

The README includes a build status badge:

```markdown
[![Test Status](https://github.com/yourusername/profiler/workflows/Test%20Plugin%20on%20Push/badge.svg)](https://github.com/yourusername/profiler/actions)
```

---

## What Gets Tested

### ✅ Compilation
- TypeScript compiles without errors
- All declaration files generated
- Source maps created

### ✅ Tests
- All unit tests pass
- Test coverage maintained
- No test regressions

### ✅ Linting
- ESLint rules pass
- Code style consistent
- No linting errors

### ✅ Plugin Installation
- SF CLI can link the plugin
- Help commands work
- Commands are discoverable

### ✅ Cross-Platform
- Works on Linux (Ubuntu)
- Works on macOS
- Works on Windows

### ✅ Multi-Version
- Works with Node.js 18.x
- Works with Node.js 20.x

---

## Ignored Files

Tests DON'T run when only these change:
- `**.md` - Markdown documentation
- `docs/**` - Documentation directory
- `examples/**` - Example files
- `LICENSE*` - License files
- `.gitignore`, `.npmignore` - Config files

---

## Troubleshooting

### Build Fails

If the build fails:

1. **Check the logs** in GitHub Actions
2. **Reproduce locally**:
   ```bash
   yarn clean-all
   yarn install
   yarn build
   yarn test
   ```
3. **Fix the issue**
4. **Push the fix**

### Tests Fail on CI but Pass Locally

Possible causes:
- Different Node.js version
- Different OS (Windows line endings, paths)
- Missing dependencies
- Timezone issues

**Debug**:
- Check matrix configuration
- Look for OS-specific code
- Verify path separators

### Action Not Running

Check:
- Push was to `main` branch
- Changes weren't only to ignored files
- Workflow file syntax is correct

---

## Customization

### Add More Tests

Edit `.github/workflows/test-on-push.yml`:

```yaml
- name: Your new test
  run: |
    # Your test commands
```

### Change Node.js Versions

Edit the matrix:

```yaml
strategy:
  matrix:
    node: [18.x, 20.x, 22.x]  # Add more versions
```

### Add More OS

Edit the matrix:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest, macos-13]
```

---

## Workflow Status

Current workflow configuration:
- ✅ Tests on push to `main`
- ✅ Multi-OS support (Linux, macOS, Windows)
- ✅ Multi-Node support (18.x, 20.x)
- ✅ Plugin linking tests
- ✅ Code quality checks
- ✅ Security audits
- ✅ Build summary

---

## Cost

GitHub Actions is free for public repositories:
- Unlimited minutes
- Concurrent jobs
- All features available

For private repositories:
- Free tier: 2,000 minutes/month
- After that: Pay per minute

---

## Next Steps

1. Push code to GitHub
2. Watch first build run
3. Fix any issues that appear
4. Keep pushing to `main`!

---

**Happy Trunk-Based Development!** 🚀

