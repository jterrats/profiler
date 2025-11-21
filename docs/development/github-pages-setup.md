# GitHub Pages Setup Guide

## ✅ Issue Resolved

The error `You must pass a Github Token with repo write access as SVC_CLI_BOT_GITHUB_TOKEN` has been fixed.

### What Caused the Error?

The workflows `create-github-release.yml` and `onRelease.yml` come from the official Salesforce CLI template and require:
- Special token: `SVC_CLI_BOT_GITHUB_TOKEN`
- Access to Salesforce organization secrets
- Special permissions only available to official `salesforcecli` repositories

### What Was Done?

1. **Workflow `create-github-release.yml`**:
   - ✅ Disabled automatic trigger on `push` to `main`
   - ✅ Added condition to check if token exists
   - ✅ Added explanatory comments

2. **Workflow `onRelease.yml`**:
   - ✅ Added condition `if: github.repository_owner == 'salesforcecli'`
   - ✅ Only runs if it's an official Salesforce repository
   - ✅ Added explanatory comments

## 🌐 Configure GitHub Pages

### Step 1: Enable GitHub Pages

1. Go to your repository on GitHub: `https://github.com/jterrats/profiler`
2. Click on **Settings** (⚙️)
3. In the sidebar, click on **Pages**
4. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions**
5. Save changes

### Step 2: Verify the Workflow

The `deploy-docs.yml` workflow is already configured and will run automatically when:
- You push to `main`
- You modify files in `docs/`
- You modify `README.md`
- You modify Jekyll configuration files

### Step 3: Verify the Build

1. Go to the **Actions** tab on GitHub
2. You'll see the workflow **"Deploy Documentation to GitHub Pages"**
3. Wait for it to finish (⏱️ ~2-3 minutes)
4. If successful, you'll see ✅ green

### Step 4: Access the Site

Once deployed, your documentation will be available at:

**https://jterrats.github.io/profiler/**

## 📦 Manual Release Process

Since automatic Salesforce workflows are disabled, use this manual process:

### For Regular Versions

```bash
# 1. Make sure you're on main and up to date
git checkout main
git pull origin main

# 2. Update version (patch, minor, or major)
npm version patch   # 1.0.0 → 1.0.1
# or
npm version minor   # 1.0.0 → 1.1.0
# or
npm version major   # 1.0.0 → 2.0.0

# 3. Push with tags
git push --follow-tags

# 4. Publish to npm
npm publish
```

### For Pre-releases (Beta, Alpha, etc.)

```bash
# Beta release
npm version prerelease --preid=beta
# Result: 1.0.0 → 1.0.1-beta.0

# Alpha release
npm version prerelease --preid=alpha
# Result: 1.0.0 → 1.0.1-alpha.0

# Push and publish with tag
git push --follow-tags
npm publish --tag beta  # or --tag alpha
```

## 🔧 Additional Jekyll Configuration

### Change Theme

Edit `_config.yml`:

```yaml
# Available themes
theme: jekyll-theme-cayman      # Current (modern and clean)
# theme: jekyll-theme-slate      # Dark and elegant
# theme: jekyll-theme-minimal    # Minimalist
# theme: jekyll-theme-architect  # Professional with sidebar
```

### Add Google Analytics

Edit `_config.yml`:

```yaml
google_analytics: G-XXXXXXXXXX  # Your Google Analytics 4 code
```

### Customize Colors

Create `assets/css/style.scss`:

```scss
---
---

@import "{{ site.theme }}";

// Customize colors
.page-header {
  background-color: #0070d2;  // Salesforce blue
  background-image: linear-gradient(120deg, #0070d2, #00a1e0);
}

.main-content h1,
.main-content h2 {
  color: #0070d2;
}
```

### Add Custom Navigation

Edit `_config.yml`:

```yaml
navigation:
  - title: Home
    url: /
  - title: Quick Start
    url: /docs/user-guide/quick-start
  - title: Commands
    subitems:
      - title: Retrieve
        url: /docs/user-guide/usage#retrieve
      - title: Compare
        url: /docs/user-guide/usage#compare
      - title: Docs
        url: /docs/user-guide/docs-command
```

## 🧪 Test Locally

### Install Dependencies

```bash
# macOS
brew install ruby
gem install bundler

# Linux (Ubuntu/Debian)
sudo apt-get install ruby-full build-essential
gem install bundler

# Windows
# Download RubyInstaller from https://rubyinstaller.org/
```

### Run Jekyll Locally

```bash
# In the project directory
bundle install
bundle exec jekyll serve

# Open in browser
# http://localhost:4000/profiler/
```

### Live Reload

Jekyll automatically reloads when you edit markdown files. Just refresh your browser.

## 🚨 Troubleshooting

### Error: "Page build failed"

**Cause**: Syntax error in `_config.yml` or incorrect front matter

**Solution**:
```bash
# Test locally first
bundle exec jekyll build

# Check GitHub Actions logs
# GitHub → Actions → Last failed workflow → View logs
```

### Error: "404 Page Not Found"

**Cause**: GitHub Pages not enabled or incorrect URL

**Solution**:
1. Verify Settings → Pages → Source: **GitHub Actions**
2. Wait 2-3 minutes for CDN propagation
3. Correct URL: `https://jterrats.github.io/profiler/` (don't forget trailing slash)

### Site Not Updating

**Cause**: Browser cache or GitHub CDN

**Solution**:
1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Open in incognito mode
3. Wait 2-5 minutes for propagation
4. Verify workflow completed successfully

### Broken Links

**Cause**: Absolute paths or `.md` extensions

**Solution**:
```markdown
<!-- ❌ Bad -->
[Quick Start](/docs/user-guide/quick-start.md)
[Quick Start](https://jterrats.github.io/profiler/docs/user-guide/quick-start.md)

<!-- ✅ Good -->
[Quick Start](docs/user-guide/quick-start)
[Quick Start]({{ site.baseurl }}/docs/user-guide/quick-start)
```

## 📊 Monitoring

### Check Site Status

```bash
# View recent workflows
gh workflow list

# View last deployment status
gh run list --workflow=deploy-docs.yml

# View logs from last run
gh run view --log
```

### Metrics (Optional)

If you configured Google Analytics, you can see:
- Unique visitors
- Most viewed pages
- Time on site
- Traffic sources

## 🔐 Custom Domain (Optional)

If you have your own domain:

### 1. Configure DNS

In your DNS provider, add:

```
Type: CNAME
Name: docs (or your desired subdomain)
Value: jterrats.github.io
```

### 2. Update Jekyll

Edit `_config.yml`:

```yaml
url: "https://docs.yourdomain.com"
baseurl: ""
```

### 3. Add CNAME to Repository

Create `CNAME` file in root:

```
docs.yourdomain.com
```

Commit and push:

```bash
echo "docs.yourdomain.com" > CNAME
git add CNAME
git commit -m "feat: add custom domain"
git push
```

### 4. Configure in GitHub

Settings → Pages → Custom domain → `docs.yourdomain.com` → Save

## 📚 Resources

- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [Jekyll Themes Gallery](https://jekyllthemes.io/)
- [Liquid Templates](https://shopify.github.io/liquid/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

## ✅ Configuration Checklist

- [x] ✅ Salesforce workflows disabled
- [x] ✅ Jekyll workflow configured
- [ ] ⏳ GitHub Pages enabled in Settings
- [ ] ⏳ First deployment successful
- [ ] ⏳ Site accessible at `https://jterrats.github.io/profiler/`
- [ ] 📝 (Optional) Google Analytics configured
- [ ] 📝 (Optional) Custom domain configured

---

**Need help?** Open an issue at [github.com/jterrats/profiler/issues](https://github.com/jterrats/profiler/issues)
