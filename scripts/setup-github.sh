#!/bin/bash

# Script to setup GitHub repository
# Run this ONCE to configure the remote

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "🔧 GitHub Repository Setup"
echo "=========================="
echo ""

# Check git config
echo "📋 Git Configuration:"
echo "  Name:  $(git config --global user.name)"
echo "  Email: $(git config --global user.email)"
echo ""

# Get repository name
DEFAULT_REPO="profiler"
read -p "GitHub repository name [$DEFAULT_REPO]: " REPO_NAME
REPO_NAME=${REPO_NAME:-$DEFAULT_REPO}

# Get GitHub username
DEFAULT_USERNAME="jterrats"
read -p "GitHub username [$DEFAULT_USERNAME]: " GITHUB_USERNAME
GITHUB_USERNAME=${GITHUB_USERNAME:-$DEFAULT_USERNAME}

echo ""
echo -e "${BLUE}Repository will be: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}${NC}"
echo ""

# Check if remote already exists
if git remote | grep -q "origin"; then
    echo -e "${YELLOW}⚠️  Remote 'origin' already exists${NC}"
    EXISTING_REMOTE=$(git remote get-url origin)
    echo "   Current: $EXISTING_REMOTE"
    echo ""
    read -p "Replace it? (y/N): " REPLACE
    
    if [ "$REPLACE" = "y" ]; then
        git remote remove origin
        echo -e "${GREEN}✓ Removed old remote${NC}"
    else
        echo "Keeping existing remote. Exiting."
        exit 0
    fi
fi

# Add remote
REMOTE_URL="git@github.com:${GITHUB_USERNAME}/${REPO_NAME}.git"
git remote add origin "$REMOTE_URL"

echo ""
echo -e "${GREEN}✓ Remote added successfully${NC}"
echo ""

# Show status
echo "📊 Repository Status:"
echo "  Remote URL: $REMOTE_URL"
echo "  Current branch: $(git branch --show-current)"
echo "  Total commits: $(git rev-list --count HEAD)"
echo ""

echo "📝 Next Steps:"
echo ""
echo "1. Create the repository on GitHub:"
echo "   https://github.com/new"
echo "   - Repository name: ${REPO_NAME}"
echo "   - Description: Salesforce CLI plugin for profile management"
echo "   - Public/Private: Your choice"
echo "   - DO NOT initialize with README (we already have one)"
echo ""
echo "2. Push the code:"
echo "   git push -u origin main"
echo ""
echo "3. Verify GitHub Actions:"
echo "   https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/actions"
echo ""

read -p "Open GitHub to create repository now? (y/N): " OPEN_GITHUB
if [ "$OPEN_GITHUB" = "y" ]; then
    open "https://github.com/new" 2>/dev/null || echo "Open: https://github.com/new"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""

