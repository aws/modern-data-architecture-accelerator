#!/bin/bash
set -e

# Script to update all SCHEMA.md files in the repository
# This script regenerates all SCHEMA.md files from their corresponding config-schema.json files
#
# Usage: ./update_schemas.sh [path]
#   path: Optional path to search for schemas (default: ./packages/)
#
# Examples:
#   ./scripts/update_schemas.sh                           # Update all schemas in ./packages/
#   ./scripts/update_schemas.sh ./packages/apps/dataops/  # Update only dataops schemas
#   ./scripts/update_schemas.sh ./packages/cli/           # Update only CLI schemas
#
# Prerequisites:
#   - Python 3 with pip
#   - json-schema-for-humans package (install with: pip3 install json-schema-for-humans)
#
# The script will:
#   1. Find all config-schema.json files in the specified path
#   2. Generate SCHEMA.md files in the parent directory of each config-schema.json
#   3. Skip empty config-schema.json files
#   4. Report success/failure for each file
#   5. Exit with error code if any files fail to update

echo "=========================================="
echo "Updating SCHEMA.md files"
echo "=========================================="
echo ""

# Check if generate-schema-doc is available
if ! command -v generate-schema-doc &> /dev/null; then
    echo "Error: generate-schema-doc command not found"
    echo "Please install json-schema-for-humans:"
    echo "  pip3 install json-schema-for-humans"
    exit 1
fi

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

# Determine search path
SEARCH_PATH="${1:-./packages/}"

echo "Project root: $PROJECT_ROOT"
echo "Config file: $SCRIPT_DIR/jsfh-conf.yaml"
echo "Search path: $SEARCH_PATH"
echo ""

# Counter for tracking updates
UPDATED_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0

# Find all config-schema.json files and update their SCHEMA.md
echo "Searching for config-schema.json files in $SEARCH_PATH..."
echo ""

while IFS= read -r -d '' schema_file; do
    # Get the directory containing the schema file
    schema_dir="$(dirname "$schema_file")"
    
    # Get the parent directory (where SCHEMA.md should be)
    parent_dir="$(dirname "$schema_dir")"
    
    # Get relative path from project root for display
    relative_path="${schema_file#$PROJECT_ROOT/}"
    module_name="$(basename "$parent_dir")"
    
    # Check if config-schema.json is empty
    if [ ! -s "$schema_file" ]; then
        echo "⊘ Skipping $module_name (empty config-schema.json)"
        echo "  Path: $relative_path"
        ((SKIPPED_COUNT++))
        echo ""
        continue
    fi
    
    echo "→ Updating $module_name..."
    echo "  Schema: $relative_path"
    
    # Run generate-schema-doc and capture output
    if output=$(generate-schema-doc \
        --config-file "$SCRIPT_DIR/jsfh-conf.yaml" \
        "$schema_file" \
        "$parent_dir/SCHEMA.md" 2>&1); then
        
        if echo "$output" | grep -q "Generated SCHEMA.md"; then
            echo "  ✓ Successfully updated $parent_dir/SCHEMA.md"
            ((UPDATED_COUNT++))
        else
            echo "  ⚠ Command succeeded but output unexpected"
            echo "  Output: $output"
            ((UPDATED_COUNT++))
        fi
    else
        echo "  ✗ Failed to update $parent_dir/SCHEMA.md"
        echo "  Error: $output"
        ((FAILED_COUNT++))
    fi
    echo ""
done < <(find "$SEARCH_PATH" -name config-schema.json -print0 2>/dev/null)

# Print summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Successfully updated: $UPDATED_COUNT"
echo "Failed: $FAILED_COUNT"
echo "Skipped (empty): $SKIPPED_COUNT"
echo "Total processed: $((UPDATED_COUNT + FAILED_COUNT + SKIPPED_COUNT))"
echo ""

if [ $FAILED_COUNT -gt 0 ]; then
    echo "⚠ Some files failed to update. Please check the errors above."
    exit 1
else
    echo "✓ All SCHEMA.md files updated successfully!"
    exit 0
fi
