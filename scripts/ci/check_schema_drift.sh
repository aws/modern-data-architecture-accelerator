#!/bin/bash
set -e

# Detects uncommitted config-schema.json or SCHEMA.md changes after build.
# If the build produces different schemas than what's committed, the developer
# forgot to run 'npm run build' locally before pushing.

echo "Checking for schema drift..."

CHANGED=$(git diff --name-only -- 'schemas/@aws-mdaa/' '**/config-schema.json' '**/SCHEMA.md')

if [ -n "$CHANGED" ]; then
    echo ""
    echo "=========================================="
    echo "ERROR: Schema files changed after build"
    echo "=========================================="
    echo ""
    echo "The following files differ from what was committed:"
    echo "$CHANGED"
    echo ""
    git diff --stat -- 'schemas/@aws-mdaa/' '**/config-schema.json' '**/SCHEMA.md'
    echo ""
    echo "Run 'npm run build' locally and commit the updated schema files."
    exit 1
fi

echo "No schema drift detected."
