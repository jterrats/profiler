# Security Guidelines for Profiler Plugin

## Overview

This document outlines security considerations and best practices for developing and maintaining the Profiler plugin.

## Security vs Minification

### Why We Don't Minify

Unlike web applications, CLI plugins should **NOT** be minified because:

1. **Transparency** 🔍
   - Users need to audit the code
   - Stack traces must be readable
   - Debugging requires clear source

2. **npm Handles Compression** 📦
   - Packages are published as `.tgz` (gzipped tarballs)
   - Already compressed during distribution
   - No performance benefit from minification

3. **TypeScript Compilation** ⚙️
   - TypeScript already optimizes the output
   - Generates clean, readable JavaScript
   - Source maps available for debugging

4. **Community Standards** 📏
   - Most Node.js packages are not minified
   - Follows npm ecosystem conventions
   - Easier for contributors

## Actual Security Measures

### 1. Dependency Management 📦

#### Automated Updates
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    schedule:
      interval: "weekly"
```

#### Regular Audits
```bash
# Run locally
npm audit

# Run with fix
npm audit fix

# CI/CD integration
npm audit --audit-level=moderate
```

### 2. Input Validation ✅

Always validate user inputs:

```typescript
// Good ✅
if (!profileName || typeof profileName !== 'string') {
  throw new Error('Invalid profile name');
}

// Bad ❌
const profile = flags.name; // No validation
```

### 3. File System Security 📁

#### Safe Path Operations

```typescript
// Good ✅
import * as path from 'node:path';
const safePath = path.join(this.projectPath, 'profiles', fileName);

// Bad ❌
const unsafePath = `${projectPath}/${userInput}`; // Path traversal risk
```

#### Prevent Path Traversal

```typescript
// Check paths stay within project
const resolved = path.resolve(targetPath);
if (!resolved.startsWith(this.projectPath)) {
  throw new Error('Invalid path');
}
```

### 4. Git Operations Security 🔐

#### Safe Git Commands

```typescript
// Good ✅
await exec('git checkout -- force-app/main/default/profiles/');

// Bad ❌
await exec(`git checkout -- ${userInput}`); // Command injection risk
```

#### Validate Git State

```typescript
// Check for uncommitted changes
const status = await exec('git status --porcelain');
if (status) {
  this.warn('You have uncommitted changes');
}
```

### 5. Secrets Management 🔑

#### Never Commit Secrets

```typescript
// Good ✅
const apiKey = process.env.SALESFORCE_API_KEY;

// Bad ❌
const apiKey = 'hardcoded-key-12345';
```

#### .gitignore Sensitive Files

```.gitignore
.env
.env.local
*.key
*.pem
secrets.json
```

### 6. Error Handling 🚨

#### Don't Leak Sensitive Information

```typescript
// Good ✅
catch (error) {
  this.error('Failed to retrieve profiles');
  this.debug(error.message); // Only in debug mode
}

// Bad ❌
catch (error) {
  this.error(error); // Might leak paths, tokens, etc.
}
```

### 7. Third-Party Dependencies 📚

#### Minimal Dependencies

Current dependencies:
```json
{
  "@oclif/core": "^4",              // CLI framework
  "@salesforce/core": "^8",          // Salesforce utilities
  "@salesforce/sf-plugins-core": "^12", // Plugin base
  "xml2js": "^0.6.2"                // XML parsing
}
```

All from **trusted sources** (Salesforce official + popular library).

#### Verify Before Adding

Before adding a new dependency:
1. Check npm weekly downloads
2. Review GitHub stars/activity
3. Check for known vulnerabilities
4. Review the source code
5. Prefer Salesforce official packages

### 8. Code Signing 📝

#### Current Status
- ❌ Not signed by Salesforce (community plugin)
- ✅ Published under verified npm account
- ✅ GitHub verified commits

#### For Users

When installing:
```bash
sf plugins install @jterrats/profiler
# Warning: Plugin isn't signed by Salesforce
```

This is **normal** for community plugins.

### 9. CI/CD Security 🔄

#### GitHub Actions

```yaml
# Use specific versions, not @latest
- uses: actions/checkout@v4  # ✅ Good
- uses: actions/checkout@latest  # ❌ Bad

# Minimal permissions
permissions:
  contents: read
  pages: write

# No secrets in logs
- run: echo "Token: ***"
  env:
    TOKEN: ${{ secrets.MY_TOKEN }}
```

#### Protected Branches

Configure on GitHub:
- ✅ Require pull request reviews
- ✅ Require status checks
- ✅ No force push
- ✅ No deletion

### 10. Testing Security 🧪

#### Security Test Cases

```typescript
describe('Security', () => {
  it('should prevent path traversal', async () => {
    const result = await ProfilerDocs.run(['--name', '../../../etc/passwd']);
    expect(result).to.throw();
  });

  it('should sanitize file names', async () => {
    const result = await ProfilerDocs.run(['--name', 'profile; rm -rf /']);
    expect(result).to.throw();
  });
});
```

## Publishing Checklist ✅

Before publishing to npm:

### Pre-Publish

- [ ] Run `npm audit` - No high/critical vulnerabilities
- [ ] Update dependencies - All up to date
- [ ] Review CHANGELOG.md - All changes documented
- [ ] Run full test suite - All tests passing
- [ ] Check .npmignore - No sensitive files included
- [ ] Review package.json - Correct version, no secrets
- [ ] Test installation locally - `npm pack` and install

### Publish

```bash
# 1. Version bump
npm version patch|minor|major

# 2. Test the package
npm pack
tar -tzf jterrats-profiler-*.tgz

# 3. Publish (with 2FA)
npm publish --access public --otp=123456

# 4. Tag and push
git push --follow-tags
```

### Post-Publish

- [ ] Test installation - `sf plugins install @jterrats/profiler`
- [ ] Create GitHub release - With changelog
- [ ] Announce - In README, docs
- [ ] Monitor - Watch for issues

## npm Account Security 🔐

### Enable 2FA

```bash
npm profile enable-2fa auth-and-writes
```

### Use Automation Tokens

For CI/CD, use **Automation tokens** (not your password):

```bash
npm token create --read-only  # For reading
npm token create              # For publishing
```

### Review Access

```bash
npm access list packages
npm access list collaborators
```

## Monitoring 📊

### Tools

1. **npm audit** - Vulnerability scanning
2. **Snyk** - Continuous monitoring (optional)
3. **Dependabot** - Automated updates
4. **GitHub Security** - Code scanning

### Regular Reviews

- Weekly: Check Dependabot PRs
- Monthly: Run `npm audit`
- Quarterly: Review all dependencies
- Yearly: Security policy update

## Resources 📚

- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [OWASP Node.js Security](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Salesforce CLI Plugin Security](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_generate_policies.htm)

## Contact

Security concerns? See [SECURITY.md](../../SECURITY.md) for reporting guidelines.

---

**Remember**: Security is not a one-time task, it's an ongoing process! 🔒

