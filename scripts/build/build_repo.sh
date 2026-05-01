#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."
cd "$PROJECT_ROOT"

# In CI, stop the Nx daemon to avoid stale state
if [ "${CI:-}" = "true" ]; then
    npx nx daemon --stop 2>/dev/null || true
fi

# Note: this should be run before the final build/test
# Otherwise it might cause snapshot drift
python3 "$SCRIPT_DIR/fix_license_headers.py"

# Compute affected base/head and (optionally) set NX_RUN_ALL
source "$SCRIPT_DIR/../nx/affected-base.sh"

if [ "${CI:-}" = "true" ] && [ "${CI_COMMIT_BRANCH:-}" = "main" ] || [ "${NX_RUN_ALL:-false}" = "true" ]; then
  echo "Running full build (main or NX_RUN_ALL=true)"
  npx lerna run build --stream --skip-nx-cache
else
  echo "Running affected build (base: $NX_BASE)"
  npx nx affected -t build --base="$NX_BASE" --head="$NX_HEAD"
fi
