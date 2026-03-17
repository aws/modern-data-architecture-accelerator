#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

npx nx reset

# Note: this script should be run before the final build/test
# Otherwise it might cause snapshot drift
python3 "$SCRIPT_DIR/fix_license_headers.py"

# Set concurrency defaults based on environment.
# CodeBuild sets CODEBUILD_BUILD_ID; GitLab CI sets GITLAB_CI.
# Local dev and GitLab get higher defaults; CodeBuild gets conservative
# defaults to avoid OOM kills on jest worker processes.
if [ -n "${CODEBUILD_BUILD_ID:-}" ]; then
  DEFAULT_CONCURRENCY=4
  DEFAULT_MAX_WORKERS=2
else
  DEFAULT_CONCURRENCY=10
  DEFAULT_MAX_WORKERS="50%"
fi

CONCURRENCY="${LERNA_CONCURRENCY:-$DEFAULT_CONCURRENCY}"
MAX_WORKERS="${JEST_MAX_WORKERS:-$DEFAULT_MAX_WORKERS}"

npx lerna run test:coverage --stream --no-ci --concurrency="$CONCURRENCY" -- --silent --maxWorkers="$MAX_WORKERS"
