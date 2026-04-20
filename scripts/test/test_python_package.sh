#!/bin/bash
# Run Python tests for a single package. No-ops if python-tests/ doesn't exist.
# Called from package.json "test:python" targets.

PYTHON_TEST_DIR="${1:-python-tests}"

if [ ! -d "$PYTHON_TEST_DIR" ]; then
  echo "No $PYTHON_TEST_DIR directory found, skipping Python tests"
  exit 0
fi

cd "$PYTHON_TEST_DIR" && uv run pytest "${@:2}"
