# 🛠️ Development Guide

Complete guide for developers working on the Profiler Plugin.

---

## 🚀 Quick Start

```bash
# Clone and setup
git clone git@github.com:jterrats/profiler.git
cd profiler
yarn install
yarn build

# Link to SF CLI
sf plugins link .

# Verify installation
sf profiler --help

# Run tests
yarn test
```

---

## 📝 Semantic Commits (RECOMMENDED)

This project uses **Conventional Commits** with Commitizen for consistent commit messages.

### Using Commitizen (Recommended)

```bash
# Stage your changes
git add .

# Use commitizen for guided commit
yarn commit
```

This will launch an interactive prompt:

```
? Select the type of change that you're committing: (Use arrow keys)
❯ feat:     A new feature
  fix:      A bug fix
  docs:     Documentation only changes
  style:    Changes that do not affect the meaning of the code
  refactor: A code change that neither fixes a bug nor adds a feature
  perf:     A code change that improves performance
  test:     Adding missing tests or correcting existing tests
  chore:    Changes to the build process or auxiliary tools
```

### Commit Types

| Type       | Description             | Example                                            |
| ---------- | ----------------------- | -------------------------------------------------- |
| `feat`     | New feature             | `feat(retrieve): add --exclude-managed flag`       |
| `fix`      | Bug fix                 | `fix(compare): handle special characters`          |
| `docs`     | Documentation only      | `docs(readme): update installation guide`          |
| `refactor` | Code refactoring        | `refactor(retrieve): extract temp directory logic` |
| `perf`     | Performance improvement | `perf(retrieve): optimize XML parsing`             |
| `style`    | Code formatting         | `style: fix indentation`                           |
| `test`     | Adding/updating tests   | `test(retrieve): add edge case tests`              |
| `chore`    | Maintenance tasks       | `chore(deps): update dependencies`                 |
| `ci`       | CI/CD changes           | `ci: update GitHub Actions workflow`               |

### Scopes

Common scopes for this project:

- `retrieve` - Retrieve command
- `compare` - Compare command
- `docs` - Documentation command
- `commands` - General commands
- `tests` - Test-related changes
- `ci` - CI/CD changes
- `deps` - Dependencies
- `config` - Configuration files

### Manual Commit (Alternative)

If you prefer manual commits, follow this format:

```bash
git commit -m "feat(retrieve): add --exclude-managed flag

- Filters out managed package metadata
- Prevents errors when packages are uninstalled
- Improves profile deployment reliability"
```

---

## 🏗️ Project Structure

```
profiler/
├── src/
│   ├── commands/
│   │   └── profiler/
│   │       ├── retrieve.ts       # Retrieve command
│   │       ├── compare.ts        # Compare command
│   │       └── docs.ts           # Documentation command
│   └── index.ts                  # Plugin exports
├── test/
│   └── commands/
│       └── profiler/
│           ├── retrieve.test.ts  # Unit tests
│           ├── retrieve.nut.ts   # Integration tests
│           ├── compare.test.ts
│           ├── compare.nut.ts
│           ├── docs.test.ts
│           └── docs.nut.ts
├── messages/
│   ├── profiler.retrieve.md      # Retrieve command messages
│   ├── profiler.compare.md       # Compare command messages
│   └── profiler.docs.md          # Docs command messages
├── docs/
│   ├── user-guide/               # User documentation
│   ├── development/              # Development docs
│   └── project/                  # Project information
├── scripts/
│   ├── e2e-test.sh              # End-to-end testing
│   ├── publish-release.sh        # Release script
│   └── README.md                 # Scripts documentation
└── .github/
    ├── workflows/                # CI/CD workflows
    └── BRANCH_PROTECTION.md      # Branch protection guide
```

---

## 🧪 Testing

### Run All Tests

```bash
yarn test
```

This runs:

1. TypeScript compilation
2. Unit tests
3. Code linting

### Unit Tests Only

```bash
yarn test:only
```

### Integration Tests (NUTs)

```bash
yarn test:nuts
```

**Note**: Integration tests require authenticated SF org.

### End-to-End Tests

```bash
./scripts/e2e-test.sh
```

Validates:

- Profile retrieval with all flags
- Managed package filtering
- XML content validation
- Git safety

### Test Coverage

Target: **95%** minimum coverage

```bash
# View coverage report
yarn test
# Open coverage/index.html in browser
```

---

## 🔨 Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feat/your-feature-name
```

Branch naming conventions:

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `chore/` - Maintenance

### 2. Make Changes

Follow [CODE_STANDARDS.md](CODE_STANDARDS.md) guidelines.

### 3. Test Changes

```bash
# Build
yarn build

# Test
yarn test

# Lint
yarn lint

# Format
yarn format
```

### 4. Commit Changes

```bash
# Using Commitizen (recommended)
yarn commit

# Or manual
git commit -m "feat(retrieve): add new feature"
```

### 5. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Then create a Pull Request on GitHub.

---

## 📦 Building

### Development Build

```bash
yarn build
```

### Clean Build

```bash
yarn clean-all
yarn install
yarn build
```

### Production Build

```bash
yarn prepack
```

This creates the production-ready package in `/lib`.

---

## 🔍 Debugging

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Profiler Retrieve",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/bin/dev.js",
      "args": ["profiler", "retrieve", "--target-org", "myOrg"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug with Node Inspector

```bash
node --inspect-brk ./bin/dev.js profiler retrieve --target-org myOrg
```

Then open `chrome://inspect` in Chrome.

---

## 📚 Documentation

### Update Command Documentation

When modifying commands, update:

1. **Messages**: `messages/profiler.<command>.md`
2. **User Guide**: `docs/user-guide/<command>-command.md`
3. **README**: Update examples if needed
4. **CHANGELOG**: Add entry for changes

### Generate README

```bash
yarn version
```

This auto-generates README from command metadata.

---

## 🚀 Publishing

### Pre-Release Checklist

- [ ] All tests pass
- [ ] Code coverage ≥ 95%
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Branch protection rules reviewed

### Publish Process

1. **Update Version** (following semver):

   ```bash
   # Patch (1.0.0 -> 1.0.1)
   npm version patch

   # Minor (1.0.0 -> 1.1.0)
   npm version minor

   # Major (1.0.0 -> 2.0.0)
   npm version major
   ```

2. **Update CHANGELOG.md** with changes

3. **Create Release**:

   ```bash
   ./scripts/publish-release.sh
   ```

   This will:

   - Create git tag
   - Push to GitHub
   - Create GitHub Release
   - Trigger npm publish via GitHub Actions

### Manual Publish (if needed)

```bash
# Build
yarn prepack

# Login to npm (first time only)
npm login

# Publish
npm publish --access public
```

---

## 🔧 Troubleshooting

### Compilation Errors

```bash
yarn clean-all
yarn install
yarn build
```

### Linting Issues

```bash
yarn lint --fix
yarn format
```

### Test Failures

```bash
# Run specific test
yarn mocha test/commands/profiler/retrieve.test.ts

# Debug test
yarn mocha --inspect-brk test/commands/profiler/retrieve.test.ts
```

### Plugin Not Found

```bash
# Unlink and re-link
sf plugins unlink @jterrats/profiler
sf plugins link .

# Verify
sf plugins | grep profiler
```

### Husky Hooks Failing

```bash
# Skip hooks temporarily (not recommended)
git commit --no-verify -m "message"

# Or fix the issue and commit normally
yarn build && yarn test
git commit -m "message"
```

---

## 📖 Additional Resources

- [CODE_STANDARDS.md](CODE_STANDARDS.md) - Coding standards
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](SECURITY.md) - Security policy
- [.github/BRANCH_PROTECTION.md](.github/BRANCH_PROTECTION.md) - Branch protection

### External Documentation

- [Salesforce CLI Plugin Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/)
- [oclif Framework](https://oclif.io/)
- [Salesforce Core Library](https://forcedotcom.github.io/sfdx-core/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 💬 Getting Help

- **Issues**: [GitHub Issues](https://github.com/jterrats/profiler/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jterrats/profiler/discussions)
- **Email**: jterrats@salesforce.com

---

**Last Updated**: 2024-12-02


