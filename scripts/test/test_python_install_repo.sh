#!/bin/bash
# Run Python test install on affected packages only
set -e

echo "Running Python test install (affected packages)"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source "$SCRIPT_DIR/../nx/affected-base.sh"
if [ "${NX_RUN_ALL:-false}" = "true" ]; then
  npx nx run-many -t test:python:install --all --parallel=5 "$@"
else
  npx nx affected -t test:python:install --base="$NX_BASE" --head="$NX_HEAD" --parallel=5 "$@"
fi
