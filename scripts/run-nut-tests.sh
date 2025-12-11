#!/bin/bash
set -e

# ============================================================
# Profiler NUT Tests Runner
# ============================================================
# This script helps run NUT tests with proper configuration
# and provides helpful feedback about test coverage.
#
# Usage:
#   ./scripts/run-nut-tests.sh [options]
#
# Options:
#   --all          Run all NUT tests (default)
#   --retrieve     Run only retrieve tests
#   --compare      Run only compare tests
#   --docs         Run only docs tests
#   --basic        Run only basic tests (no org required)
#   --setup        Show setup instructions
#   --check        Check current configuration
# ============================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_org_auth() {
    local alias=$1
    if sf org display --target-org "$alias" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

show_setup() {
    print_header "NUT Tests Setup Instructions"
    
    echo "1️⃣  Authenticate with test orgs:"
    echo ""
    echo "   sf org login web --alias grg-poc"
    echo "   sf org login web --alias grg-qa"
    echo "   sf org login web --alias grg-uat"
    echo ""
    
    echo "2️⃣  Set environment variables:"
    echo ""
    echo "   export PROFILER_TEST_ORG_ALIAS=grg-poc"
    echo "   export PROFILER_TEST_ORG_ALIAS_2=grg-qa"
    echo "   export PROFILER_TEST_ORG_ALIAS_3=grg-uat"
    echo ""
    
    echo "3️⃣  (Optional) Save to ~/.profiler-test-env:"
    echo ""
    echo "   cat > ~/.profiler-test-env << 'EOF'"
    echo "   #!/bin/bash"
    echo "   export PROFILER_TEST_ORG_ALIAS=grg-poc"
    echo "   export PROFILER_TEST_ORG_ALIAS_2=grg-qa"
    echo "   export PROFILER_TEST_ORG_ALIAS_3=grg-uat"
    echo "   EOF"
    echo ""
    echo "   chmod +x ~/.profiler-test-env"
    echo ""
    
    echo "4️⃣  Run tests:"
    echo ""
    echo "   source ~/.profiler-test-env"
    echo "   ./scripts/run-nut-tests.sh"
    echo ""
    
    exit 0
}

check_config() {
    print_header "Current NUT Tests Configuration"
    
    local primary_org="${PROFILER_TEST_ORG_ALIAS:-<not set>}"
    local secondary_org="${PROFILER_TEST_ORG_ALIAS_2:-<not set>}"
    local tertiary_org="${PROFILER_TEST_ORG_ALIAS_3:-<not set>}"
    
    echo "Environment Variables:"
    echo "  PROFILER_TEST_ORG_ALIAS   = $primary_org"
    echo "  PROFILER_TEST_ORG_ALIAS_2 = $secondary_org"
    echo "  PROFILER_TEST_ORG_ALIAS_3 = $tertiary_org"
    echo ""
    
    echo "Org Authentication Status:"
    
    # Check primary org
    if [ -n "$PROFILER_TEST_ORG_ALIAS" ]; then
        if check_org_auth "$PROFILER_TEST_ORG_ALIAS"; then
            print_success "Primary org ($PROFILER_TEST_ORG_ALIAS) is authenticated"
        else
            print_error "Primary org ($PROFILER_TEST_ORG_ALIAS) is NOT authenticated"
        fi
    else
        print_warning "Primary org not configured"
    fi
    
    # Check secondary org
    if [ -n "$PROFILER_TEST_ORG_ALIAS_2" ]; then
        if check_org_auth "$PROFILER_TEST_ORG_ALIAS_2"; then
            print_success "Secondary org ($PROFILER_TEST_ORG_ALIAS_2) is authenticated"
        else
            print_error "Secondary org ($PROFILER_TEST_ORG_ALIAS_2) is NOT authenticated"
        fi
    else
        print_warning "Secondary org not configured (multi-source tests will be skipped)"
    fi
    
    # Check tertiary org
    if [ -n "$PROFILER_TEST_ORG_ALIAS_3" ]; then
        if check_org_auth "$PROFILER_TEST_ORG_ALIAS_3"; then
            print_success "Tertiary org ($PROFILER_TEST_ORG_ALIAS_3) is authenticated"
        else
            print_error "Tertiary org ($PROFILER_TEST_ORG_ALIAS_3) is NOT authenticated"
        fi
    else
        print_warning "Tertiary org not configured (multi-source tests will be skipped)"
    fi
    
    echo ""
    echo "Test Coverage Estimate:"
    
    local basic_tests=6
    local single_org_tests=8
    local multi_org_tests=6
    local total_tests=$basic_tests
    
    echo "  Basic tests (no org): $basic_tests tests ✅"
    
    if [ -n "$PROFILER_TEST_ORG_ALIAS" ]; then
        total_tests=$((total_tests + single_org_tests))
        echo "  Single-org tests: $single_org_tests tests ✅"
    else
        echo "  Single-org tests: $single_org_tests tests ⏭️  (skipped)"
    fi
    
    if [ -n "$PROFILER_TEST_ORG_ALIAS" ] && [ -n "$PROFILER_TEST_ORG_ALIAS_2" ] && [ -n "$PROFILER_TEST_ORG_ALIAS_3" ]; then
        total_tests=$((total_tests + multi_org_tests))
        echo "  Multi-org tests: $multi_org_tests tests ✅"
    else
        echo "  Multi-org tests: $multi_org_tests tests ⏭️  (skipped)"
    fi
    
    echo ""
    echo "Expected to run: $total_tests / 20 tests ($(( total_tests * 100 / 20 ))% coverage)"
    echo ""
    
    if [ $total_tests -eq 20 ]; then
        print_success "Full NUT test coverage available!"
    elif [ $total_tests -gt 6 ]; then
        print_warning "Partial NUT test coverage (configure more orgs for full coverage)"
    else
        print_warning "Only basic tests will run (configure orgs for full coverage)"
        print_info "Run './scripts/run-nut-tests.sh --setup' for instructions"
    fi
    
    exit 0
}

run_tests() {
    local test_file="$1"
    local test_name="$2"
    
    print_header "Running $test_name"
    
    echo "Test file: $test_file"
    echo ""
    
    if npm run test:nuts -- "$test_file"; then
        print_success "$test_name passed!"
        return 0
    else
        print_error "$test_name failed!"
        return 1
    fi
}

# Main script
MODE="${1:---all}"

case "$MODE" in
    --setup)
        show_setup
        ;;
    --check)
        check_config
        ;;
    --basic)
        print_header "Running Basic NUT Tests (no org required)"
        print_warning "Org-dependent tests will be skipped"
        echo ""
        
        # Temporarily unset org variables
        unset PROFILER_TEST_ORG_ALIAS
        unset PROFILER_TEST_ORG_ALIAS_2
        unset PROFILER_TEST_ORG_ALIAS_3
        
        npm run test:nuts
        ;;
    --retrieve)
        run_tests "test/commands/profiler/retrieve.nut.ts" "Retrieve NUT Tests"
        ;;
    --compare)
        run_tests "test/commands/profiler/compare.nut.ts" "Compare NUT Tests"
        ;;
    --docs)
        run_tests "test/commands/profiler/docs.nut.ts" "Docs NUT Tests"
        ;;
    --all)
        print_header "Running All NUT Tests"
        
        # Show current config
        echo "Current configuration:"
        echo "  Primary org: ${PROFILER_TEST_ORG_ALIAS:-<not set>}"
        echo "  Secondary org: ${PROFILER_TEST_ORG_ALIAS_2:-<not set>}"
        echo "  Tertiary org: ${PROFILER_TEST_ORG_ALIAS_3:-<not set>}"
        echo ""
        
        if [ -z "$PROFILER_TEST_ORG_ALIAS" ]; then
            print_warning "No orgs configured - only basic tests will run"
            print_info "Run './scripts/run-nut-tests.sh --setup' for instructions"
            echo ""
        fi
        
        npm run test:nuts
        ;;
    *)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --all          Run all NUT tests (default)"
        echo "  --retrieve     Run only retrieve tests"
        echo "  --compare      Run only compare tests"
        echo "  --docs         Run only docs tests"
        echo "  --basic        Run only basic tests (no org required)"
        echo "  --setup        Show setup instructions"
        echo "  --check        Check current configuration"
        echo ""
        exit 1
        ;;
esac

