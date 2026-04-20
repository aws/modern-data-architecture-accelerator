#!/bin/bash
set -e

echo "Running prettier check"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run prettier only on packages with direct file changes (not transitive dependents)
source "$SCRIPT_DIR/../nx/affected-base.sh"

CHANGED_PROJECTS=$(python3 "$SCRIPT_DIR/../nx/changed-only.py" "$NX_BASE" "$NX_HEAD")

# Convert JSON array to comma-separated Nx run-many list
PROJECT_LIST=$(echo "$CHANGED_PROJECTS" | python3 -c "import sys,json; print(','.join(json.load(sys.stdin)))")

if [ -z "$PROJECT_LIST" ]; then
  echo "No packages with direct changes found, skipping prettier"
  exit 0
fi

echo "Running prettier on directly changed packages: $PROJECT_LIST"
npx nx run-many -t prettier --projects="$PROJECT_LIST" "$@"
