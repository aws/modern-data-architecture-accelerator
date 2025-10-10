#!/bin/bash
set -e

echo "Validating package dependencies..."

# Check if package-lock.json is in sync with package.json
if ! npm ci --dry-run --ignore-scripts > /tmp/npm_ci_output 2>&1; then
    echo "ERROR: package-lock.json is out of sync with package.json"
    echo "Details:"
    cat /tmp/npm_ci_output | grep -E "(Missing|npm error|EUSAGE)" || cat /tmp/npm_ci_output
    echo ""
    echo "To fix: Run 'npm install' to update the lock file"
    exit 1
fi

echo "✓ Dependencies are in sync"