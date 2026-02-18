#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

npx nx reset

# Note: this script should be run before the final build/test
# Otherwise it might cause snapshot drift
python3 "$SCRIPT_DIR/fix_license_headers.py"

npx lerna run test:coverage --stream --no-ci -- --silent
