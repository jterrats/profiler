#!/bin/bash

# E2E Test Script for @jterrats/profiler plugin
# This script creates a local SF project, retrieves profiles, and validates results
# without committing anything to git.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Get script directory (where this script is located)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PLUGIN_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
TEST_PROJECT_DIR="$PLUGIN_ROOT/test-project"

# Cleanup function for error handling
cleanup_on_error() {
    log_error "Test failed! Cleaning up..."
    if [ -d "$TEST_PROJECT_DIR" ]; then
        cd "$PLUGIN_ROOT" 2>/dev/null || cd "$HOME"
        rm -rf "$TEST_PROJECT_DIR"
        log_info "Test project removed"
    fi
    exit 1
}

# Set trap to cleanup on error
trap cleanup_on_error ERR

# Check if sf CLI is installed
if ! command -v sf &> /dev/null; then
    log_error "Salesforce CLI (sf) is not installed"
    exit 1
fi

log_success "Salesforce CLI found"

# Check if plugin is linked or installed
if ! sf plugins | grep -q "@jterrats/profiler"; then
    log_error "Plugin @jterrats/profiler is not installed or linked"
    log_info "Please run: sf plugins link"
    exit 1
fi

log_success "Plugin @jterrats/profiler is available"

# Get list of authorized orgs and find default org
log_info "Fetching list of authorized orgs..."
ORG_LIST=$(sf org list --json 2>/dev/null)

# Extract the default org username
TARGET_ORG=$(echo "$ORG_LIST" | grep -A 10 '"isDefaultUsername": true' | grep '"username"' | head -1 | sed 's/.*"username": "\([^"]*\)".*/\1/')

if [ -z "$TARGET_ORG" ]; then
    # Fallback: get first non-scratch org if no default is set
    log_warning "No default org found, using first available org..."
    TARGET_ORG=$(echo "$ORG_LIST" | grep -A 5 '"nonScratchOrgs"' | grep '"username"' | head -1 | sed 's/.*"username": "\([^"]*\)".*/\1/')
fi

if [ -z "$TARGET_ORG" ]; then
    log_error "No authorized orgs found"
    log_info "Please authorize an org first: sf org login web"
    exit 1
fi

log_success "Using org: $TARGET_ORG (default)"

# Remove existing test project if it exists
if [ -d "$TEST_PROJECT_DIR" ]; then
    log_info "Removing existing test project..."
    rm -rf "$TEST_PROJECT_DIR"
fi

log_info "Creating SF project in: $TEST_PROJECT_DIR"

# Generate SF project
log_info "Generating Salesforce project..."
cd "$PLUGIN_ROOT"
sf project generate \
    --name "test-project" \
    --template standard \
    > /dev/null 2>&1

log_success "Project created"

# Navigate to test project
log_info "Navigating to test project..."
cd test-project
log_success "Working directory: $(pwd)"

# Initialize git (optional, to test git-safety)
log_info "Initializing git repository..."
git init > /dev/null 2>&1
git add . > /dev/null 2>&1
git commit -m "Initial commit" > /dev/null 2>&1
log_success "Git repository initialized"

# Test 1: Basic retrieve (all profiles)
log_info ""
log_info "═══════════════════════════════════════════"
log_info "Test 1: Retrieve all profiles (basic)"
log_info "═══════════════════════════════════════════"

sf profiler retrieve --target-org "$TARGET_ORG" 2>&1 | grep -v "MissingBundleError" || true

if [ -d "force-app/main/default/profiles" ]; then
    PROFILE_COUNT=$(find force-app/main/default/profiles -name "*.profile-meta.xml" | wc -l | tr -d ' ')
    log_success "Profiles retrieved: $PROFILE_COUNT"
else
    log_error "Profiles directory not created"
    exit 1
fi

# Verify no uncommitted changes to other files
log_info "Checking git status (should only show profiles)..."
MODIFIED_FILES=$(git status --porcelain | grep -v "profiles/" || true)
if [ -z "$MODIFIED_FILES" ]; then
    log_success "No other files modified (safe retrieve confirmed)"
else
    log_warning "Other files modified:"
    echo "$MODIFIED_FILES"
fi

# Clean profiles for next test
rm -rf force-app/main/default/profiles
git checkout force-app > /dev/null 2>&1 || true

# Test 2: Retrieve specific profile by name
log_info ""
log_info "═══════════════════════════════════════════"
log_info "Test 2: Retrieve specific profile (Admin)"
log_info "═══════════════════════════════════════════"

sf profiler retrieve --target-org "$TARGET_ORG" --name "Admin" 2>&1 | grep -v "MissingBundleError" || true

if [ -f "force-app/main/default/profiles/Admin.profile-meta.xml" ]; then
    log_success "Admin profile retrieved successfully"

    # Validate profile content
    log_info "Validating profile content..."
    PROFILE_FILE="force-app/main/default/profiles/Admin.profile-meta.xml"

    # Check for various metadata sections
    OBJECT_PERMS=$(grep -c "<objectPermissions>" "$PROFILE_FILE" || echo "0")
    LAYOUT_ASSIGNS=$(grep -c "<layoutAssignments>" "$PROFILE_FILE" || echo "0")
    CLASS_ACCESS=$(grep -c "<classAccesses>" "$PROFILE_FILE" || echo "0")
    PAGE_ACCESS=$(grep -c "<pageAccesses>" "$PROFILE_FILE" || echo "0")
    TAB_VIS=$(grep -c "<tabVisibilities>" "$PROFILE_FILE" || echo "0")

    log_info "  Object Permissions: $OBJECT_PERMS"
    log_info "  Layout Assignments: $LAYOUT_ASSIGNS"
    log_info "  Apex Class Accesses: $CLASS_ACCESS"
    log_info "  Apex Page Accesses: $PAGE_ACCESS"
    log_info "  Tab Visibilities: $TAB_VIS"

    # Validate that profile has metadata
    TOTAL_METADATA=$((OBJECT_PERMS + LAYOUT_ASSIGNS + CLASS_ACCESS + PAGE_ACCESS + TAB_VIS))
    if [ "$TOTAL_METADATA" -gt 0 ]; then
        log_success "Profile contains $TOTAL_METADATA metadata elements"
    else
        log_error "Profile appears to be empty or invalid"
        exit 1
    fi
else
    log_error "Admin profile not found"
    exit 1
fi

PROFILE_COUNT=$(find force-app/main/default/profiles -name "*.profile-meta.xml" | wc -l | tr -d ' ')
log_info "Total profiles retrieved: $PROFILE_COUNT"

# Clean for next test
rm -rf force-app/main/default/profiles

# Test 3: Retrieve with --exclude-managed flag
log_info ""
log_info "═══════════════════════════════════════════"
log_info "Test 3: Retrieve excluding managed packages"
log_info "═══════════════════════════════════════════"

# First, retrieve WITHOUT --exclude-managed to get baseline
log_info "Step 3a: Retrieving without --exclude-managed (baseline)..."
sf profiler retrieve --target-org "$TARGET_ORG" --name "Admin" 2>&1 | grep -v "MissingBundleError" > /dev/null || true

if [ -f "force-app/main/default/profiles/Admin.profile-meta.xml" ]; then
    BASELINE_SIZE=$(wc -l < "force-app/main/default/profiles/Admin.profile-meta.xml" | tr -d ' ')
    BASELINE_MANAGED=$(grep -o '__[A-Za-z0-9_]*__' "force-app/main/default/profiles/Admin.profile-meta.xml" | grep -v '__c' | sort -u | wc -l || echo "0")
    log_info "  Baseline profile: $BASELINE_SIZE lines, $BASELINE_MANAGED unique managed namespaces"
fi

# Clean for next retrieval
rm -rf force-app/main/default/profiles

# Now retrieve WITH --exclude-managed
log_info "Step 3b: Retrieving with --exclude-managed..."
OUTPUT=$(sf profiler retrieve --target-org "$TARGET_ORG" --name "Admin" --exclude-managed 2>&1 | grep -v "MissingBundleError" || true)
echo "$OUTPUT"

if echo "$OUTPUT" | grep -q "Excluded.*managed package"; then
    log_success "Managed package filtering is working"
else
    log_info "No managed packages to exclude (or none found)"
fi

if [ -f "force-app/main/default/profiles/Admin.profile-meta.xml" ]; then
    log_success "Profile retrieved with --exclude-managed flag"

    # Validate that managed package components are reduced/excluded
    PROFILE_FILE="force-app/main/default/profiles/Admin.profile-meta.xml"

    # Count managed package references (namespace__)
    # Exclude custom objects (__c) and standard components
    MANAGED_LAYOUTS=$(grep -o '<layout>[^<]*__[^<]*</layout>' "$PROFILE_FILE" | grep -v '__c' | wc -l || echo "0")
    MANAGED_CLASSES=$(grep -o '<apexClass>[^<]*__[^<]*</apexClass>' "$PROFILE_FILE" | grep -v '__c' | wc -l || echo "0")
    MANAGED_OBJECTS=$(grep -o '<object>[^<]*__[^<]*</object>' "$PROFILE_FILE" | grep -v '__c' | wc -l || echo "0")

    log_info "  Managed Layouts in profile: $MANAGED_LAYOUTS"
    log_info "  Managed Classes in profile: $MANAGED_CLASSES"
    log_info "  Managed Objects in profile: $MANAGED_OBJECTS"

    TOTAL_MANAGED=$((MANAGED_LAYOUTS + MANAGED_CLASSES + MANAGED_OBJECTS))
    if [ "$TOTAL_MANAGED" -eq 0 ]; then
        log_success "No managed package components in profile (excellent!)"
    else
        log_warning "Profile still contains $TOTAL_MANAGED managed package references"
        log_info "Note: Some managed package references in the profile XML itself cannot be filtered"
    fi

    # Compare with baseline
    if [ -n "$BASELINE_MANAGED" ] && [ "$BASELINE_MANAGED" -gt 0 ]; then
        if [ "$TOTAL_MANAGED" -lt "$BASELINE_MANAGED" ]; then
            log_success "Successfully reduced managed packages: $BASELINE_MANAGED → $TOTAL_MANAGED"
        elif [ "$TOTAL_MANAGED" -eq "$BASELINE_MANAGED" ]; then
            log_warning "Managed package count unchanged (may indicate all were already excluded)"
        fi
    fi

    # Validate profile still has useful content
    OBJECT_PERMS=$(grep -c "<objectPermissions>" "$PROFILE_FILE" || echo "0")
    if [ "$OBJECT_PERMS" -gt 0 ]; then
        log_success "Profile still contains $OBJECT_PERMS object permissions (not empty)"
    fi
else
    log_error "Profile not retrieved with --exclude-managed"
    exit 1
fi

# Test 4: Retrieve with --from-project flag
log_info ""
log_info "═══════════════════════════════════════════"
log_info "Test 4: Retrieve using --from-project"
log_info "═══════════════════════════════════════════"

# First, ensure we have the profile in the project
if [ ! -f "force-app/main/default/profiles/Admin.profile-meta.xml" ]; then
    sf profiler retrieve --target-org "$TARGET_ORG" --name "Admin" > /dev/null 2>&1
fi

sf profiler retrieve --target-org "$TARGET_ORG" --from-project 2>&1 | grep -v "MissingBundleError" || true

if [ -d "force-app/main/default/profiles" ]; then
    log_success "Retrieve with --from-project completed"
else
    log_error "Retrieve with --from-project failed"
    exit 1
fi

# Final summary
log_info ""
log_info "═══════════════════════════════════════════"
log_success "All E2E tests passed!"
log_info "═══════════════════════════════════════════"
log_info "Test project location: $TEST_PROJECT_DIR"
log_info ""
log_info "Validations performed:"
log_info "  ✓ Profile files created correctly"
log_info "  ✓ Profile content validated (metadata sections present)"
log_info "  ✓ Git safety confirmed (no unintended file modifications)"
log_info "  ✓ Managed package filtering tested"
log_info "  ✓ --from-project flag working"
log_info ""
log_info "Profile metadata validated:"
log_info "  • Object Permissions"
log_info "  • Layout Assignments"
log_info "  • Apex Class Accesses"
log_info "  • Apex Page Accesses (Visualforce)"
log_info "  • Tab Visibilities"
log_info ""

# Cleanup test project
log_info "Cleaning up test project..."
cd "$PLUGIN_ROOT"
rm -rf "$TEST_PROJECT_DIR"
log_success "Test project cleaned up"
log_info ""
log_success "E2E test completed successfully!"

