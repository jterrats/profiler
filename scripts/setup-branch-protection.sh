#!/bin/bash

##################################################
# Setup Branch Protection for Main Branch
##################################################
# This script configures GitHub branch protection
# rules for the main branch to prevent unauthorized
# direct pushes and enforce PR reviews.
##################################################

set -e

REPO_OWNER="jterrats"
REPO_NAME="profiler"
BRANCH="main"
AUTHORIZED_USERS=("jterrats")  # Add more users here if needed

echo "🔒 Setting up branch protection for ${REPO_OWNER}/${REPO_NAME}..."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install gh"
    echo "  Linux:   https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    echo "  Windows: https://github.com/cli/cli#windows"
    echo ""
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "⚠️  Not authenticated with GitHub. Logging in..."
    gh auth login
fi

echo "✅ Authenticated with GitHub"
echo ""

# Prepare users array for API
USERS_JSON=$(printf '%s\n' "${AUTHORIZED_USERS[@]}" | jq -R . | jq -s .)

echo "📋 Configuration:"
echo "  Branch: ${BRANCH}"
echo "  Authorized users: ${AUTHORIZED_USERS[*]}"
echo "  Required approvals: 1"
echo "  Status checks: Test Plugin on Push"
echo ""

read -p "Continue with branch protection setup? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 0
fi

echo ""
echo "🔧 Applying branch protection rules..."

# Create protection rules
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/${REPO_OWNER}/${REPO_NAME}/branches/${BRANCH}/protection" \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]=Test\ Plugin\ on\ Push \
  -f enforce_admins=true \
  -f required_pull_request_reviews[required_approving_review_count]=1 \
  -f required_pull_request_reviews[dismiss_stale_reviews]=true \
  -f restrictions[users]="${AUTHORIZED_USERS[0]}" \
  -f restrictions[teams]='[]' \
  -f restrictions[apps]='[]' \
  -f allow_force_pushes[enabled]=false \
  -f allow_deletions[enabled]=false \
  -f required_linear_history[enabled]=true \
  2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Branch protection successfully configured!"
    echo ""
    echo "📊 Summary:"
    echo "  ✓ Direct pushes blocked (except for authorized users)"
    echo "  ✓ Pull requests require 1 approval"
    echo "  ✓ Status checks must pass (Test Plugin on Push)"
    echo "  ✓ Linear history enforced"
    echo "  ✓ Force pushes disabled"
    echo "  ✓ Branch deletion disabled"
    echo ""
    echo "🔗 View settings: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/branches"
else
    echo ""
    echo "❌ Failed to configure branch protection."
    echo ""
    echo "Please configure manually at:"
    echo "https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/branches"
    echo ""
    echo "Or review the documentation:"
    echo "cat .github/BRANCH_PROTECTION.md"
    exit 1
fi

