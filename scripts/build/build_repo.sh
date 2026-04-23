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

if [ "${NX_RUN_ALL:-false}" = "true" ]; then
  npx lerna run build --stream --skip-nx-cache
else
  npx lerna run build --stream
fi
