#!/bin/bash

# Example CI/CD Pipeline Script for Profiler Plugin
# This script demonstrates how to use the profiler plugin in a CI/CD environment

set -e  # Exit on error

echo "================================"
echo "Profiler Plugin CI/CD Example"
echo "================================"

# Configuration
TARGET_ORG="${TARGET_ORG:-dev-sandbox}"
INCLUDE_FLS="${INCLUDE_FLS:-false}"
API_VERSION="${API_VERSION:-60.0}"

echo "Configuration:"
echo "  Target Org: $TARGET_ORG"
echo "  Include FLS: $INCLUDE_FLS"
echo "  API Version: $API_VERSION"
echo ""

# Step 1: Authenticate to Salesforce
echo "Step 1: Authenticating to Salesforce..."
if [ -n "$SFDX_AUTH_URL" ]; then
    echo "$SFDX_AUTH_URL" > authfile.txt
    sf org login sfdx-url --sfdx-url-file authfile.txt --alias "$TARGET_ORG"
    rm authfile.txt
else
    echo "Warning: SFDX_AUTH_URL not set. Assuming already authenticated."
fi

# Step 2: Retrieve profiles
echo ""
echo "Step 2: Retrieving profiles from $TARGET_ORG..."

RETRIEVE_CMD="sf profiler retrieve --target-org $TARGET_ORG --api-version $API_VERSION --json"

if [ "$INCLUDE_FLS" = "true" ]; then
    RETRIEVE_CMD="$RETRIEVE_CMD --all-fields"
    echo "  Including Field Level Security"
else
    echo "  Excluding Field Level Security"
fi

# Execute retrieve and capture output
RESULT=$(eval "$RETRIEVE_CMD")
echo "$RESULT" > retrieve-result.json

# Step 3: Parse results
echo ""
echo "Step 3: Parsing results..."
SUCCESS=$(echo "$RESULT" | jq -r '.result.success')
PROFILES_RETRIEVED=$(echo "$RESULT" | jq -r '.result.profilesRetrieved')

if [ "$SUCCESS" = "true" ]; then
    echo "  ✓ Successfully retrieved $PROFILES_RETRIEVED profiles"
else
    echo "  ✗ Retrieval failed"
    exit 1
fi

# Step 4: Validate changes
echo ""
echo "Step 4: Validating changes..."

# Check if there are any changes
if git diff --quiet force-app/main/default/profiles/; then
    echo "  No changes detected in profiles"
else
    echo "  Changes detected in profiles:"
    git diff --stat force-app/main/default/profiles/
fi

# Step 5: Optional - Run tests on retrieved profiles
echo ""
echo "Step 5: Running validation tests..."
# Add your custom validation logic here
# Example: Check for required permissions, validate profile structure, etc.

# Step 6: Create a report
echo ""
echo "Step 6: Creating retrieval report..."
cat > profile-retrieval-report.md << EOF
# Profile Retrieval Report

**Date**: $(date)
**Target Org**: $TARGET_ORG
**API Version**: $API_VERSION
**Include FLS**: $INCLUDE_FLS

## Results

- **Success**: $SUCCESS
- **Profiles Retrieved**: $PROFILES_RETRIEVED

## Changed Files

\`\`\`
$(git diff --name-only force-app/main/default/profiles/)
\`\`\`

## Detailed Changes

\`\`\`diff
$(git diff force-app/main/default/profiles/)
\`\`\`
EOF

echo "  Report created: profile-retrieval-report.md"

# Step 7: Optional - Commit changes (if in automated environment)
echo ""
echo "Step 7: Git operations..."
if [ "${AUTO_COMMIT:-false}" = "true" ]; then
    echo "  Committing changes..."
    git add force-app/main/default/profiles/
    git commit -m "chore: update profiles from $TARGET_ORG [skip ci]" || echo "  No changes to commit"

    if [ "${AUTO_PUSH:-false}" = "true" ]; then
        echo "  Pushing changes..."
        git push origin HEAD
    fi
else
    echo "  Skipping auto-commit (set AUTO_COMMIT=true to enable)"
fi

echo ""
echo "================================"
echo "Profile Retrieval Complete!"
echo "================================"

