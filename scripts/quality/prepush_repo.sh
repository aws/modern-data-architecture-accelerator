#!/bin/bash
# Pre-push validation — mirrors the MR pipeline gates locally.
# Stops on first failure.
#
# Usage:
#   ./scripts/quality/prepush_repo.sh                    # affected only, uses cache (fast)
#   NX_RUN_ALL=true ./scripts/quality/prepush_repo.sh   # all packages, no cache (thorough)
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."
cd "$PROJECT_ROOT"

# --- Determine scope ---
if [ "${NX_RUN_ALL:-false}" = "true" ] || [ "${MERGE_PIPELINE_RUN_ALL:-false}" = "true" ]; then
  MODE="all"
  NX_LINT="npx nx run-many -t lint --all --skip-nx-cache"
  NX_PRETTIER="npx nx run-many -t prettier --all --skip-nx-cache"
  NX_BUILD_TEST="npx nx run-many -t build test --all --skip-nx-cache"
else
  MODE="affected"
  source "$SCRIPT_DIR/../nx/affected-base.sh"
  NX_ARGS="--base=$NX_BASE --head=$NX_HEAD"
  NX_LINT="npx nx affected -t lint $NX_ARGS"
  NX_PRETTIER="npx nx affected -t prettier $NX_ARGS"
  NX_BUILD_TEST="npx nx affected -t build test $NX_ARGS"
fi

echo "=== Pre-push validation (mode: $MODE) ==="
echo ""

# --- Stage 1: Prebuild checks ---
echo "--- [1/6] Validating package structure ---"
./scripts/quality/validate_packages.sh

echo ""
echo "--- [2/6] Validating dependency lock file ---"
./scripts/quality/validate_dependencies.sh

echo ""
echo "--- [3/6] Linting TypeScript ($MODE) ---"
$NX_LINT

echo ""
echo "--- [4/6] Linting Python ---"
./scripts/quality/lint_python.sh

echo ""
echo "--- [5/6] Running prettier ($MODE) ---"
$NX_PRETTIER

# --- Stage 2: Build + test ---
echo ""
echo "--- [6/6] Building + testing ($MODE) ---"
$NX_BUILD_TEST

echo ""
echo "=== Validation passed ($MODE) ==="
