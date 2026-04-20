#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Running test script."

# Run TypeScript tests (affected only)
echo "Running TypeScript tests..."
source "$SCRIPT_DIR/../nx/affected-base.sh"
npx nx affected -t test --base="$NX_BASE" --head="$NX_HEAD" "$@"

# Run Python tests
echo "Running Python tests..."
npm run test:python:all
