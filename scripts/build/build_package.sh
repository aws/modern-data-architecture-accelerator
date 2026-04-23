#!/bin/bash
set -e

# Builds an MDAA app package.
#
# Default (dev/CI) mode:
#   1. Compiles TypeScript (delegates to build_package_code.sh)
#   2. Generates config-schema.json from the specified TypeScript config class
#   3. Copies the schema to the central schemas/ directory
#   4. Generates SCHEMA.md documentation from the schema
#
# Code-only mode (MDAA_BUILD_CODE_ONLY=true):
#   Only compiles TypeScript — skips schema generation and documentation.
#   Used by the CLI at deploy time to build local modules without the overhead
#   of schema and doc generation.
#
# Usage: build_package.sh <ConfigClassName>
#
# Must be run from the package root directory (e.g. packages/apps/dataops/dataops-job-app/)

# Resolve project root relative to this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 1. Compile TypeScript
"$SCRIPT_DIR/build_package_code.sh"

# In code-only mode, skip schema generation and documentation
if [ "${MDAA_BUILD_CODE_ONLY:-}" = "true" ]; then
    exit 0
fi

CONFIG_CLASS="$1"

if [ -z "$CONFIG_CLASS" ]; then
    echo "Error: Config class name is required"
    echo "Usage: build_package.sh <ConfigClassName>"
    exit 1
fi

# Resolve node_modules and schemas relative to project root
NODE_MODULES="$PROJECT_ROOT/node_modules"
SCHEMAS_DIR="$PROJECT_ROOT/schemas"
JSFH_CONF="$PROJECT_ROOT/scripts/generate_docs/jsfh-conf.yaml"

# 2. Generate config-schema.json
typescript-json-schema \
    --required \
    --noExtraProps \
    tsconfig.json "$CONFIG_CLASS" \
    --include 'lib/*.ts' \
    --include "$NODE_MODULES/@types/**/*.ts" \
    --include 'lib/config-schema.json' \
    > lib/config-schema.json

# 3. Copy schema to central schemas directory
cp lib/config-schema.json "$SCHEMAS_DIR/${npm_package_name}.json"

# 4. Generate SCHEMA.md documentation
if ! python3 -c "import json_schema_for_humans" &> /dev/null; then
    echo "Error: json-schema-for-humans Python package not found"
    echo "Install with: npm run python-install"
    exit 1
fi

python3 -m json_schema_for_humans.cli \
    --config-file "$JSFH_CONF" \
    lib/config-schema.json \
    SCHEMA.md
