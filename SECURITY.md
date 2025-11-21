# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please follow these steps:

### 1. **DO NOT** Create a Public Issue

Please do not create a public GitHub issue for security vulnerabilities.

### 2. Report Privately

Send an email to: **jterrats@example.com** (replace with your actual email)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 3. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity (Critical: 7 days, High: 30 days)

## Security Best Practices for Users

### 1. Keep the Plugin Updated

```bash
sf plugins update
```

### 2. Verify Installation

Only install from official sources:
```bash
sf plugins install @jterrats/profiler
```

### 3. Review Permissions

This plugin requires:
- Read access to Profile metadata
- Write access to local files
- Git operations (for restore functionality)

### 4. Use in Trusted Environments

- Only run in environments you control
- Review code before contributing
- Keep your Salesforce credentials secure

## Known Security Considerations

### Profile Metadata Access

This plugin:
- ✅ Reads Profile metadata from Salesforce orgs
- ✅ Writes to local filesystem only
- ❌ Does NOT send data to external services
- ❌ Does NOT store credentials

### Git Operations

The plugin uses git commands:
- `git checkout` - To restore metadata
- `git clean` - To clean temporary files

**Important**: Always commit your changes before running commands.

### Temporary Files

The plugin creates temporary directories:
- `temp/` - For package.xml generation
- `temp-compare/` - For profile comparison
- `profile-docs/` - For documentation output

These are automatically cleaned up and added to `.gitignore`.

## Dependency Security

We use:
- ✅ **Dependabot** - Automated dependency updates
- ✅ **npm audit** - Regular security audits
- ✅ **Minimal dependencies** - Only trusted Salesforce packages

## Code Signing

Currently, this plugin is **not signed by Salesforce**. When installing, you will see:

```
? profiler isn't signed by Salesforce. Only install 
the plugin if you trust its creator.
```

This is normal for community plugins. To avoid this prompt in the future, you can add the plugin to your allowlist.

## Secure Development Practices

### For Contributors

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Especially user-provided flags
3. **Follow least privilege** - Request minimum permissions
4. **Review dependencies** - Check all npm packages
5. **Write tests** - Include security test cases

### Code Review Checklist

- [ ] No hardcoded credentials
- [ ] Input validation on all user data
- [ ] Safe file operations (no path traversal)
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies are from trusted sources

## Security Updates

Security updates will be:
1. Released as patches
2. Documented in [CHANGELOG.md](CHANGELOG.md)
3. Announced in release notes
4. Tagged with `security` label

## Compliance

This project follows:
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Salesforce Security Guidelines](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_dev2gp_security.htm)

## Resources

- [Report a Security Issue](mailto:jterrats@example.com)
- [npm Audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Dependabot](https://github.com/dependabot)
- [Salesforce CLI Plugin Security](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_generate_policies.htm)

---

**Last Updated**: November 2025

