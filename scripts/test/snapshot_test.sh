#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."
cd "$PROJECT_ROOT"

source "$SCRIPT_DIR/../nx/affected-base.sh"

echo "Running affected snapshot tests (base: $NX_BASE)"
npx nx affected -t test:snapshots --base="$NX_BASE" --head="$NX_HEAD" --parallel=10 -- --silent --reporters=default
