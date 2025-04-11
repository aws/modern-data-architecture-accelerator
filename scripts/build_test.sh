#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

echo "Running build/test script from $(pwd)"
npx lerna run test --stream
parent_path=$SCRIPT_DIR
echo "Parent Path: $parent_path"
python3 "$parent_path/fix_license_headers.py"
