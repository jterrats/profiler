# 🚀 Announcing Profiler Plugin v3.0.0 - The Ultimate Salesforce Profile Migration Tool

Excited to announce the release of **Profiler Plugin v3.0.0** - a major update that transforms how Salesforce admins and developers migrate permissions from Profiles to Permission Sets! 🎉

## ✨ What's New

### 🆕 **New `migrate` Command**
Migrate permissions from Profiles to Permission Sets with unprecedented ease and flexibility:

- **15 Metadata Types Supported**: FLS, Apex, Flows, Tabs, Record Types, Object Access, Connected Apps, Custom Permissions, User Permissions, Visualforce, Custom Metadata Types, External Credentials, Data Spaces, Applications, and Custom Settings
- **6 Output Formats**: Table, JSON, HTML, Markdown, CSV, and YAML - choose the format that works best for your workflow
- **Automatic XML Generation**: Permission Set metadata is automatically generated and written to your project
- **Smart Duplicate Detection**: Prevents adding duplicate permissions when migrating to existing Permission Sets
- **Preview Before Execute**: Use `--dry-run` to preview changes before making them
- **Auto-Open HTML**: HTML previews automatically open in your browser for instant review

### 🏗️ **Architectural Improvements**

- **Filesystem Cache System**: Persistent cache for metadata operations with graceful degradation - never fails due to cache issues
- **New Formatter Architecture**: Centralized formatting logic for consistent output across all commands
- **Enhanced Error Handling**: New error types for better debugging and recovery

### 📊 **Performance**

- **5-second improvement** on repeated metadata operations thanks to the new cache system
- **Graceful degradation** ensures operations never fail due to cache issues

## 🎯 Use Cases

✅ Migrate specific permission types from Profiles to Permission Sets  
✅ Preview migrations before executing  
✅ Export migration previews in multiple formats for documentation  
✅ Automatically generate Permission Set XML metadata  
✅ Compare permissions across multiple Salesforce environments  

## 📦 Installation

```bash
npm install -g @jterrats/profiler
```

## 🚀 Quick Start

```bash
# Preview migration (dry-run)
sf profiler migrate --from Admin --section fls,apex --dry-run

# Migrate to Permission Set
sf profiler migrate --from Admin --section fls,apex --name "Sales_Admin_Permissions" --target-org myOrg

# Export preview as HTML (auto-opens in browser)
sf profiler migrate --from Admin --section fls --dry-run --format html --output-file preview.html
```

## 🧪 Quality Assurance

- **18+ new E2E tests** covering all migration scenarios
- **Comprehensive test coverage** for all 15 metadata types
- **Robust error handling** with graceful degradation

## 🔗 Links

- **GitHub**: [github.com/jterrats/profiler](https://github.com/jterrats/profiler)
- **NPM**: [npmjs.com/package/@jterrats/profiler](https://www.npmjs.com/package/@jterrats/profiler)

## 🙏 Thank You

A huge thank you to everyone who provided feedback and contributed to this release! Your input helped shape this major update.

---

**#Salesforce #SalesforceAdmin #SalesforceDeveloper #DevOps #MetadataManagement #PermissionSets #Profiles #OpenSource**

