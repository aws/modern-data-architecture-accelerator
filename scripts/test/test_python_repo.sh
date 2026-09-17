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
  npx nx run-many -t test:python --all --parallel=5 "$@"
else
  echo "Running Python tests (affected packages)"
  npx nx affected -t test:python --base="$NX_BASE" --head="$NX_HEAD" --parallel=5 "$@"
fi

# Run baseline review script tests (not managed by nx)
QUALITY_TESTS="$SCRIPT_DIR/../review/python-tests"
if [ -d "$QUALITY_TESTS" ]; then
  echo ""
  echo "Running baseline review script tests..."
  (cd "$QUALITY_TESTS" && uv run pytest)
fi

# Run starter kit test-runner unit tests (not managed by nx)
RUNNER_TESTS="$SCRIPT_DIR/python-tests"
if [ -d "$RUNNER_TESTS" ]; then
  echo ""
  echo "Running starter kit test-runner tests..."
  (cd "$RUNNER_TESTS" && uv run pytest)
fi

# Run CI helper script tests (not managed by nx)
CI_TESTS="$SCRIPT_DIR/../ci/python-tests"
if [ -d "$CI_TESTS" ]; then
  echo ""
  echo "Running CI helper script tests..."
  (cd "$CI_TESTS" && uv run pytest)
fi
