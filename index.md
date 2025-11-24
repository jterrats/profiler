---
layout: default
title: Home
---

# Profiler - Salesforce CLI Plugin

[![npm version](https://img.shields.io/badge/npm-2.0.2-blue.svg)](https://www.npmjs.com/package/@jterrats/profiler)
[![Test Status](https://github.com/jterrats/profiler/workflows/Test%20Plugin%20on%20Push/badge.svg)](https://github.com/jterrats/profiler/actions)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/jterrats/profiler/main/LICENSE.txt)
[![Node.js Version](https://img.shields.io/node/v/@jterrats/profiler)](https://nodejs.org)

## About

The Profiler plugin is an essential Salesforce CLI extension engineered to guarantee complete retrieval and comparison of Profile metadata with all required dependencies. This plugin automates profile operations including:

**Supported Operations**:

- 🔄 Retrieve profiles with all dependencies
- 🔍 Compare local vs org profile versions
- 📊 Line-by-line difference analysis
- 📄 Generate comprehensive markdown documentation

**Retrieved Metadata Types**:

- Apex Classes
- Custom Applications
- Custom Objects
- Custom Permissions
- Custom Tabs
- Flows
- Layouts
- Profiles

**Key Features**:

- Field Level Security (FLS) control
- Git integration for selective updates
- Cross-platform compatibility
- Parallel metadata processing
- Comprehensive error handling
- Markdown documentation generation

## ⚠️ Important Context: Profiles vs Permission Sets

Yes, I'm fully aware of the current Salesforce best practice that recommends migrating away from using Profiles to manage Field-Level Security (FLS) and other permissions, favoring Permission Sets (PS) and Permission Set Groups (PSG) instead.

However, this tool has been developed specifically for environments with significant **Technical Debt** and strong legacy dependencies on Profiles.

For many enterprise organizations, Profiles remain the cornerstone of security configuration. While teams are actively working on reducing their reliance on them—treating Profiles as read-only or touching them as little as possible—the need for robust tooling to manage and accurately retrieve these legacy assets remains critical.

**`sf profiler` is the necessary bridge** to stabilize existing profile configurations in high-debt orgs while long-term migration strategies are executed.

## 📚 Documentation

Complete documentation is available in the navigation menu above or in the [`docs/`](docs/) directory:

### Quick Links

- **[Quick Start Guide](docs/user-guide/quick-start)** - Get started in 5 minutes
- **[Usage Guide](docs/user-guide/usage)** - Complete command documentation
- **[Compare Command](docs/user-guide/compare-command)** - Profile comparison deep-dive
- **[Docs Command](docs/user-guide/docs-command)** - Generate profile documentation
- **[Developer Guide](docs/development/testing-and-publishing)** - Local testing and publishing
- **[Contributing](CONTRIBUTING)** - How to contribute
- **[Full Documentation Index](docs/)** - Complete documentation map

## Install

```bash
# Install latest version
sf plugins install @jterrats/profiler

# Or install a specific version
sf plugins install @jterrats/profiler@2.0.2
```

## Commands

### `sf profiler retrieve`

Retrieve Profile metadata with all required dependencies.

```bash
# Retrieve profiles without FLS
sf profiler retrieve --target-org myOrg

# Retrieve profiles with all fields including FLS
sf profiler retrieve --target-org myOrg --all-fields

# Use local project metadata for faster retrieval
sf profiler retrieve --target-org myOrg --from-project
```

[Full documentation →](docs/user-guide/usage#sf-profiler-retrieve)

### `sf profiler compare`

Compare local Profile metadata with the version in Salesforce org.

```bash
# Compare a specific profile
sf profiler compare --target-org myOrg --name "Admin"

# Compare all profiles
sf profiler compare --target-org myOrg
```

[Full documentation →](docs/user-guide/compare-command)

### `sf profiler docs`

Generate comprehensive documentation for Profile metadata in Markdown format.

```bash
# Generate docs for all profiles
sf profiler docs

# Generate docs for a specific profile
sf profiler docs --name Admin

# Custom output directory
sf profiler docs --output-dir docs/profiles
```

[Full documentation →](docs/user-guide/docs-command)

## Issues

Please report any issues at [https://github.com/jterrats/profiler/issues](https://github.com/jterrats/profiler/issues)

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT)
2. Create a new issue before starting your project
3. Fork this repository
4. Create a _topic_ branch in your fork
5. Edit the code and write appropriate tests
6. Sign CLA at [https://cla.salesforce.com/sign-cla](https://cla.salesforce.com/sign-cla)
7. Send us a pull request

[Full contributing guide →](CONTRIBUTING)

## License

This project is licensed under the BSD 3-Clause License - see the [LICENSE.txt](LICENSE.txt) file for details.

---

**Documentation Site**: [https://jterrats.github.io/profiler](https://jterrats.github.io/profiler)
**GitHub Repository**: [https://github.com/jterrats/profiler](https://github.com/jterrats/profiler)
**npm Package**: `@jterrats/profiler`
