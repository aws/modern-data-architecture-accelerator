#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."
cd "$PROJECT_ROOT"

# Stop the Nx daemon to avoid stale state, but preserve the cache
npx nx daemon --stop 2>/dev/null || true

# Note: this should be run before the final build/test
# Otherwise it might cause snapshot drift
python3 "$SCRIPT_DIR/fix_license_headers.py"

npx lerna run build --stream
