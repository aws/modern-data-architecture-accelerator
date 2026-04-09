#!/bin/bash
set -e

echo "Running lintcheck"

# Check @aws-mdaa package versions for caret prefixes
./scripts/check-aws-mdaa-versions.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run linting only on packages with direct file changes (not transitive dependents)
source "$SCRIPT_DIR/nx/affected-base.sh"

CHANGED_PROJECTS=$(python3 "$SCRIPT_DIR/nx/changed-only.py" "$NX_BASE" "$NX_HEAD")

# Convert JSON array to comma-separated Nx run-many list
PROJECT_LIST=$(echo "$CHANGED_PROJECTS" | python3 -c "import sys,json; print(','.join(json.load(sys.stdin)))")

if [ -z "$PROJECT_LIST" ]; then
  echo "No packages with direct changes found, skipping lint"
  exit 0
fi

echo "Linting directly changed packages: $PROJECT_LIST"
npx nx run-many -t lint --projects="$PROJECT_LIST" --parallel=10
