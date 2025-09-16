#!/bin/bash
set -e

echo "🔍 Checking @aws-mdaa package versions for caret prefixes..."

# Find all package.json files in the monorepo, excluding all node_modules directories
PACKAGE_FILES=$(find . -name "package.json" -not -path "*/node_modules/*" -not -path "./.git/*")

VIOLATIONS_FOUND=0
VIOLATION_DETAILS=""

# Check each package.json file
for package_file in $PACKAGE_FILES; do
    echo "Checking: $package_file"
    
    # Check dependencies, devDependencies, and peerDependencies for @aws-mdaa packages with caret prefix
    CARET_VIOLATIONS=$(grep -E '"@aws-mdaa/[^"]*":\s*"\^' "$package_file" || true)
    
    if [ ! -z "$CARET_VIOLATIONS" ]; then
        VIOLATIONS_FOUND=1
        echo "❌ VIOLATION FOUND in $package_file:"
        echo "$CARET_VIOLATIONS"
        VIOLATION_DETAILS="$VIOLATION_DETAILS\n❌ $package_file:\n$CARET_VIOLATIONS\n"
    fi
done

if [ $VIOLATIONS_FOUND -eq 1 ]; then
    echo ""
    echo "🚨 ERROR: Found @aws-mdaa packages with caret (^) prefixes!"
    echo "=========================================================="
    echo -e "$VIOLATION_DETAILS"
    echo "=========================================================="
    echo ""
    echo "📋 To fix these violations:"
    echo "1. Remove the '^' prefix from @aws-mdaa package versions"
    echo "2. Use exact versions (e.g., '1.1.0' instead of '^1.1.0')"
    echo ""
    echo "Example fix:"
    echo "  Before: \"@aws-mdaa/some-package\": \"^1.1.0\""
    echo "  After:  \"@aws-mdaa/some-package\": \"1.1.0\""
    echo ""
    exit 1
else
    echo "✅ All @aws-mdaa packages use exact versions (no caret prefixes found)"
    exit 0
fi