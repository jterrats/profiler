# GitHub Pages Documentation Site

## 🌐 Live Documentation

The complete documentation for the Profiler plugin is available online at:

**[https://jterrats.github.io/profiler](https://jterrats.github.io/profiler)**

## Overview

The documentation site is automatically built and deployed using Jekyll and GitHub Actions whenever changes are pushed to the `main` branch.

## Features

- **📚 Complete Documentation**: All markdown files from the `docs/` directory
- **🔄 Auto-Deploy**: Automatic deployment on every push to main
- **🎨 Modern Theme**: Clean, professional Cayman theme
- **📱 Responsive**: Mobile-friendly design
- **🔍 SEO Optimized**: Search engine friendly with metadata
- **📊 Sitemap**: Automatic sitemap generation
- **🔗 Navigation**: Easy navigation between pages

## Structure

### Main Pages
- **Home**: Landing page with overview and quick links
- **Quick Start**: Get started in 5 minutes
- **Usage Guide**: Complete command documentation
- **Contributing**: Guidelines for contributors

### Documentation Sections

#### User Guide
- Quick Start Guide (`docs/user-guide/quick-start.md`)
- Usage Guide (`docs/user-guide/usage.md`)
- Compare Command (`docs/user-guide/compare-command.md`)
- Docs Command (`docs/user-guide/docs-command.md`)

#### Development
- Contributing Guide (`docs/development/contributing.md`)
- Testing & Publishing (`docs/development/testing-and-publishing.md`)
- GitHub Setup (`docs/development/push-to-github.md`)
- GitHub Actions (`docs/development/github-actions.md`)

#### Technical
- Profile XML Elements (`docs/technical/profile-xml-elements.md`)
- Aggregation Analysis (`docs/technical/element-aggregation-analysis.md`)
- Analysis Summary (`docs/technical/analysis-summary.md`)

#### Project
- Features (`docs/project/features.md`)
- Changelog (`docs/project/changelog.md`)
- Project Summary (`docs/project/project-summary.md`)

## Local Development

### Prerequisites

```bash
# Install Ruby (macOS)
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

# Open in browser: http://localhost:4000/profiler/
```

### Live Reload

Jekyll automatically watches for file changes. Simply edit any markdown file and refresh your browser to see updates.

## Deployment

### Automatic Deployment

The site automatically deploys when:
1. Changes are pushed to `main` branch
2. Files in `docs/`, `README.md`, or Jekyll config are modified
3. GitHub Actions workflow runs successfully

### Manual Deployment

You can manually trigger deployment from the GitHub Actions tab:
1. Go to **Actions** → **Deploy Documentation to GitHub Pages**
2. Click **Run workflow**
3. Select branch `main`
4. Click **Run workflow**

## Configuration

### Jekyll Settings

The site configuration is in `_config.yml`:

```yaml
title: Profiler - Salesforce CLI Plugin
theme: jekyll-theme-cayman
baseurl: "/profiler"
url: "https://jterrats.github.io"
```

### Theme Customization

To change the theme, edit `_config.yml`:

```yaml
# Available themes:
theme: jekyll-theme-cayman      # Current
# theme: jekyll-theme-slate
# theme: jekyll-theme-minimal
# theme: jekyll-theme-architect
```

## Adding New Pages

### Create a New Page

1. Create a markdown file in the appropriate directory:
   ```bash
   touch docs/user-guide/new-page.md
   ```

2. Add front matter:
   ```markdown
   ---
   layout: default
   title: New Page Title
   ---

   # New Page Title

   Content here...
   ```

3. Commit and push:
   ```bash
   git add docs/user-guide/new-page.md
   git commit -m "docs: add new page"
   git push
   ```

### Update Navigation

Edit `_config.yml` to add the page to navigation:

```yaml
navigation:
  - title: New Page
    url: /docs/user-guide/new-page
```

## Troubleshooting

### Build Fails

1. Check GitHub Actions logs in the **Actions** tab
2. Validate YAML syntax in `_config.yml`
3. Ensure all markdown files have valid front matter
4. Check Ruby and Jekyll versions in `Gemfile`

### Site Not Updating

1. Clear browser cache
2. Check GitHub Actions for successful deployment
3. Wait 1-2 minutes for CDN propagation
4. Verify you're viewing the correct URL

### 404 Errors

1. Check file exists in repository
2. Verify file path in links (case-sensitive)
3. Ensure file is not in `exclude` list in `_config.yml`
4. Use `.html` extension for links (not `.md`)

### Links Not Working

Use relative paths:
```markdown
<!-- Good -->
[Quick Start](docs/user-guide/quick-start)
[Compare Command](docs/user-guide/compare-command)

<!-- Bad -->
[Quick Start](/docs/user-guide/quick-start.md)
```

## GitHub Pages Setup

### First-Time Setup

1. Go to repository **Settings**
2. Navigate to **Pages** section
3. Under **Build and deployment**:
   - **Source**: GitHub Actions
4. Save settings

The site will deploy automatically on the next push to `main`.

### Custom Domain (Optional)

To use a custom domain:

1. Add `CNAME` file to repository root:
   ```
   docs.yourcompany.com
   ```

2. Update `_config.yml`:
   ```yaml
   url: "https://docs.yourcompany.com"
   baseurl: ""
   ```

3. Configure DNS:
   - Add CNAME record pointing to `jterrats.github.io`

## Monitoring

### Build Status

Check deployment status:
- **GitHub Actions**: [Actions Tab](https://github.com/jterrats/profiler/actions)
- **Workflow**: "Deploy Documentation to GitHub Pages"
- **Status Badge**: Displayed in README

### Analytics (Optional)

To add Google Analytics, edit `_config.yml`:

```yaml
google_analytics: UA-XXXXXXXX-X
```

Or for Google Analytics 4:

```yaml
google_analytics: G-XXXXXXXXXX
```

## Best Practices

### Content

1. **Use meaningful titles** in front matter
2. **Add clear headings** for better navigation
3. **Include code examples** with syntax highlighting
4. **Add images** with alt text for accessibility
5. **Test links** locally before pushing

### Structure

1. **Organize by topic** in appropriate directories
2. **Use consistent naming** for files (kebab-case)
3. **Keep URLs stable** to avoid breaking links
4. **Update navigation** when adding major pages

### Maintenance

1. **Test locally** before pushing to main
2. **Review build logs** after deployment
3. **Check live site** after changes
4. **Update dependencies** regularly
5. **Monitor broken links** using site crawlers

## Files Reference

```
profiler/
├── .github/
│   └── workflows/
│       ├── deploy-docs.yml      # Jekyll deployment workflow
│       └── JEKYLL_DOCS.md       # Technical documentation
├── docs/                        # All documentation files
│   ├── user-guide/
│   ├── development/
│   ├── technical/
│   ├── project/
│   └── GITHUB_PAGES.md         # This file
├── _config.yml                  # Jekyll configuration
├── Gemfile                      # Ruby dependencies
├── index.md                     # Site home page
└── .gitignore                   # Excludes _site/, Gemfile.lock
```

## Resources

- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Themes](https://pages.github.com/themes/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Cayman Theme](https://github.com/pages-themes/cayman)

## Support

For issues with:
- **Site content**: Open an issue in the repository
- **Jekyll build**: Check workflow logs
- **GitHub Pages**: See [GitHub Support](https://support.github.com/)

---

**Site URL**: [https://jterrats.github.io/profiler](https://jterrats.github.io/profiler)
**Repository**: [https://github.com/jterrats/profiler](https://github.com/jterrats/profiler)

