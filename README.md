# Profiler - Salesforce CLI Plugin

[![Test Status](https://github.com/jterrats/profiler/workflows/Test%20Plugin%20on%20Push/badge.svg)](https://github.com/jterrats/profiler/actions)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/jterrats/profiler/main/LICENSE.txt)
[![Node.js Version](https://img.shields.io/node/v/profiler)](https://nodejs.org)

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
- Field Level Security (FLS) control
- Git integration for selective updates
- Cross-platform compatibility
- Parallel metadata processing
- Comprehensive error handling

## Learn about `sf` plugins

Salesforce CLI plugins are based on the [oclif plugin framework](<(https://oclif.io/docs/introduction.html)>). Read the [plugin developer guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_architecture_sf_cli.htm) to learn about Salesforce CLI plugin development.

This repository contains a lot of additional scripts and tools to help with general Salesforce node development and enforce coding standards. You should familiarize yourself with some of the [node developer packages](#tooling) used by Salesforce.

Additionally, there are some additional tests that the Salesforce CLI will enforce if this plugin is ever bundled with the CLI. These test are included by default under the `posttest` script and it is required to keep these tests active in your plugin if you plan to have it bundled.

### Tooling

- [@salesforce/core](https://github.com/forcedotcom/sfdx-core)
- [@salesforce/kit](https://github.com/forcedotcom/kit)
- [@salesforce/sf-plugins-core](https://github.com/salesforcecli/sf-plugins-core)
- [@salesforce/ts-types](https://github.com/forcedotcom/ts-types)
- [@salesforce/ts-sinon](https://github.com/forcedotcom/ts-sinon)
- [@salesforce/dev-config](https://github.com/forcedotcom/dev-config)
- [@salesforce/dev-scripts](https://github.com/forcedotcom/dev-scripts)

### Hooks

For cross clouds commands, e.g. `sf env list`, we utilize [oclif hooks](https://oclif.io/docs/hooks) to get the relevant information from installed plugins.

This plugin includes sample hooks in the [src/hooks directory](src/hooks). You'll just need to add the appropriate logic. You can also delete any of the hooks if they aren't required for your plugin.

# Everything past here is only a suggestion as to what should be in your specific plugin's description

This plugin is bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

We always recommend using the latest version of these commands bundled with the CLI, however, you can install a specific version or tag if needed.

## Install

```bash
sf plugins install profiler@x.y.z
```

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/profiler

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev hello world
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .
# To verify
sf plugins
```

## Commands

<!-- commands -->

- [`sf profiler retrieve`](#sf-profiler-retrieve)
- [`sf profiler compare`](#sf-profiler-compare)

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
  The profiler retrieve command retrieves Profile metadata along with all its dependencies from the target org,
  including Apex Classes, Custom Applications, Custom Objects, Custom Permissions, Custom Tabs, Flows, and Layouts.
  Use the --all-fields flag to include Field Level Security (FLS) permissions.

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

<!-- commandsstop -->
