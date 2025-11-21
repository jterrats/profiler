# Changelog

All notable changes to the Profiler plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-01-XX

### Added

#### Core Features
- Initial release of the Profiler plugin for Salesforce CLI
- Command `sf profiler retrieve` to retrieve Profile metadata with dependencies
- Automatic retrieval of all profile dependencies:
  - Apex Classes
  - Custom Applications
  - Custom Objects
  - Custom Permissions
  - Custom Tabs
  - Flows
  - Layouts
  - Profiles

#### Flags and Options
- `--target-org` flag to specify target Salesforce org (required)
- `--all-fields` flag to include Field Level Security in retrieved profiles
- `--api-version` flag to override the API version for metadata operations
- `--json` flag for structured output

#### Smart Features
- Automatic Field Level Security (FLS) removal when `--all-fields` is not specified
- Smart metadata restoration from Git to preserve existing metadata
- Automatic cleanup of temporary files
- Progress logging throughout the operation

#### Developer Experience
- Comprehensive error handling with clear error messages
- Warnings for non-critical operations
- Project validation to ensure command runs in valid Salesforce project
- TypeScript implementation with full type safety

#### Documentation
- Complete README with installation and usage instructions
- USAGE.md with detailed usage guide and best practices
- FEATURES.md documenting all features and comparisons
- Examples directory with:
  - CI/CD bash script example
  - GitHub Actions workflow example
  - Multiple CI/CD platform examples
- Comprehensive inline code documentation

#### Testing
- Unit tests for command functionality
- Integration tests (NUT tests) for end-to-end validation
- Test coverage for critical paths

#### Development Tools
- Configured linting with ESLint
- Code formatting with Prettier
- Git hooks with Husky
- Conventional commits with commitlint
- TypeScript compilation
- Automated build pipeline with wireit

### Changed
- Converted original bash script (`fetchProfiles.sh`) to TypeScript plugin
- Replaced `sfdx` commands with modern `sf` CLI commands
- Improved error handling compared to shell script
- Enhanced logging and user feedback

### Technical Details

#### Dependencies
- `@oclif/core`: ^4 - CLI framework
- `@salesforce/core`: ^8 - Core Salesforce functionality
- `@salesforce/sf-plugins-core`: ^12 - Plugin framework

#### Node.js Support
- Requires Node.js >= 18.0.0
- Tested on Node.js 18.x and 20.x

#### Platform Support
- Windows (native support)
- macOS (native support)
- Linux (native support)

### Migration Guide

For users of the original `fetchProfiles.sh` script:

**Old Command (Shell Script):**
```bash
./fetchProfiles.sh
```

**New Command (Plugin):**
```bash
sf profiler retrieve --target-org your-org
```

**Key Differences:**
1. No need to set `TARGET_ORG` environment variable - use `--target-org` flag
2. FLS control available with `--all-fields` flag
3. API version can be specified with `--api-version` flag
4. JSON output available with `--json` flag
5. Works on all platforms (not just Unix-based systems)

## [0.1.0] - Development

### Added
- Initial project setup
- Basic command structure
- Development environment configuration

---

## Version History

- **1.0.0**: First stable release with full feature set
- **0.1.0**: Development version

## Upgrade Instructions

### From Shell Script to Plugin

1. Install the plugin:
   ```bash
   sf plugins install profiler
   ```

2. Update your scripts:
   ```bash
   # Replace this:
   ./fetchProfiles.sh

   # With this:
   sf profiler retrieve --target-org $TARGET_ORG
   ```

3. Update CI/CD pipelines using the examples in the `examples/` directory

### Future Upgrades

To upgrade to the latest version:
```bash
sf plugins update profiler
```

## Support

For issues, questions, or contributions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/profiler/issues)
- Email: jaime.terrats@example.com

## License

BSD-3-Clause - see [LICENSE](LICENSE.txt) for details

## Contributors

- Jaime Terrats - Initial work and maintenance

## Acknowledgments

- Original shell script served as the foundation for this plugin
- Salesforce CLI team for the plugin framework
- Community feedback and contributions

