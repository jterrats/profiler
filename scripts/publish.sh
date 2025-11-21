#!/bin/bash

# Script to help with publishing the plugin to npm

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "📦 Profiler Plugin - Publishing Helper"
echo "======================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found!${NC}"
    echo "Please run this script from the plugin root directory."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")

echo -e "${BLUE}Current version: ${CURRENT_VERSION}${NC}"
echo ""

# Ask for version type
echo "What type of version bump?"
echo "  1) patch (1.0.0 -> 1.0.1) - Bug fixes"
echo "  2) minor (1.0.0 -> 1.1.0) - New features"
echo "  3) major (1.0.0 -> 2.0.0) - Breaking changes"
echo "  4) Skip version bump"
echo ""
read -p "Enter choice [1-4]: " VERSION_CHOICE

case "$VERSION_CHOICE" in
    1)
        VERSION_TYPE="patch"
        ;;
    2)
        VERSION_TYPE="minor"
        ;;
    3)
        VERSION_TYPE="major"
        ;;
    4)
        VERSION_TYPE="skip"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Pre-publish checks
echo ""
echo "🔍 Running pre-publish checks..."
echo ""

# Clean and build
echo "📦 Cleaning and building..."
yarn clean-all
yarn install
yarn build

# Run tests
echo ""
echo "🧪 Running tests..."
if yarn test; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Run linting
echo ""
echo "🔍 Running linting..."
if yarn lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${RED}❌ Linting failed${NC}"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Bump version
if [ "$VERSION_TYPE" != "skip" ]; then
    echo ""
    echo "📈 Bumping version..."
    npm version $VERSION_TYPE --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo -e "${GREEN}Version bumped: ${CURRENT_VERSION} -> ${NEW_VERSION}${NC}"
else
    NEW_VERSION=$CURRENT_VERSION
fi

# Update CHANGELOG
echo ""
echo "📝 Update CHANGELOG.md manually if needed"
echo ""
read -p "Press Enter to continue..."

# Git commit and tag
echo ""
echo "📝 Creating git commit and tag..."
git add -A
git commit -m "chore: prepare release v${NEW_VERSION}" || echo "No changes to commit"
git tag "v${NEW_VERSION}"

echo ""
echo "🚀 Ready to publish!"
echo ""
echo -e "${YELLOW}About to publish version ${NEW_VERSION}${NC}"
echo ""
read -p "Publish to npm? (y/N): " PUBLISH

if [ "$PUBLISH" = "y" ]; then
    echo ""
    echo "📦 Publishing to npm..."
    
    # Check if logged in
    if ! npm whoami &> /dev/null; then
        echo ""
        echo "Please login to npm:"
        npm login
    fi
    
    # Publish
    npm publish --access public
    
    echo ""
    echo -e "${GREEN}✅ Published successfully!${NC}"
    echo ""
    echo "Push git commits and tags:"
    echo "  git push origin main"
    echo "  git push origin v${NEW_VERSION}"
    echo ""
    echo "Users can now install with:"
    echo "  sf plugins install $(node -p "require('./package.json').name")@${NEW_VERSION}"
    echo ""
    
    # Ask to push
    read -p "Push to git now? (y/N): " PUSH
    if [ "$PUSH" = "y" ]; then
        git push origin main
        git push origin "v${NEW_VERSION}"
        echo -e "${GREEN}✅ Pushed to git${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}Publishing cancelled${NC}"
    echo ""
    echo "To publish later:"
    echo "  npm publish --access public"
    echo ""
    echo "Don't forget to push git changes:"
    echo "  git push origin main"
    echo "  git push origin v${NEW_VERSION}"
fi

echo ""

