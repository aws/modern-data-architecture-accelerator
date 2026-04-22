#!/bin/bash
# Run Python tests.
#   Default: affected packages only
#   NX_RUN_ALL=true: all packages
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if ! command -v uv >/dev/null 2>&1; then
    echo "❌ uv is required for Python testing but not found."
    echo "Please install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

source "$SCRIPT_DIR/../nx/affected-base.sh"

if [ "${NX_RUN_ALL:-false}" = "true" ]; then
  echo "Running Python tests (all packages)"
  npx nx run-many -t test:python --all --parallel=5 --exclude=@aws-mdaa/gaia-l3-construct "$@"
else
  echo "Running Python tests (affected packages)"
  npx nx affected -t test:python --base="$NX_BASE" --head="$NX_HEAD" --parallel=5 --exclude=@aws-mdaa/gaia-l3-construct "$@"
fi
