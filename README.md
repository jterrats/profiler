# Profiler - Salesforce CLI Plugin

[![npm version](https://img.shields.io/badge/npm-2.0.0-blue.svg)](https://www.npmjs.com/package/@jterrats/profiler)
[![Test Status](https://github.com/jterrats/profiler/workflows/Test%20Plugin%20on%20Push/badge.svg)](https://github.com/jterrats/profiler/actions)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/jterrats/profiler/main/LICENSE.txt)
[![Node.js Version](https://img.shields.io/node/v/@jterrats/profiler)](https://nodejs.org)

## About

The Profiler plugin is an essential Salesforce CLI extension engineered to guarantee complete retrieval and comparison of Profile metadata with all required dependencies. This plugin automates profile operations including:

**Supported Operations**:

- 🔄 Retrieve profiles with all dependencies
- 🔍 Compare local vs org profile versions
- 📊 Line-by-line difference analysis

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

- ✅ **Safe retrieval** - Uses temporary directories, never overwrites local changes
- 🔒 Field Level Security (FLS) control
- 🚀 No git operations required
- ⚡ Cross-platform compatibility
- 🔄 Parallel metadata processing
- 🛡️ Comprehensive error handling

## ⚠️ Important Context: Profiles vs Permission Sets

Yes, I'm fully aware of the current Salesforce best practice that recommends migrating away from using Profiles to manage Field-Level Security (FLS) and other permissions, favoring Permission Sets (PS) and Permission Set Groups (PSG) instead.

However, this tool has been developed specifically for environments with significant **Technical Debt** and strong legacy dependencies on Profiles.

For many enterprise organizations, Profiles remain the cornerstone of security configuration. While teams are actively working on reducing their reliance on them—treating Profiles as read-only or touching them as little as possible—the need for robust tooling to manage and accurately retrieve these legacy assets remains critical.

**`sf profiler` is the necessary bridge** to stabilize existing profile configurations in high-debt orgs while long-term migration strategies are executed.

## 📚 Documentation

Complete documentation is available in the [`docs/`](docs/) directory:

- **[Quick Start Guide](docs/user-guide/quick-start.md)** - Get started in 5 minutes
- **[Usage Guide](docs/user-guide/usage.md)** - Complete command documentation
- **[Developer Guide](docs/development/testing-and-publishing.md)** - Local testing and publishing
- **[Contributing](CONTRIBUTING.md)** - How to contribute
- **[Full Documentation Index](docs/README.md)** - Complete documentation map

### Quick Links

- [Installation Guide](docs/user-guide/quick-start.md#1-build--link-the-plugin)
- [Command Examples](docs/user-guide/usage.md#examples)
- [Testing Locally](docs/development/testing-and-publishing.md#-local-testing-before-publishing)
- [Publishing to npm](docs/development/testing-and-publishing.md#-publishing-to-npm)

## Install

```bash
# Install latest version
sf plugins install @jterrats/profiler

# Or install a specific version
sf plugins install @jterrats/profiler@2.0.0
```

## Issues

Please report any issues at https://github.com/jterrats/profiler/issues

## Contributing

Contributions are welcome! Please follow these steps:

1. **Read the [Code of Conduct](CODE_OF_CONDUCT.md)**
2. **Create an issue** before starting work to discuss your proposed changes
3. **Fork this repository**
4. **Create a feature branch** from `main`
5. **Make your changes** with appropriate tests (aim for 95% code coverage)
6. **Ensure all tests pass**: `yarn test`
7. **Ensure linting passes**: `yarn lint`
8. **Submit a pull request** with a clear description of your changes

For detailed development instructions, see [CONTRIBUTING.md](CONTRIBUTING.md)

## Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:jterrats/profiler.git
cd profiler

# Install dependencies and compile
yarn install
yarn build
```

### Local Development

You can link the plugin to your Salesforce CLI for local testing:

```bash
# Link your plugin to the sf CLI
sf plugins link .

# Verify the plugin is linked
sf plugins | grep profiler

# Test commands
sf profiler --help
sf profiler retrieve --help
```

### Running Tests

```bash
# Run all tests with coverage
yarn test

# Run tests only (no coverage)
yarn test:only

# Run linting
yarn lint
```

For more details, see [Testing and Publishing Guide](docs/development/testing-and-publishing.md)

## Commands

<!-- commands -->

- [`sf profiler retrieve`](#sf-profiler-retrieve)
- [`sf profiler compare`](#sf-profiler-compare)
- [`sf profiler docs`](#sf-profiler-docs)

## `sf profiler retrieve`

Retrieve Profile metadata with all required dependencies.

```
USAGE
  $ sf profiler retrieve --target-org <value> [--json] [--all-fields] [--api-version <value>]

FLAGS
  --target-org=<value>     (required) The target org to retrieve profiles from.
  --all-fields             Include Field Level Security (FLS) in the retrieved profiles.
  --api-version=<value>    Override the API version used for metadata operations.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  The profiler retrieve command safely retrieves Profile metadata along with all its dependencies from the target org,
  including Apex Classes, Custom Applications, Custom Objects, Custom Permissions, Custom Tabs, Flows, and Layouts.
  Use the --all-fields flag to include Field Level Security (FLS) permissions.

  IMPORTANT: This command uses a temporary directory for all retrieval operations, ensuring your local uncommitted
  changes are NEVER overwritten. Only profile files are copied to your project - all other metadata remains
  untouched. No git operations are required.

EXAMPLES
  Retrieve profiles with metadata (without FLS):

    $ sf profiler retrieve --target-org myOrg

  Retrieve profiles with all fields including FLS:

    $ sf profiler retrieve --target-org myOrg --all-fields

  Retrieve profiles with a specific API version:

    $ sf profiler retrieve --target-org myOrg --all-fields --api-version 60.0
```

## `sf profiler compare`

Compare local Profile metadata with the version in Salesforce org.

```
USAGE
  $ sf profiler compare --target-org <value> [--json] [-n <value>] [--api-version <value>]

FLAGS
  --target-org=<value>     (required) The target org to compare profiles against.
  -n, --name=<value>       The name of the profile to compare.
  --api-version=<value>    Override the API version used for metadata operations.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  The profiler compare command compares a local profile file with its version in the target org,
  showing the differences line by line. This is useful for identifying what has changed between
  your local version and the org version before committing or deploying changes.

EXAMPLES
  Compare a specific profile:

    $ sf profiler compare --target-org myOrg --name "Admin"

  Compare all profiles:

    $ sf profiler compare --target-org myOrg

  Compare with specific API version:

    $ sf profiler compare --target-org myOrg --name "Sales" --api-version 60.0
```

## `sf profiler docs`

Generate comprehensive documentation for Profile metadata in Markdown format.

```
USAGE
  $ sf profiler docs [--json] [-n <value>] [-d <value>]

FLAGS
  -n, --name=<value>         Name of the profile to generate documentation for.
  -d, --output-dir=<value>   [default: profile-docs] Directory where the documentation files will be created.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  The profiler docs command generates detailed documentation for Salesforce Profile metadata files in Markdown format.
  It creates tables/matrices for all permission types including user permissions, object permissions, field-level
  security, application visibilities, and more.

  Use the --name flag to generate documentation for a specific profile, or omit it to generate documentation for
  all profiles in the project.

  The generated documentation includes:
  - Profile description and metadata
  - User permissions matrix
  - Object permissions (CRUD + View/Modify All)
  - Field-level security (FLS) permissions
  - Application visibilities
  - Apex class accesses
  - Visualforce page accesses
  - Tab visibilities
  - Record type visibilities
  - Layout assignments
  - Summary statistics

EXAMPLES
  Generate documentation for all profiles in the project:

    $ sf profiler docs

  Generate documentation for a specific profile:

    $ sf profiler docs --name Admin

  Generate documentation with a custom output directory:

    $ sf profiler docs --output-dir docs/profiles

  Generate documentation for a specific profile in a custom directory:

    $ sf profiler docs --name "Sales User" --output-dir salesforce-docs
```

<!-- commandsstop -->
