#!/bin/bash
#
# validate-ci.sh - Validate CI/CD pipeline locally using ACT
#
# REGLA DE ORO: Ejecutar ANTES de cada push para validar workflows
# Usage: ./scripts/validate-ci.sh [workflow-name]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════════════"
echo "🔍 VALIDATING CI/CD PIPELINE LOCALLY WITH ACT"
echo "═══════════════════════════════════════════════════"
echo ""

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo -e "${RED}❌ ACT is not installed${NC}"
    echo ""
    echo "Install ACT:"
    echo "  macOS:   brew install act"
    echo "  Linux:   curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash"
    echo "  Manual:  https://github.com/nektos/act"
    echo ""
    exit 1
fi

# Default workflow
WORKFLOW="${1:-edd-ci.yml}"

echo -e "${BLUE}Workflow:${NC} $WORKFLOW"
echo -e "${BLUE}Event:${NC} pull_request"
echo ""

# Check if secrets file exists (optional)
SECRETS_FILE=".secrets"
SECRETS_FLAG=""
if [ -f "$SECRETS_FILE" ]; then
    echo -e "${GREEN}✓${NC} Found $SECRETS_FILE (will use for secrets)"
    SECRETS_FLAG="--secret-file $SECRETS_FILE"
else
    echo -e "${YELLOW}⚠${NC}  No $SECRETS_FILE found (some jobs may fail)"
    echo "   Create .secrets file with: SF_AUTH_URL_E2E_ORG=your-auth-url"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "🔍 STEP 1: VALIDATE HOOKS"
echo "═══════════════════════════════════════════════════"
echo ""

# Run pre-commit hooks
echo -e "${BLUE}Running pre-commit hooks...${NC}"
export WIREIT_PARALLEL=1
if yarn lint && yarn pretty-quick --staged; then
    echo -e "${GREEN}✓${NC} Pre-commit hooks passed"
else
    echo -e "${RED}✗${NC} Pre-commit hooks failed"
    echo "Fix lint/format issues before pushing"
    exit 1
fi

echo ""

# Run pre-push hooks
echo -e "${BLUE}Running pre-push hooks...${NC}"
if yarn build && yarn test; then
    echo -e "${GREEN}✓${NC} Pre-push hooks passed"
else
    echo -e "${RED}✗${NC} Pre-push hooks failed"
    echo "Fix build/test issues before pushing"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "🚀 STEP 2: RUNNING ACT (CI/CD Simulation)..."
echo "═══════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}Note:${NC} This will:"
echo "  1. Pull Docker images (first run only)"
echo "  2. Simulate GitHub Actions environment"
echo "  3. Run workflow jobs in containers"
echo "  4. Take ~5-15 min depending on workflow"
echo ""

# Run ACT
# -P: specify platform (use custom local image with yarn)
# --pull=false: don't pull images every time (faster)
# -j: specify job (optional, run specific job)
# --dryrun: just print what would run (optional)

# Check if custom image exists
CUSTOM_IMAGE="$HOME/dev/act"
if [ -f "$CUSTOM_IMAGE/Dockerfile" ] || docker images | grep -q "act-local"; then
    echo -e "${GREEN}✓${NC} Using custom ACT image with yarn support"
    PLATFORM_FLAG="-P ubuntu-latest=act-local:latest"
else
    echo -e "${YELLOW}⚠${NC}  Custom image not found, using default"
    PLATFORM_FLAG="-P ubuntu-latest=catthehacker/ubuntu:act-latest"
fi

if act pull_request \
    --workflows .github/workflows/$WORKFLOW \
    $SECRETS_FLAG \
    $PLATFORM_FLAG \
    --pull=false \
    --rm; then

    echo ""
    echo "═══════════════════════════════════════════════════"
    echo -e "${GREEN}✅ CI/CD PIPELINE VALIDATION PASSED${NC}"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "Safe to push! 🚀"
    echo ""
    exit 0
else
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo -e "${RED}❌ CI/CD PIPELINE VALIDATION FAILED${NC}"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "Fix issues before pushing!"
    echo ""
    exit 1
fi

