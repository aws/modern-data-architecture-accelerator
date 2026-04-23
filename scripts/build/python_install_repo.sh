#!/bin/bash
# Install Python dev dependencies into a uv-managed virtual environment.
# Creates .venv at the repo root if it doesn't exist, activates it, and installs packages.
#
# Usage: ./scripts/build/python_install_repo.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV_DIR="$PROJECT_ROOT/.venv"
PYTHON_VERSION="3.13"

# Ensure uv is available
if ! command -v uv >/dev/null 2>&1; then
  echo "❌ uv is required but not found."
  echo "Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

# Create venv if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
  echo "Creating Python $PYTHON_VERSION virtual environment at $VENV_DIR..."
  uv venv --python "$PYTHON_VERSION" "$VENV_DIR"
fi

# Activate venv
source "$VENV_DIR/bin/activate"

# Install dependencies
echo "Installing Python dev dependencies into venv..."
uv pip install -r "$PROJECT_ROOT/requirements-dev.txt"

echo ""
echo "✅ Python dependencies installed into $VENV_DIR"
echo "To activate in your shell: source .venv/bin/activate"
