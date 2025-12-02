# Quick Start Guide - Profiler Plugin

## 🚀 Get Started in 3 Steps

### 1. Build & Link the Plugin

```bash
# Install dependencies and build
yarn install && yarn build

# Link to Salesforce CLI
sf plugins link .
```

### 2. Verify Installation

```bash
# Check if plugin is installed
sf plugins

# View help
sf profiler retrieve --help
```

### 3. Use the Plugin

```bash
# Retrieve profiles (without FLS)
sf profiler retrieve --target-org myOrg

# Retrieve with Field Level Security
sf profiler retrieve --target-org myOrg --all-fields

# Retrieve excluding managed packages
sf profiler retrieve --target-org myOrg --exclude-managed

# Compare a specific profile
sf profiler compare --target-org myOrg --name "Admin"

# Compare all profiles
sf profiler compare --target-org myOrg

# Generate documentation
sf profiler docs
```

## ⚡ Common Commands

```bash
# Plugin Commands
sf profiler retrieve --target-org myOrg                    # Retrieve profiles
sf profiler retrieve --target-org myOrg --all-fields       # Retrieve with FLS
sf profiler retrieve --target-org myOrg --exclude-managed  # Exclude managed packages
sf profiler compare --target-org myOrg --name Admin        # Compare specific profile
sf profiler compare --target-org myOrg                     # Compare all profiles
sf profiler docs                                           # Generate documentation
sf profiler docs --exclude-managed                         # Docs without managed packages

# Development
yarn build              # Compile TypeScript
yarn test              # Run tests
yarn lint              # Check code style
yarn format            # Fix code style

# Plugin Management
sf plugins link .      # Link for development
sf plugins unlink .    # Unlink plugin
sf plugins             # List installed plugins
```

## 📋 Command Syntax

### Retrieve Command
```bash
sf profiler retrieve --target-org <org-alias> [flags]
```

**Required Flags:**
- `--target-org` - Org alias or username

**Optional Flags:**
- `--all-fields` - Include Field Level Security
- `--exclude-managed` - Exclude managed package components
- `--api-version` - Specify API version
- `--json` - Output in JSON format

### Compare Command
```bash
sf profiler compare --target-org <org-alias> [flags]
```

**Required Flags:**
- `--target-org` - Org alias or username

**Optional Flags:**
- `-n, --name` - Profile name to compare
- `--api-version` - Specify API version
- `--json` - Output in JSON format

## 📦 What Gets Retrieved

The plugin retrieves:
- ✅ Profiles
- ✅ Apex Classes
- ✅ Apex Pages (Visualforce)
- ✅ Connected Apps
- ✅ Custom Applications
- ✅ Custom Objects (includes RecordTypes)
- ✅ Custom Permissions
- ✅ Custom Tabs
- ✅ Flows
- ✅ Layouts

## 🎯 Use Cases

### Scenario 1: Daily Development
```bash
# Retrieve profiles without FLS (cleaner)
sf profiler retrieve --target-org dev-sandbox
```

### Scenario 2: Complete Sync
```bash
# Retrieve everything including FLS
sf profiler retrieve --target-org integration --all-fields
```

### Scenario 3: Automation/CI/CD
```bash
# Get JSON output for parsing
sf profiler retrieve --target-org qa-org --json | jq '.result'
```

## 🐛 Troubleshooting

### Plugin not found?
```bash
sf plugins link .
```

### Compilation errors?
```bash
yarn clean-all && yarn install && yarn build
```

### Tests failing?
```bash
yarn build && yarn test
```

### Need to authenticate?
```bash
sf org login web --alias myOrg
```

## 📚 Learn More

- **Full Documentation**: See `README.md`
- **Detailed Usage**: See `USAGE.md`
- **Features**: See `FEATURES.md`
- **Examples**: See `examples/` directory
- **Contributing**: See `CONTRIBUTING.md`

## 🔥 Quick Tips

1. **Always use `--target-org`** - No default org support
2. **Skip FLS by default** - Cleaner profiles, use `--all-fields` only when needed
3. **Use `--json` for automation** - Easier to parse in scripts
4. **Review changes** - Always check `git diff` before committing
5. **Test in sandbox** - Never test directly in production

## 🎉 You're Ready!

The plugin is now set up and ready to use. Start retrieving your profiles:

```bash
sf profiler retrieve --target-org your-org-alias
```

---

**Need Help?** Check the full documentation in the `/docs` directory or open an issue on GitHub.

