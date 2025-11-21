# Jekyll Documentation Deployment

## Overview

This workflow automatically deploys the plugin documentation to GitHub Pages using Jekyll when changes are pushed to the `main` branch.

## Trigger Conditions

The workflow runs when:
- Changes are pushed to `main` branch affecting:
  - Documentation files in `docs/**`
  - Main `README.md`
  - Jekyll configuration files (`_config.yml`, `Gemfile`)
  - The workflow file itself
- Manual trigger via `workflow_dispatch`

## What It Does

### Build Job
1. **Checkout**: Clones the repository
2. **Setup Ruby**: Installs Ruby 3.2 and bundles gems
3. **Setup Pages**: Configures GitHub Pages settings
4. **Build with Jekyll**: Generates static site from markdown files
5. **Upload artifact**: Packages the built site for deployment

### Deploy Job
1. **Deploy to GitHub Pages**: Publishes the built site to GitHub Pages
2. **Sets environment URL**: Makes the site accessible at `https://jterrats.github.io/profiler`

## Documentation Structure

The Jekyll site includes:

### Main Pages
- **Home** (`index.md`): Landing page based on README
- **Contributing** (`CONTRIBUTING.md`): Contribution guidelines
- **Code of Conduct** (`CODE_OF_CONDUCT.md`): Community standards

### Documentation Sections
All files in the `docs/` directory are automatically included:

#### User Guide
- Quick Start Guide
- Usage Guide
- Compare Command Guide
- Docs Command Guide

#### Development
- Contributing Guide
- Testing and Publishing
- GitHub Setup
- GitHub Actions

#### Technical
- Profile XML Elements
- Aggregation Analysis
- Technical Summaries

#### Project
- Features
- Changelog
- Project Summary

## Configuration

### Jekyll Settings (`_config.yml`)

```yaml
title: Profiler - Salesforce CLI Plugin
theme: jekyll-theme-cayman
baseurl: "/profiler"
url: "https://jterrats.github.io"
```

### Theme

Uses the **Cayman** theme for a modern, clean look. Alternative themes available:
- `jekyll-theme-slate`
- `jekyll-theme-minimal`
- `jekyll-theme-architect`

To change the theme, edit `_config.yml`:

```yaml
theme: jekyll-theme-slate
```

### Plugins

Enabled plugins:
- `jekyll-feed`: RSS feed for updates
- `jekyll-seo-tag`: SEO optimization
- `jekyll-sitemap`: XML sitemap generation
- `jekyll-github-metadata`: GitHub repository metadata

## Local Development

To test the documentation site locally:

### Prerequisites

```bash
# Install Ruby (macOS with Homebrew)
brew install ruby

# Install Bundler
gem install bundler
```

### Run Locally

```bash
# Install dependencies
bundle install

# Serve the site locally
bundle exec jekyll serve

# Open in browser
# Site will be available at http://localhost:4000/profiler/
```

### Live Reload

Jekyll watches for changes automatically. Edit any markdown file and refresh your browser to see updates.

## GitHub Pages Setup

### Enable GitHub Pages

1. Go to repository **Settings**
2. Navigate to **Pages** section
3. Under **Source**, select:
   - Source: **GitHub Actions**
4. Save the settings

### Permissions

The workflow requires these permissions (already configured):
- `contents: read` - Read repository files
- `pages: write` - Write to GitHub Pages
- `id-token: write` - Authentication for deployment

These are set in the workflow file and should not need modification.

## Customization

### Add Navigation Links

Edit `_config.yml`:

```yaml
navigation:
  - title: Home
    url: /
  - title: Your New Page
    url: /your-page
```

### Add Google Analytics

Edit `_config.yml`:

```yaml
google_analytics: UA-XXXXXXXX-X
```

### Customize Theme Colors

Create `assets/css/style.scss`:

```scss
---
---

@import "{{ site.theme }}";

// Custom colors
.page-header {
  background-color: #0070d2; // Salesforce blue
}
```

### Add Custom Pages

Create a new markdown file in the root or `docs/` directory:

```markdown
---
layout: default
title: My Custom Page
---

# My Custom Page

Content here...
```

## Troubleshooting

### Build Fails

1. **Check workflow logs** in Actions tab
2. **Validate YAML syntax** of `_config.yml`
3. **Verify Ruby version** compatibility
4. **Check Gemfile** for dependency conflicts

### Site Not Updating

1. **Clear browser cache**
2. **Check GitHub Actions** for successful deployment
3. **Verify branch** is `main`
4. **Wait 1-2 minutes** for CDN propagation

### Links Not Working

1. **Use relative paths** for internal links
2. **Include baseurl** when needed: `{{ site.baseurl }}/page`
3. **Check file extensions**: `.md` files become `.html` in site

### 404 Errors

1. **Verify file exists** in repository
2. **Check file name** matches link
3. **Ensure file is not excluded** in `_config.yml`

## Deployment URL

Once deployed, your documentation will be available at:

**https://jterrats.github.io/profiler/**

## Monitoring

- **Build Status**: Check Actions tab for workflow runs
- **Deployment Status**: Each deployment shows the live URL
- **Build Time**: Typically 1-2 minutes for complete deployment

## Best Practices

1. **Test locally** before pushing to main
2. **Use semantic versioning** for documentation changes
3. **Keep README** and `index.md` in sync
4. **Add alt text** to images for accessibility
5. **Use relative links** for internal navigation
6. **Commit** `Gemfile.lock` for reproducible builds

## Files Overview

```
profiler/
├── .github/
│   └── workflows/
│       ├── deploy-docs.yml      # Jekyll deployment workflow
│       └── JEKYLL_DOCS.md       # This file
├── docs/                        # All documentation
│   ├── user-guide/
│   ├── development/
│   ├── technical/
│   └── project/
├── _config.yml                  # Jekyll configuration
├── Gemfile                      # Ruby dependencies
├── index.md                     # Home page
├── README.md                    # GitHub README
└── CONTRIBUTING.md              # Contributing guide
```

## Additional Resources

- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Themes](https://pages.github.com/themes/)
- [Liquid Template Language](https://shopify.github.io/liquid/)

---

**Need Help?** Open an issue at [github.com/jterrats/profiler/issues](https://github.com/jterrats/profiler/issues)

