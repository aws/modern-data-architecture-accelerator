#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# Ensures Python dev dependencies are available for build scripts.
#
# In CI: Python packages are pre-installed system-wide in the Docker image,
#         so this script is a no-op.
# Locally: Creates a .venv at the repo root (if needed), installs deps from
#           requirements-dev.txt, and activates it for the current shell.
#
# Usage: source this script from other build scripts that need Python deps.
#   source "$(dirname "${BASH_SOURCE[0]}")/ensure_python_env.sh"

ENSURE_PYTHON_VERSION="3.13"
ENSURE_PYTHON_VENV_NAME=".build_venv"
ENSURE_PYTHON_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENSURE_PYTHON_PROJECT_ROOT="$(cd "$ENSURE_PYTHON_SCRIPT_DIR/../.." && pwd)"
ENSURE_PYTHON_VENV_DIR="$ENSURE_PYTHON_PROJECT_ROOT/$ENSURE_PYTHON_VENV_NAME"
ENSURE_PYTHON_REQUIREMENTS="$ENSURE_PYTHON_PROJECT_ROOT/requirements-dev.txt"

# In CI, Python deps are pre-installed system-wide in the Docker image — skip venv setup.
if [ "${CI:-}" = "true" ]; then
    echo "CI detected — skipping venv creation. All Python deps must be provided by the CI environment."
    return 0 2>/dev/null || exit 0
fi

# Ensure uv is available
if ! command -v uv >/dev/null 2>&1; then
    echo "Error: uv is required but not found."
    echo "Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    return 1 2>/dev/null || exit 1
fi

# Create venv if it doesn't exist
if [ ! -d "$ENSURE_PYTHON_VENV_DIR" ]; then
    echo "Creating Python $ENSURE_PYTHON_VERSION virtual environment at $ENSURE_PYTHON_VENV_DIR..."
    uv venv --python "$ENSURE_PYTHON_VERSION" "$ENSURE_PYTHON_VENV_DIR" || \
    uv venv --python "$ENSURE_PYTHON_VERSION" --clear "$ENSURE_PYTHON_VENV_DIR"
fi

# Activate venv
source "$ENSURE_PYTHON_VENV_DIR/bin/activate"

# Install / sync all requirements — uv no-ops when everything is already
# satisfied, so this is fast on subsequent runs and picks up any newly
# added packages.
uv pip install -r "$ENSURE_PYTHON_REQUIREMENTS"
