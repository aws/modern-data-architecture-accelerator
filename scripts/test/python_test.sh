#!/bin/bash
# Run Python tests across all packages using nx
set -e

echo "Running Python tests across all packages..."

# Check if uv is available
if ! command -v uv >/dev/null 2>&1; then
    echo "❌ uv is required for Python testing but not found."
    echo "Please install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo "Or use your package manager: brew install uv"
    exit 1
fi

npx nx run-many -t test:python --all --parallel=5 --exclude=@aws-mdaa/gaia-l3-construct "$@"
