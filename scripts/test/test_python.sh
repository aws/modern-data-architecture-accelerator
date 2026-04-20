#!/bin/bash
# Run Python tests on affected packages only
set -e

echo "Running Python tests (affected packages)"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if ! command -v uv >/dev/null 2>&1; then
    echo "❌ uv is required for Python testing but not found."
    echo "Please install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

source "$SCRIPT_DIR/../nx/affected-base.sh"
npx nx affected -t test:python --base="$NX_BASE" --head="$NX_HEAD" --parallel=5 "$@"
