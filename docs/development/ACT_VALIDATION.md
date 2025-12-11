# ACT Validation - Local CI/CD Testing

## 🔥 GOLDEN RULE

**ALWAYS validate the pipeline with ACT BEFORE pushing**

```bash
./scripts/validate-ci.sh
```

This will save you from:
- ❌ Commits that break CI/CD
- ❌ Wasted GitHub Actions minutes
- ❌ Time waiting for GitHub Actions to fail
- ❌ Embarrassment from breaking the build 😅

---

## What is ACT?

[ACT](https://github.com/nektos/act) is a tool that **runs GitHub Actions locally** using Docker. It allows you to test your workflows before pushing.

### Benefits

✅ **Immediate feedback** - Don't wait for GitHub Actions  
✅ **Save minutes** - Don't consume GitHub Actions quota  
✅ **Easy debugging** - Inspect containers, logs, etc.  
✅ **Offline testing** - Work without internet  
✅ **Reproducibility** - Same environment as GitHub Actions

---

## Installation

### macOS (Homebrew)

```bash
brew install act
```

### Linux

```bash
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Manual

See: https://github.com/nektos/act#installation

---

## Initial Setup

### 1. Configure Local Secrets (Optional)

If the workflow needs secrets (like E2E tests):

```bash
# Copy template
cp .secrets.example .secrets

# Edit and add your secrets
nano .secrets
```

Example `.secrets`:

```bash
SF_AUTH_URL_E2E_ORG=force://PlatformCLI::YOUR_REFRESH_TOKEN@your-instance.my.salesforce.com
```

**IMPORTANT**: `.secrets` is in `.gitignore` - NEVER commit it

### 2. Docker Image Setup

This project uses a **custom ACT Docker image** (`act-local:latest`) with yarn support.

**If you don't have the custom image**, build it from `~/dev/act`:

```bash
cd ~/dev/act
docker build -t act-local:latest .
```

Or use the default image by removing `.actrc` configuration.

---

## Usage

### Full Validation (recommended)

```bash
./scripts/validate-ci.sh
```

This simulates a **pull request** and runs the complete workflow:
1. quick-check (lint, type, error tests)
2. official-tests (unit, macOS, nuts)
3. e2e-tests (with real org, if secrets configured)

### Specific Workflows

```bash
# Validate specific workflow
./scripts/validate-ci.sh edd-ci.yml

# Validate tests.yml
./scripts/validate-ci.sh test.yml

# Validate e2e.yml
./scripts/validate-ci.sh e2e.yml
```

### Specific Jobs

```bash
# Only lint and error tests
act pull_request \
  --workflows .github/workflows/edd-ci.yml \
  -j quick-check

# Only unit tests
act pull_request \
  --workflows .github/workflows/edd-ci.yml \
  -j official-tests
```

### Dry Run (without executing)

```bash
# See what would run without executing
act pull_request --dryrun
```

---

## Development Workflow

### Before Every Push (GOLDEN RULE)

```bash
# 1. Make code changes
git add .

# 2. VALIDATE PIPELINE WITH ACT
./scripts/validate-ci.sh

# 3. If it passes, commit and push
git commit -m "feat: my changes"
git push
```

### Workflow Debugging

```bash
# See which jobs would run
act pull_request -l

# Run with verbose logs
act pull_request -v

# Run without removing containers (for inspection)
act pull_request --rm=false

# Inspect container after failure
docker ps -a
docker logs <container-id>
```

---

## Limitations

ACT simulates GitHub Actions but has some differences:

### ❌ Not Supported

- Reusable workflows with `uses: org/repo/.github/workflows/...@main`
  - Salesforce CLI workflows cannot run with ACT
  - Solution: Run specific jobs or local workflows

- Some GitHub services (GitHub Packages, etc.)

### ⚠️ Differences

- **Runners**: ACT uses Docker images, not official GitHub runners
  - May have differences in installed tools
  - Use `catthehacker/ubuntu:act-latest` (more complete)

- **Secrets**: Must configure locally in `.secrets`

- **Performance**: May be slower on first run (Docker)

---

## Troubleshooting

### Error: "Docker daemon not running"

```bash
# Make sure Docker is running
docker ps
```

### Error: "No space left on device"

```bash
# Clean old Docker images
docker system prune -a
```

### Error: "Cannot find workflow"

```bash
# Verify path is correct
ls -la .github/workflows/

# Or specify absolute path
act pull_request --workflows $(pwd)/.github/workflows/edd-ci.yml
```

### E2E Tests Fail Locally

E2E tests require:
1. Secrets configured in `.secrets`
2. Authenticated and accessible Salesforce org
3. Network enabled in Docker

If you don't have secrets, E2E will fail (expected). You can:

```bash
# Run without E2E
act pull_request -j quick-check -j official-tests
```

---

## Advanced Configuration

### `.actrc` (persistent configuration)

Create `.actrc` in project root:

```bash
# .actrc - ACT configuration
--pull=false
--rm
-P ubuntu-latest=catthehacker/ubuntu:act-latest
--secret-file .secrets
```

Then you only need:

```bash
act pull_request
```

### Local GitHub Actions Cache

ACT doesn't support GitHub Actions cache by default. To simulate:

```bash
# Use bind mount for cache
act pull_request \
  -v $(pwd)/node_modules:/workspace/node_modules
```

---

## Resources

- **ACT Documentation**: https://github.com/nektos/act
- **Docker Images for ACT**: https://github.com/catthehacker/docker_images
- **GitHub Actions Syntax**: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

---

## Summary

| Command | Purpose |
|---------|---------|
| `./scripts/validate-ci.sh` | Full validation (GOLDEN RULE) |
| `act pull_request` | Run workflow manually |
| `act pull_request -l` | List jobs without running |
| `act pull_request -j <job>` | Run specific job |
| `act pull_request --dryrun` | Preview without running |
| `act pull_request -v` | Verbose logs |

---

**Remember**: 🔥 **VALIDATE WITH ACT BEFORE EVERY PUSH** 🔥
