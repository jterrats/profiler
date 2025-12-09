# Documentation Structure

## 📂 Organization

The documentation is organized into four main categories:

```
docs/
├── README.md                    # Main documentation index
├── STRUCTURE.md                 # This file
│
├── user-guide/                  # For plugin users
│   ├── quick-start.md           # Getting started (5 min)
│   ├── usage.md                 # Complete usage guide
│   └── compare-command.md       # Compare command details
│
├── development/                 # For developers/contributors
│   ├── contributing.md          # Contribution guidelines
│   ├── testing-and-publishing.md # Local testing & npm publishing
│   ├── push-to-github.md        # GitHub repository setup
│   └── github-actions.md        # CI/CD workflow docs
│
├── technical/                   # Technical analysis & reference
│   ├── profile-xml-elements.md  # 15 XML element types reference
│   ├── element-aggregation-analysis.md # Aggregation strategies
│   └── analysis-summary.md      # Technical analysis summary
│
└── project/                     # Project information
    ├── features.md              # Complete feature list
    ├── changelog.md             # Version history
    ├── project-summary.md       # Project overview
    ├── summary.md               # Final summary
    └── resumen-compare.md       # Compare summary (Spanish)
```

---

## 📄 Files in Root

Some documentation files remain in the root for GitHub conventions:

- `README.md` - Main project README (entry point)
- `CONTRIBUTING.md` - GitHub standard location
- `CHANGELOG.md` - GitHub standard location
- `LICENSE` - MIT License file

---

## 🗂️ Category Details

### 👥 User Guide (`user-guide/`)

**Audience**: Plugin users, Salesforce admins, developers using the plugin

**Purpose**: Learn how to use the plugin

**Files**:

- **quick-start.md** - Installation and first commands (5-10 min read)
- **usage.md** - Complete command documentation with examples
- **compare-command.md** - Detailed compare command guide (use cases, examples)

**Start here**: [Quick Start Guide](user-guide/quick-start.md)

---

### 💻 Development (`development/`)

**Audience**: Contributors, developers extending the plugin

**Purpose**: Development setup, testing, and publishing

**Files**:

- **contributing.md** - How to contribute (also in root for GitHub)
- **testing-and-publishing.md** - Local testing and npm publishing guide
- **push-to-github.md** - GitHub repository setup instructions
- **github-actions.md** - CI/CD workflow documentation

**Start here**: [Testing & Publishing Guide](development/testing-and-publishing.md)

---

### 🔧 Technical (`technical/`)

**Audience**: Technical users, architects, advanced developers

**Purpose**: Deep technical analysis and reference

**Files**:

- **profile-xml-elements.md** - Complete reference of 15 profile XML element types
- **element-aggregation-analysis.md** - Analysis of which elements to aggregate/sum
- **analysis-summary.md** - Executive technical summary

**Start here**: [Profile XML Elements](technical/profile-xml-elements.md)

---

### 📋 Project (`project/`)

**Audience**: Everyone - project overview and history

**Purpose**: Project information, features, and history

**Files**:

- **features.md** - Complete feature list and comparisons
- **changelog.md** - Version history (also in root)
- **project-summary.md** - Complete project overview
- **summary.md** - Final project summary
- **resumen-compare.md** - Compare command summary in Spanish

**Start here**: [Features Documentation](project/features.md)

---

## 🎯 Finding Documentation

### By Role

**I'm a Plugin User**:

1. Start: [Quick Start](user-guide/quick-start.md)
2. Learn: [Usage Guide](user-guide/usage.md)
3. Deep Dive: [Compare Command](user-guide/compare-command.md)

**I'm a Developer**:

1. Setup: [Testing & Publishing](development/testing-and-publishing.md)
2. Contribute: [Contributing Guide](development/contributing.md)
3. Deploy: [Push to GitHub](development/push-to-github.md)

**I'm Researching**:

1. Overview: [Features](project/features.md)
2. Technical: [XML Elements](technical/profile-xml-elements.md)
3. Analysis: [Aggregation Analysis](technical/element-aggregation-analysis.md)

---

### By Task

| Task               | Documentation                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Install plugin     | [Quick Start](user-guide/quick-start.md#1-build--link-the-plugin)                              |
| Use commands       | [Usage Guide](user-guide/usage.md#commands)                                                    |
| Compare profiles   | [Compare Command](user-guide/compare-command.md)                                               |
| Test locally       | [Testing & Publishing](development/testing-and-publishing.md#-local-testing-before-publishing) |
| Contribute code    | [Contributing](development/contributing.md)                                                    |
| Publish to npm     | [Testing & Publishing](development/testing-and-publishing.md#-publishing-to-npm)               |
| Setup GitHub       | [Push to GitHub](development/push-to-github.md)                                                |
| Understand CI/CD   | [GitHub Actions](development/github-actions.md)                                                |
| Learn XML elements | [Profile XML](technical/profile-xml-elements.md)                                               |
| See features       | [Features List](project/features.md)                                                           |
| Check history      | [Changelog](project/changelog.md)                                                              |

---

## 📊 Documentation Stats

- **Total Files**: 18 markdown files
- **Total Lines**: 4,500+ lines
- **Total Words**: 45,000+ words
- **Categories**: 4 main categories
- **Languages**: English (primary), Spanish (one summary)

### By Category

| Category    | Files | Approx Lines |
| ----------- | ----- | ------------ |
| User Guide  | 3     | 1,200        |
| Development | 4     | 1,500        |
| Technical   | 3     | 1,200        |
| Project     | 5     | 600          |

---

## 🔄 Documentation Updates

### When to Update

- **User Guide**: When commands change or new examples are added
- **Development**: When development process changes
- **Technical**: When new analysis or elements are discovered
- **Project**: When features change or versions are released

### How to Update

1. Edit the relevant markdown file
2. Update links if structure changes
3. Update the main [README](README.md) if needed
4. Test all links work
5. Commit changes

---

## 🔗 Link Format

All documentation uses relative links:

```markdown
# Within docs/

[Link Text](category/file.md)

# To root files

[Link Text](../README.md)
[Link Text](../CONTRIBUTING.md)

# To specific sections

[Link Text](file.md#section-name)
```

---

## 📝 Writing Style

### General Guidelines

- **Clear and Concise**: Get to the point quickly
- **Examples**: Include code examples liberally
- **Structure**: Use headings, lists, and tables
- **Links**: Cross-reference related docs
- **Visuals**: Use emojis for visual hierarchy

### Formatting Conventions

- **Commands**: Use code blocks with bash syntax
- **Flags**: Format as `--flag-name`
- **Files**: Format as `file-name.ext`
- **Paths**: Format as `path/to/file`

---

## 🎨 Visual Elements

### Emojis Used

- 📚 Documentation
- 🚀 Getting Started / Quick Actions
- 💻 Development / Code
- 🔧 Technical / Tools
- 📋 Lists / Project Info
- ✅ Success / Checkmarks
- ❌ Errors / Failures
- ⚠️ Warnings
- 💡 Tips / Ideas
- 🎯 Goals / Targets
- 📊 Stats / Data
- 🔍 Search / Find

### Code Blocks

- Use `bash` for command-line examples
- Use `typescript` for TypeScript code
- Use `json` for JSON examples
- Use `markdown` for documentation examples

---

## 🆘 Help

### Documentation Issues

If you find:

- Broken links
- Outdated information
- Unclear explanations
- Missing examples

Please:

1. Open an issue on GitHub
2. Or submit a pull request with fixes

### Contributing to Docs

See: [Contributing Guide](development/contributing.md#contributing-to-docs)

---

## 📈 Future Plans

### Planned Additions

- [ ] Video tutorials
- [ ] Interactive examples
- [ ] Translated versions (Spanish, Portuguese)
- [ ] API reference documentation
- [ ] Architecture diagrams

### Feedback Welcome

Have suggestions for improving the documentation?

- Open an issue
- Start a discussion
- Submit a pull request

---

## ✅ Documentation Quality

This documentation:

- ✅ Well-organized into clear categories
- ✅ Comprehensive coverage of all features
- ✅ Multiple learning paths available
- ✅ Examples throughout
- ✅ Up-to-date with code
- ✅ Easy to navigate
- ✅ Cross-referenced
- ✅ Maintained actively

---

**Last Updated**: 2024
**Maintained By**: Jaime Terrats
**Feedback**: jterrats@salesforce.com
