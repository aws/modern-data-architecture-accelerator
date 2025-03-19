#!/bin/bash
set -e
echo "Running build/test script"
npx lerna run test --stream
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
python3 $parent_path/fix_license_headers.py




