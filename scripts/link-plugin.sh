#!/bin/bash

# Script to easily link/unlink the plugin for local testing

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "🔗 Profiler Plugin - Local Testing Helper"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found!${NC}"
    echo "Please run this script from the plugin root directory."
    exit 1
fi

# Parse command
COMMAND="${1:-link}"

case "$COMMAND" in
    link)
        echo "📦 Building plugin..."
        yarn build

        echo ""
        echo "🔗 Linking plugin to Salesforce CLI..."
        sf plugins link .

        echo ""
        echo -e "${GREEN}✅ Plugin linked successfully!${NC}"
        echo ""
        echo "Available commands:"
        echo "  sf profiler retrieve --help"
        echo "  sf profiler compare --help"
        echo ""
        echo "Test with:"
        echo "  sf profiler retrieve --target-org yourOrg --from-project"
        echo "  sf profiler compare --target-org yourOrg --name 'Admin'"
        echo ""
        ;;

    unlink)
        echo "🔓 Unlinking plugin..."
        sf plugins unlink profiler

        echo ""
        echo -e "${GREEN}✅ Plugin unlinked successfully!${NC}"
        echo ""
        ;;

    rebuild)
        echo "🔨 Rebuilding plugin..."
        yarn clean-all
        yarn install
        yarn build

        echo ""
        echo -e "${GREEN}✅ Plugin rebuilt!${NC}"
        echo ""
        echo "The linked version is automatically updated."
        echo "Test your changes now!"
        echo ""
        ;;

    status)
        echo "📊 Checking plugin status..."
        echo ""

        if sf plugins | grep -q "profiler"; then
            echo -e "${GREEN}✅ Plugin is linked${NC}"
            echo ""
            sf plugins | grep profiler
        else
            echo -e "${YELLOW}⚠️  Plugin is not linked${NC}"
            echo ""
            echo "Run: ./scripts/link-plugin.sh link"
        fi
        echo ""
        ;;

    test)
        echo "🧪 Running tests..."
        yarn test

        echo ""
        echo -e "${GREEN}✅ Tests completed!${NC}"
        echo ""
        ;;

    *)
        echo "Usage: $0 {link|unlink|rebuild|status|test}"
        echo ""
        echo "Commands:"
        echo "  link     - Build and link plugin to SF CLI"
        echo "  unlink   - Unlink plugin from SF CLI"
        echo "  rebuild  - Clean, install, and rebuild plugin"
        echo "  status   - Check if plugin is linked"
        echo "  test     - Run test suite"
        echo ""
        exit 1
        ;;
esac

