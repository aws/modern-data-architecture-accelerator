#!/bin/bash
set -e

# Validates documentation for changed packages only.
#
# Uses the same changed-only detection as lint_repo.sh to identify
# packages with direct file changes, then runs the test:package-docs NX target
# for those packages.
#
# On main or when MERGE_PIPELINE_RUN_ALL is set, validates all packages.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== Documentation Validation ==="

# On main or when MERGE_PIPELINE_RUN_ALL is set, test all packages.
if [ "${CI_COMMIT_BRANCH:-}" = "main" ] || [ "${MERGE_PIPELINE_RUN_ALL:-false}" = "true" ] || [ "${NX_RUN_ALL:-false}" = "true" ]; then
  echo "Running full doc validation (main or MERGE_PIPELINE_RUN_ALL=true)"
  npx nx run-many -t test:package-docs --all "$@"
else
  # Run doc validation only on packages with direct file changes
  source "$SCRIPT_DIR/../nx/affected-base.sh"

  CHANGED_PROJECTS=$(python3 "$SCRIPT_DIR/../nx/changed-only.py" "$NX_BASE" "$NX_HEAD")

  # Convert JSON array to comma-separated Nx run-many list
  PROJECT_LIST=$(echo "$CHANGED_PROJECTS" | python3 -c "import sys,json; print(','.join(json.load(sys.stdin)))")

  if [ -z "$PROJECT_LIST" ]; then
    echo "No packages with direct changes found, skipping doc validation."
    exit 0
  fi

  echo "Validating docs for directly changed packages: $PROJECT_LIST"
  npx nx run-many -t test:package-docs --projects="$PROJECT_LIST" "$@"
fi

echo "=== Documentation validation complete ==="
