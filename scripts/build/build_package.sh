#!/bin/bash
set -e

# Builds an MDAA app package:
#   1. Compiles TypeScript
#   2. Generates config-schema.json from the specified TypeScript config class
#   3. Copies the schema to the central schemas/ directory
#   4. Generates SCHEMA.md documentation from the schema
#
# Usage: build_package.sh <ConfigClassName>
#
# Must be run from the package root directory (e.g. packages/apps/dataops/dataops-job-app/)

CONFIG_CLASS="$1"

if [ -z "$CONFIG_CLASS" ]; then
    echo "Error: Config class name is required"
    echo "Usage: build_package.sh <ConfigClassName>"
    exit 1
fi

# Resolve project root relative to this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Resolve node_modules and schemas relative to project root
NODE_MODULES="$PROJECT_ROOT/node_modules"
SCHEMAS_DIR="$PROJECT_ROOT/schemas"
JSFH_CONF="$PROJECT_ROOT/scripts/generate_docs/jsfh-conf.yaml"

# 1. Compile TypeScript
tsc

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
