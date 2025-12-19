# Branch Protection Setup for Main

This document describes the branch protection rules configured for the `main` branch.

## Current Protection Rules

### 1. Require Pull Request Reviews

- ✅ **Required approvals**: 1
- ✅ **Dismiss stale reviews**: Enabled
- ✅ **Require review from Code Owners**: Disabled (optional)

### 2. Restrict Who Can Push

- ✅ **Allow specific users**: @jterrats and repository owner only
- ❌ **Direct pushes blocked** for all other users

### 3. Require Status Checks

- ✅ **Require branches to be up to date**: Enabled
- ✅ **Required status checks**:
  - `Test Plugin on Push` workflow must pass
  - All tests must pass before merge

### 4. Additional Rules

- ✅ **Require linear history**: Enabled (no merge commits)
- ✅ **Include administrators**: Protection applies to admins too
- ✅ **Allow force pushes**: Disabled
- ✅ **Allow deletions**: Disabled

## How to Configure

### Option A: Via GitHub Web UI

1. Go to: https://github.com/jterrats/profiler/settings/branches
2. Click **"Add rule"** or edit existing rule for `main`
3. Configure:

```
Branch name pattern: main

☑ Require a pull request before merging
  ☑ Require approvals: 1
  ☑ Dismiss stale pull request approvals when new commits are pushed

☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging
  Status checks that are required:
    - Test Plugin on Push

☑ Require linear history

☑ Restrict who can push to matching branches
  Add users:
    - jterrats
    - [repository owner if different]

☑ Do not allow bypassing the above settings

☑ Include administrators
```

4. Click **"Create"** or **"Save changes"**

### Option B: Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# brew install gh (macOS)
# Or: https://cli.github.com/

# Login
gh auth login

# Navigate to repo
cd /Users/jterrats/dev/profiler

# Create/update branch protection
gh api repos/jterrats/profiler/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Test Plugin on Push"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions='{"users":["jterrats"],"teams":[],"apps":[]}' \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_linear_history=true
```

## Verification

After configuration, test:

1. ✅ Try to push directly to `main` → Should be blocked
2. ✅ Create PR → Should require approval
3. ✅ Try to merge without CI passing → Should be blocked
4. ✅ Check that only authorized users can push

## Exceptions

The following users can bypass these rules:

- **@jterrats** (repository owner)
- Any additional users explicitly added to the restrictions list

## Impact

| Action                  | Before     | After                                |
| ----------------------- | ---------- | ------------------------------------ |
| Direct push to main     | ✅ Allowed | ❌ Blocked (except authorized users) |
| Merge without PR        | ✅ Allowed | ❌ Blocked                           |
| Merge without approval  | ✅ Allowed | ❌ Blocked                           |
| Merge with failed tests | ✅ Allowed | ❌ Blocked                           |
| Force push              | ✅ Allowed | ❌ Blocked                           |
| Delete branch           | ✅ Allowed | ❌ Blocked                           |

## Emergency Override

If you need to bypass protection temporarily:

```bash
# This should only be done in emergencies
# The "Include administrators" setting prevents this unless explicitly disabled

# 1. Go to Settings → Branches → Edit rule
# 2. Temporarily uncheck "Include administrators"
# 3. Make your emergency change
# 4. Re-enable "Include administrators"
```

⚠️ **Warning:** Emergency overrides should be documented in the commit message.

## Maintenance

Review these rules quarterly to ensure they still meet project needs.

Last updated: 2024-12-02
