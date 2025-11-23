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

- [`sf profiler compare`](#sf-profiler-compare)
- [`sf profiler docs`](#sf-profiler-docs)
- [`sf profiler retrieve`](#sf-profiler-retrieve)

## `sf profiler compare`

Compare local Profile metadata with the version in Salesforce org.

```
USAGE
  $ sf profiler compare -o <value> [--json] [--flags-dir <value>] [-n <value>] [--api-version <value>]

FLAGS
  -n, --name=<value>         The name of the profile to compare.
  -o, --target-org=<value>   (required) The target org to compare profiles against.
      --api-version=<value>  Override the API version used for metadata operations.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Compare local Profile metadata with the version in Salesforce org.

  The profiler compare command compares a local profile file with its version in the target org, showing the differences
  line by line. This is useful for identifying what has changed between your local version and the org version before
  committing or deploying changes.

EXAMPLES
  Compare a specific profile:

    $ sf profiler compare --target-org myOrg --name "Admin"

  Compare all profiles:

    $ sf profiler compare --target-org myOrg

  Compare with specific API version:

    $ sf profiler compare --target-org myOrg --name "Sales" --api-version 60.0

FLAG DESCRIPTIONS
  -n, --name=<value>  The name of the profile to compare.

    Specify the profile name without the .profile-meta.xml extension. If not provided, all profiles in the local project
    will be compared.

  --api-version=<value>  Override the API version used for metadata operations.

    Specify the API version to use for the comparison. Defaults to the org's API version.
```

## `sf profiler docs`

Generate comprehensive documentation for Profile metadata in Markdown format.

```
USAGE
  $ sf profiler docs [--json] [--flags-dir <value>] [-n <value>] [-d <value>]

FLAGS
  -d, --output-dir=<value>  [default: profile-docs] Directory where the documentation files will be created.
  -n, --name=<value>        Name of the profile to generate documentation for.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate comprehensive documentation for Profile metadata in Markdown format.

  The profiler docs command generates detailed documentation for Salesforce Profile metadata files in Markdown format.
  It creates tables/matrices for all permission types including user permissions, object permissions, field-level
  security, application visibilities, and more.

  Use the --name flag to generate documentation for a specific profile, or omit it to generate documentation for all
  profiles in the project.

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

FLAG DESCRIPTIONS
  -d, --output-dir=<value>  Directory where the documentation files will be created.

    Specify the output directory for the generated Markdown documentation files. Defaults to 'profile-docs' in the
    project root.

  -n, --name=<value>  Name of the profile to generate documentation for.

    Specify the name of a single profile to generate documentation for. If not provided, documentation will be generated
    for all profiles in the project.
```

## `sf profiler retrieve`

Retrieve Profile metadata with all required dependencies.

```
USAGE
  $ sf profiler retrieve -o <value> [--json] [--flags-dir <value>] [-n <value>] [--all-fields] [--api-version <value>]
    [-f]

FLAGS
  -f, --from-project         Use local project metadata to build the package.xml instead of listing from org.
  -n, --name=<value>         The name of a specific profile or comma-separated list of profiles to retrieve.
  -o, --target-org=<value>   (required) The target org to retrieve profiles from.
      --all-fields           Include Field Level Security (FLS) in the retrieved profiles.
      --api-version=<value>  Override the API version used for metadata operations.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Retrieve Profile metadata with all required dependencies.

  The profiler retrieve command safely retrieves Profile metadata along with all its dependencies from the target org,
  including Apex Classes, Custom Applications, Custom Objects, Custom Permissions, Custom Tabs, Flows, and Layouts. Use
  the --all-fields flag to include Field Level Security (FLS) permissions.

  IMPORTANT: This command uses system temporary directories (outside your project) for all retrieval operations,
  ensuring your local uncommitted changes are NEVER overwritten. Only profile files are copied to your project - all
  other metadata remains untouched. No git operations are required and no temporary files are created in your project
  directory.

EXAMPLES
  Retrieve all profiles with metadata (without FLS):

    $ sf profiler retrieve --target-org myOrg

  Retrieve a specific profile:

    $ sf profiler retrieve --target-org myOrg --name Admin

  Retrieve multiple profiles:

    $ sf profiler retrieve --target-org myOrg --name "Admin,Custom Profile,Sales Profile"

  Retrieve all profiles with all fields including FLS:

    $ sf profiler retrieve --target-org myOrg --all-fields

  Retrieve specific profiles with FLS:

    $ sf profiler retrieve --target-org myOrg --name "Admin,Standard User" --all-fields

  Retrieve profiles with a specific API version:

    $ sf profiler retrieve --target-org myOrg --all-fields --api-version 60.0

  Retrieve profiles using local project metadata:

    $ sf profiler retrieve --target-org myOrg --from-project

  Retrieve specific profiles using local metadata:

    $ sf profiler retrieve --target-org myOrg --name "Admin,Sales Profile" --from-project

FLAG DESCRIPTIONS
  -f, --from-project  Use local project metadata to build the package.xml instead of listing from org.

    When enabled, reads metadata component names from the local project directories (classes, objects, flows, etc.) to
    build the package.xml, instead of querying the org. This is faster and useful when you want to retrieve only what
    exists in your project.

  -n, --name=<value>  The name of a specific profile or comma-separated list of profiles to retrieve.

    When specified, only retrieves the named profile(s) instead of all profiles. You can specify a single profile or
    multiple profiles separated by commas. Profile names should match exactly (e.g., "Admin", "Standard User",
    "Admin,Custom Profile,Sales").

  --all-fields  Include Field Level Security (FLS) in the retrieved profiles.

    When enabled, retrieves complete profile metadata including Field Level Security settings for all objects and
    fields.

  --api-version=<value>  Override the API version used for metadata operations.

    Specify the API version to use for the retrieve operation. Defaults to the org's API version.
```

<!-- commandsstop -->
