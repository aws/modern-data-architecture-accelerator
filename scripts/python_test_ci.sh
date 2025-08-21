#!/bin/bash
# Dedicated Python test script for CI/CD
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

echo "=== Python Test CI Script ==="
echo "Running from: $(pwd)"

# Install uv for Python testing (required)
if ! command -v uv >/dev/null 2>&1; then
    echo "Installing uv for Python testing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
    echo "uv installation complete"
else
    echo "uv already available: $(which uv)"
fi

# Verify uv is working
echo "uv version: $(uv --version)"

# Run Python tests
echo "Running Python tests across all packages..."
npm run test:python:all

echo "Python tests completed successfully!"