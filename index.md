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

---

## 🚀 Why Profiler?

**This isn't just another Salesforce CLI plugin.** It's a comprehensive framework for managing Profile metadata in high-debt Salesforce environments.

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0;">

<div>
  <h3>🔒 Safe by Design</h3>
  <p>Isolated temporary retrieval. Only profiles modified. Zero risk of data loss.</p>
</div>

<div>
  <h3>⚡ High Performance</h3>
  <p>Parallel processing, metadata caching, worker pools, intelligent guardrails.</p>
</div>

<div>
  <h3>🎯 Type-Safe</h3>
  <p>Monadic architecture with Result&lt;T, E&gt; for bulletproof error handling.</p>
</div>

<div>
  <h3>🔍 Smart Comparison</h3>
  <p>Line-by-line diff between local and org profiles.</p>
</div>

<div>
  <h3>📊 Auto Documentation</h3>
  <p>Generate markdown docs from profile XML.</p>
</div>

<div>
  <h3>🛡️ Error-Driven</h3>
  <p>20+ error types defined and tested before implementation.</p>
</div>

</div>

---

## ⚡ Quick Start

### Install from npm

```bash
sf plugins install @jterrats/profiler@latest
```

### Verify Installation

```bash
sf profiler --help
```

[📖 Full Quick Start Guide →](docs/user-guide/quick-start)

---

## 💡 Key Commands

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
```

[📖 Full Retrieve Documentation →](docs/user-guide/usage#sf-profiler-retrieve)

### Compare Profiles

```bash
# Compare specific profile
sf profiler compare --target-org myOrg --name "Admin"

# Compare all local profiles
sf profiler compare --target-org myOrg
```

[📖 Full Compare Documentation →](docs/user-guide/compare-command)

### Generate Documentation

```bash
# Generate docs for all profiles
sf profiler docs

# Specific profile with custom output
sf profiler docs --name Admin --output-dir docs/profiles
```

[📖 Full Docs Documentation →](docs/user-guide/docs-command)

---

## 🔐 Safety Guarantees

<div style="background: #d4edda; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0;">
  <h3 style="margin-top: 0;">✅ What's Modified</h3>
  <p><strong>ONLY profiles:</strong> <code>force-app/main/default/profiles/*.profile-meta.xml</code></p>
</div>

<div style="background: #fff3cd; padding: 20px; border-left: 4px solid #ffc107; margin: 20px 0;">
  <h3 style="margin-top: 0;">🛡️ What's NEVER Modified</h3>
  <ul style="margin-bottom: 0;">
    <li>✅ Apex classes (.cls, .trigger)</li>
    <li>✅ Custom objects (.object-meta.xml)</li>
    <li>✅ Flows (.flow-meta.xml)</li>
    <li>✅ Layouts, Pages, and all other metadata</li>
  </ul>
</div>

**How?** Retrieve runs in an isolated temporary SFDX project. Only profiles are copied back to your project.

[📖 Read Full Safety Documentation →](docs/user-guide/SAFETY)

---

## 🆚 vs Native Salesforce CLI

| Feature                   | Native `sf` CLI   | `@jterrats/profiler` |
| ------------------------- | ----------------- | -------------------- |
| **Safe Retrieval**        | ⚠️ Overwrites all | ✅ Only profiles     |
| **Profile Comparison**    | ❌ No             | ✅ Yes               |
| **Documentation Gen**     | ❌ No             | ✅ Yes               |
| **Managed Pkg Filtering** | ❌ No             | ✅ Yes               |
| **Performance Tuning**    | ❌ No             | ✅ Yes               |
| **Type-Safe**             | ⚠️ Partial        | ✅ Full              |
| **Data Loss Risk**        | ⚠️ Medium         | ✅ Zero              |

---

## ⭐ Error-Driven Development (EDD)

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; text-align: center;">
  <div>
    <h3 style="font-size: 2.5em; margin: 0;">166</h3>
    <p style="margin: 0; color: #666;">Tests Passing</p>
  </div>
  <div>
    <h3 style="font-size: 2.5em; margin: 0;">100%</h3>
    <p style="margin: 0; color: #666;">Error Coverage</p>
  </div>
  <div>
    <h3 style="font-size: 2.5em; margin: 0;">20+</h3>
    <p style="margin: 0; color: #666;">Error Types</p>
  </div>
  <div>
    <h3 style="font-size: 2.5em; margin: 0;">75%</h3>
    <p style="margin: 0; color: #666;">Code Reduction</p>
  </div>
</div>

💡 **"Define errors first. Write tests. Then build features. Your code will be bulletproof."**

[🧪 Explore EDD Methodology →](docs/development/ERROR_DRIVEN_DEVELOPMENT)

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

[📖 Complete Documentation Index →](docs/)

---

## 🎯 Use Cases

### 🏢 Enterprise Organizations

Managing hundreds of profiles in orgs with significant technical debt.

### 👨‍💻 Salesforce Developers

Working with profile-heavy projects while migrating to Permission Sets.

### 🔧 DevOps Teams

Automating profile deployment in CI/CD pipelines with safe, non-destructive operations.

---

## ⚠️ Important Context: Profiles vs Permission Sets

Yes, I'm aware of Salesforce's best practice to use **Permission Sets** instead of Profiles. However, this tool is specifically designed for environments with **significant Technical Debt** and legacy dependencies on Profiles.

For many enterprise organizations, **Profiles remain critical** during the migration period. **`sf profiler` is the bridge** to stabilize existing profile configurations while long-term migration strategies are executed.

---

## 🔥 Latest Release: v2.3.0

### 🔴 Critical Security Fix

Fixed bug where `retrieve` was overwriting ALL local metadata, not just profiles.

**Solution:** Now executes retrieve in isolated temporary SFDX project. Only copies profiles to your project.

[📋 View Release Notes →](https://github.com/jterrats/profiler/releases/tag/v2.3.0) | [📜 Full Changelog →](CHANGELOG)

---

## 🤝 Contributing

We welcome contributions!

1. Read our [Contributing Guide](docs/development/contributing)
2. Check [Open Issues](https://github.com/jterrats/profiler/issues)
3. Review [Code Standards](CODE_STANDARDS)
4. Learn about [EDD Methodology](docs/development/ERROR_DRIVEN_DEVELOPMENT)

---

## 🔗 Links

- **npm**: [npmjs.com/package/@jterrats/profiler](https://www.npmjs.com/package/@jterrats/profiler)
- **GitHub**: [github.com/jterrats/profiler](https://github.com/jterrats/profiler)
- **Issues**: [github.com/jterrats/profiler/issues](https://github.com/jterrats/profiler/issues)
- **Releases**: [github.com/jterrats/profiler/releases](https://github.com/jterrats/profiler/releases)
- **Documentation**: [jterrats.github.io/profiler](https://jterrats.github.io/profiler)

---

**Built with ❤️ by [Jaime Terrats](https://github.com/jterrats)** | Licensed under MIT | © 2024-2025
