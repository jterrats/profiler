---
layout: default
title: Home
---

# ⚡ Profiler - Salesforce CLI Plugin

**🛡️ Safe Profile Management for Legacy Salesforce Environments**

[![npm version](https://img.shields.io/npm/v/@jterrats/profiler.svg?logo=npm)](https://www.npmjs.com/package/@jterrats/profiler)
[![EDD CI Pipeline](https://github.com/jterrats/profiler/actions/workflows/edd-ci.yml/badge.svg)](https://github.com/jterrats/profiler/actions/workflows/edd-ci.yml)
[![License](https://img.shields.io/github/license/jterrats/profiler)](https://raw.githubusercontent.com/jterrats/profiler/main/LICENSE)
[![Node.js Version](https://img.shields.io/node/v/@jterrats/profiler?logo=node.js)](https://nodejs.org)

## 🚀 Beyond Simple Profile Retrieval

**This isn't just another Salesforce CLI plugin.** `@jterrats/profiler` is a comprehensive framework that transforms how you manage Profile metadata in high-debt Salesforce environments.

### 🔒 Safe by Design

**Isolated temporary retrieval** ensures your local code is NEVER touched. Only profiles are modified, ApexClass, CustomObject, Flow, and Layout stay safe.

### ⚡ Performance at Scale

**Parallel processing** with worker pools, metadata caching, and intelligent guardrails. Handle enterprise-scale operations without hitting API limits.

### 🎯 Monadic Architecture

**Result<T, E> + ProfilerMonad** for type-safe, composable operations. Functional programming meets Salesforce CLI.

### 🛡️ Error-Driven Development

**20+ error types** defined and tested BEFORE implementation. 100% coverage on error paths. No surprises in production.

### 🔍 Compare with Confidence

**Line-by-line diff** between local and org profiles. See exactly what changed before deploying.

### 📊 Generate Documentation

**Markdown documentation** from profile XML. Share profile structure with your team in readable format.

**💡 For Enterprise Admins, By Enterprise Admins:** Built by someone who manages hundreds of profiles in high-debt orgs and needed better tooling than Salesforce's native CLI provides.

---

## ⭐ PIONEERING METHODOLOGY

### 🔧 Error-Driven Development (EDD)

Discover how I use **EDD** as the core methodology, complemented by E2E, TDD, and BDD to build better software faster

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0;">
  <div style="text-align: center;">
    <h3 style="font-size: 2.5em; margin: 0;">166</h3>
    <p style="margin: 0; color: #666;">Tests Passing</p>
  </div>
  <div style="text-align: center;">
    <h3 style="font-size: 2.5em; margin: 0;">100%</h3>
    <p style="margin: 0; color: #666;">Error Coverage</p>
  </div>
  <div style="text-align: center;">
    <h3 style="font-size: 2.5em; margin: 0;">20+</h3>
    <p style="margin: 0; color: #666;">Error Types</p>
  </div>
  <div style="text-align: center;">
    <h3 style="font-size: 2.5em; margin: 0;">75%</h3>
    <p style="margin: 0; color: #666;">Code Reduction</p>
  </div>
</div>

[🧪 Explore EDD Methodology →](docs/development/ERROR_DRIVEN_DEVELOPMENT)

💡 **"Define errors first. Write tests. Then build features. Your code will be bulletproof."**

---

## ✨ Key Features

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0;">

<div>
  <h4>🔒 Safe Retrieval</h4>
  <p>Isolated temp project. Only profiles modified. Zero risk of data loss.</p>
</div>

<div>
  <h4>⚡ High Performance</h4>
  <p>Parallel processing, metadata caching, worker pools, and intelligent guardrails.</p>
</div>

<div>
  <h4>🎯 Monadic Operations</h4>
  <p>Type-safe error handling with Result monad and ProfilerMonad composition.</p>
</div>

<div>
  <h4>🔍 Smart Comparison</h4>
  <p>Line-by-line diff between local and org profiles with color-coded output.</p>
</div>

<div>
  <h4>📊 Auto Documentation</h4>
  <p>Generate markdown docs from profile XML for easy team sharing.</p>
</div>

<div>
  <h4>🛡️ Managed Package Filtering</h4>
  <p>Exclude managed package metadata with <code>--exclude-managed</code> flag.</p>
</div>

</div>

---

## 🚀 Quick Start

**Install the plugin to your Salesforce CLI with one command:**

### ⚡ Install Now

```bash
sf plugins install @jterrats/profiler@latest
```

**One-command installation to Salesforce CLI**

### 👨‍💻 For Contributors & Developers

If you want to contribute to the project or customize it locally, follow these steps:

#### Prerequisites

- Salesforce CLI (latest)
- Node.js 24+
- Git

#### Installation Steps

```bash
# Clone repository
git clone https://github.com/jterrats/profiler.git
cd profiler

# Install dependencies
yarn install

# Build
yarn build

# Link to SF CLI
sf plugins link

# Run tests
yarn test
```

---

## 💡 Why Profiler?

### ⚠️ The Problem

**Native Salesforce CLI limitations:**

- 🚫 Overwrites ALL local metadata when retrieving
- 🚫 No built-in profile comparison
- 🚫 No documentation generation
- 🚫 Risk of losing uncommitted changes
- 🚫 No managed package filtering

### ✅ The Solution

**Profiler provides:**

- ✅ **Isolated retrieval** - Only profiles modified
- ✅ **Smart comparison** - Line-by-line diff
- ✅ **Auto documentation** - Markdown generation
- ✅ **Zero data loss** - Your code stays safe
- ✅ **Managed package filtering** - Avoid errors

---

## 🎯 Use Cases

### 🏢 Enterprise Organizations

**Managing hundreds of profiles** in orgs with significant technical debt

- Safely retrieve profiles without touching other metadata
- Compare changes before deployment
- Document security model for compliance
- Filter out managed package noise

### 👨‍💻 Salesforce Developers

**Working with profile-heavy projects** while migrating to Permission Sets

- Bridge tool for legacy profile management
- Safe operations during migration period
- Clear documentation for stakeholders
- Performance optimization for large orgs

### 🔧 DevOps Teams

**Automating profile deployment** in CI/CD pipelines

- Safe, non-destructive operations
- JSON output for automation
- Error-driven design for reliability
- Comprehensive error handling

---

## 📚 Documentation

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">

<div style="padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
  <h4>📖 User Guide</h4>
  <p><a href="docs/user-guide/quick-start">Quick Start →</a></p>
</div>

<div style="padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
  <h4>🛡️ Safety Guide</h4>
  <p><a href="docs/user-guide/SAFETY">Security Guarantees →</a></p>
</div>

<div style="padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
  <h4>⚡ Performance</h4>
  <p><a href="docs/PERFORMANCE">Optimization Guide →</a></p>
</div>

<div style="padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
  <h4>🔧 EDD Methodology</h4>
  <p><a href="docs/development/ERROR_DRIVEN_DEVELOPMENT">Learn EDD →</a></p>
</div>

</div>

---

## 🎬 Command Examples

### Retrieve Profiles

```bash
# Retrieve all profiles (FLS removed)
sf profiler retrieve --target-org myOrg

# Retrieve specific profile with FLS
sf profiler retrieve --target-org myOrg --name Admin --all-fields

# Fast retrieval from local metadata
sf profiler retrieve --target-org myOrg --from-project

# Exclude managed packages
sf profiler retrieve --target-org myOrg --exclude-managed

# Performance tuning
sf profiler retrieve --target-org myOrg --max-profiles 100 --verbose-performance
```

### Compare Profiles

```bash
# Compare specific profile
sf profiler compare --target-org myOrg --name "Admin"

# Compare all local profiles
sf profiler compare --target-org myOrg

# With performance metrics
sf profiler compare --target-org myOrg --verbose-performance
```

### Generate Documentation

```bash
# Generate docs for all profiles
sf profiler docs

# Specific profile
sf profiler docs --name Admin

# Custom output directory
sf profiler docs --output-dir docs/profiles --exclude-managed
```

---

## 🔐 Safety Guarantees

### What's Modified

<div style="background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 10px 0;">
  <strong>✅ ONLY profiles are modified:</strong>
  <ul style="margin: 5px 0;">
    <li><code>force-app/main/default/profiles/*.profile-meta.xml</code></li>
  </ul>
</div>

### What's NEVER Modified

<div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 10px 0;">
  <strong>🛡️ Everything else stays safe:</strong>
  <ul style="margin: 5px 0;">
    <li>✅ Apex classes (.cls, .trigger)</li>
    <li>✅ Custom objects (.object-meta.xml)</li>
    <li>✅ Flows (.flow-meta.xml)</li>
    <li>✅ Layouts (.layout-meta.xml)</li>
    <li>✅ Any other metadata</li>
  </ul>
</div>

### How We Guarantee It

1. **Isolated Execution**: Retrieve runs in temporary SFDX project (NOT your project)
2. **Selective Copy**: Only profiles copied from temp to your project
3. **100% Validated**: 12 E2E tests verify metadata isolation
4. **Canary Files**: DummyTest.cls and DummyObject\_\_c detect violations

[📖 Read Full Safety Documentation →](docs/user-guide/SAFETY)

---

## 🏗️ Architecture

### Monadic Operations

```typescript
// Type-safe, composable error handling
const result = await retrieveProfiles(input)
  .chain(validateProfiles)
  .chain(removeFieldLevelSecurity)
  .recover(handleError)
  .run();

if (result.isSuccess()) {
  // Handle success
} else {
  // Handle error with full type information
}
```

### Performance System

- **Worker Pool**: Parallel operations with p-limit
- **Metadata Cache**: Singleton cache for API responses
- **Guardrails**: Configurable limits with warnings
- **Circuit Breaker**: Prevent cascading failures
- **Rate Limiter**: Respect Salesforce API limits

[📖 Performance Documentation →](docs/PERFORMANCE)

---

## 🆚 Comparison

### vs Native Salesforce CLI

| Feature                   | Native `sf` CLI   | `@jterrats/profiler` |
| ------------------------- | ----------------- | -------------------- |
| **Safe Retrieval**        | ⚠️ Overwrites all | ✅ Only profiles     |
| **Profile Comparison**    | ❌ No             | ✅ Yes               |
| **Documentation Gen**     | ❌ No             | ✅ Yes               |
| **Managed Pkg Filtering** | ❌ No             | ✅ Yes               |
| **Performance Tuning**    | ❌ No             | ✅ Yes               |
| **Error-Driven**          | ❌ No             | ✅ Yes               |
| **Type-Safe**             | ⚠️ Partial        | ✅ Full              |
| **Data Loss Risk**        | ⚠️ Medium         | ✅ Zero              |

---

## 📦 Latest Release

### v2.3.0 - Critical Security Release

🔴 **CRITICAL FIX**: Fixed bug where retrieve was overwriting ALL local metadata

[📋 View Release Notes →](https://github.com/jterrats/profiler/releases/tag/v2.3.0)
[📜 Full Changelog →](CHANGELOG)

---

## ⚙️ Configuration Flags

### Core Flags

| Flag                | Description                                 |
| ------------------- | ------------------------------------------- |
| `--target-org`      | Target Salesforce org (required)            |
| `--name`            | Specific profile name(s) to process         |
| `--api-version`     | Override API version                        |
| `--exclude-managed` | Filter out managed package metadata         |
| `--all-fields`      | Keep field-level security (FLS) in profiles |
| `--from-project`    | Build package.xml from local files (faster) |

### Performance Flags

| Flag                    | Description                                |
| ----------------------- | ------------------------------------------ |
| `--verbose-performance` | Show detailed performance metrics          |
| `--max-profiles`        | Max profiles per operation (default: 50)   |
| `--max-api-calls`       | Max API calls per minute (default: 100)    |
| `--max-memory`          | Max memory usage in MB (default: 512)      |
| `--operation-timeout`   | Timeout in ms (default: 300000)            |
| `--concurrent-workers`  | Number of parallel workers (auto-detected) |

[📖 Full Flag Documentation →](docs/user-guide/usage)

---

## 🧪 Tested & Reliable

### Comprehensive Test Suite

- **166 Unit Tests** - All operations and error paths
- **12 E2E Tests** - All flags and combinations
- **100% Safety Validation** - Metadata isolation guaranteed
- **Cross-Platform** - Linux, Windows, macOS
- **Multi-Node** - Tested on Node 20, 22, 24, 25

### Error-Driven Coverage

- ✅ 20+ error types defined
- ✅ All error paths tested
- ✅ Integration tests for workflows
- ✅ Performance tests for scale

[🧪 Testing Documentation →](docs/development/testing-and-publishing)

---

## Ready to Get Started?

<div style="text-align: center; margin: 40px 0;">
  <a href="https://www.npmjs.com/package/@jterrats/profiler" style="display: inline-block; padding: 15px 30px; background: #0070d2; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px;">
    📦 View on npm
  </a>
  <a href="https://github.com/jterrats/profiler" style="display: inline-block; padding: 15px 30px; background: #24292e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px;">
    💻 View on GitHub
  </a>
  <a href="docs/user-guide/quick-start" style="display: inline-block; padding: 15px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px;">
    🚀 Quick Start Guide
  </a>
</div>

---

## ⚠️ Important Context: Profiles vs Permission Sets

Yes, I'm fully aware of the current Salesforce best practice that recommends migrating away from using Profiles to manage Field-Level Security (FLS) and other permissions, favoring **Permission Sets (PS)** and **Permission Set Groups (PSG)** instead.

However, this tool has been developed specifically for environments with significant **Technical Debt** and strong legacy dependencies on Profiles.

For many enterprise organizations, **Profiles remain the cornerstone of security configuration**. While teams are actively working on reducing their reliance on them—treating Profiles as read-only or touching them as little as possible—the need for robust tooling to manage and accurately retrieve these legacy assets remains critical.

**`sf profiler` is the necessary bridge** to stabilize existing profile configurations in high-debt orgs while long-term migration strategies are executed.

---

## 🎯 Installation

### Option 1: Install from npm (Recommended)

```bash
# Install latest version
sf plugins install @jterrats/profiler

# Install specific version
sf plugins install @jterrats/profiler@2.3.0

# Update existing installation
sf plugins update
```

### Option 2: Install from Source

```bash
# Clone and link for development
git clone https://github.com/jterrats/profiler.git
cd profiler
yarn install
yarn build
sf plugins link
```

### Verify Installation

```bash
sf profiler --help
```

---

## 📖 Command Reference

### `sf profiler retrieve`

Retrieve Profile metadata with all required dependencies to an isolated temp directory, then copy only profiles to your project.

**🔒 Safety**: Uses isolated temporary SFDX project. Only profiles are copied to your local project. Other metadata NEVER modified.

```bash
# Basic usage
sf profiler retrieve --target-org myOrg

# With all options
sf profiler retrieve \
  --target-org myOrg \
  --name "Admin,Sales" \
  --all-fields \
  --exclude-managed \
  --from-project \
  --verbose-performance
```

[📖 Full Documentation →](docs/user-guide/usage#sf-profiler-retrieve)

---

### `sf profiler compare`

Compare local Profile metadata with org version. Shows line-by-line differences.

**🔒 Safety**: Read-only operation. NEVER modifies any files.

```bash
# Compare specific profile
sf profiler compare --target-org myOrg --name Admin

# Compare all profiles
sf profiler compare --target-org myOrg

# With performance metrics
sf profiler compare --target-org myOrg --verbose-performance
```

[📖 Full Documentation →](docs/user-guide/compare-command)

---

### `sf profiler docs`

Generate comprehensive markdown documentation from Profile XML.

**🔒 Safety**: Only creates new files in output directory. No modifications to existing files.

```bash
# Generate docs for all profiles
sf profiler docs

# Specific profile
sf profiler docs --name Admin --output-dir docs/profiles

# Exclude managed packages
sf profiler docs --exclude-managed
```

[📖 Full Documentation →](docs/user-guide/docs-command)

---

## 🔥 What's New in v2.3.0

### 🔴 Critical Security Fix

Fixed critical bug where `retrieve` was overwriting ALL local metadata (ApexClass, CustomObject, Flow, Layout, etc.), not just profiles.

**Impact**: Could cause loss of uncommitted local changes

**Solution**:

- Now executes retrieve in isolated temporary SFDX project
- Only copies profiles to your project
- 100% guaranteed safety

### ✅ Enhancements

- **E2E Tests**: Added Test 2.5 for `--all-fields` validation
- **Safety Coverage**: 100% validation in all 12 tests
- **Canary Files**: DummyTest.cls and DummyObject\_\_c detect violations
- **Documentation**: Complete rewrite of SAFETY.md

[📋 Full Changelog →](CHANGELOG)

---

## 🏆 Built with Best Practices

### Error-Driven Development (EDD)

- ✅ Errors defined BEFORE features
- ✅ 100% error path coverage
- ✅ Type-safe error handling
- ✅ No surprises in production

### Functional Programming

- ✅ Result<T, E> monad
- ✅ ProfilerMonad composition
- ✅ Pure functions
- ✅ No side effects in core logic

### Modern TypeScript

- ✅ Strict mode enabled
- ✅ Full type safety
- ✅ ESM modules
- ✅ Latest oclif framework

### CI/CD Excellence

- ✅ Automated testing (Linux + Windows)
- ✅ Multi-version Node.js support
- ✅ Automated npm publishing
- ✅ GitHub release automation

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Read our [Contributing Guide](docs/development/contributing)
2. Check [Open Issues](https://github.com/jterrats/profiler/issues)
3. Review [Code Standards](CODE_STANDARDS)
4. Learn about [EDD Methodology](docs/development/ERROR_DRIVEN_DEVELOPMENT)

[📖 Full Contributing Guide →](docs/development/contributing)

---

## 📊 Project Stats

- **Language**: TypeScript
- **Framework**: oclif
- **Tests**: 166 passing
- **Coverage**: 100% error paths
- **License**: MIT
- **Node.js**: 20+ (tested on 20, 22, 24, 25)

---

## 🔗 Links

- **npm Package**: [npmjs.com/package/@jterrats/profiler](https://www.npmjs.com/package/@jterrats/profiler)
- **GitHub Repo**: [github.com/jterrats/profiler](https://github.com/jterrats/profiler)
- **Issues**: [github.com/jterrats/profiler/issues](https://github.com/jterrats/profiler/issues)
- **Releases**: [github.com/jterrats/profiler/releases](https://github.com/jterrats/profiler/releases)
- **Documentation**: [jterrats.github.io/profiler](https://jterrats.github.io/profiler)

---

## 💬 Support

Need help? Have questions?

- 📧 **Email**: jterrats@salesforce.com
- 💬 **GitHub Issues**: [Open an Issue](https://github.com/jterrats/profiler/issues/new)
- 📖 **Documentation**: [docs/](docs/)

---

<div style="text-align: center; padding: 40px 0; border-top: 2px solid #eee; margin-top: 40px;">
  <p style="font-size: 1.2em;">Built with ❤️ by <strong>Jaime Terrats</strong></p>
  <p style="color: #666;">Licensed under MIT | © 2024-2025</p>
  <p style="margin-top: 20px;">
    <a href="https://github.com/jterrats">GitHub</a> •
    <a href="https://www.linkedin.com/in/jaimeterrats">LinkedIn</a> •
    <a href="https://jterrats.github.io">Portfolio</a>
  </p>
</div>
