#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

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

# On main, run the full test suite to seed the Nx cache with coverage
# for every package. Feature/MR branches use nx affected to only test
# packages impacted by the changeset.
if [ "${CI_COMMIT_BRANCH:-}" = "main" ]; then
  echo "Running full test suite on main (seeds Nx cache)"
  npx nx run-many -t test:coverage --all --parallel="$CONCURRENCY" -- --silent --maxWorkers="$MAX_WORKERS"
else
  source "$SCRIPT_DIR/nx/affected-base.sh"
  echo "Running affected tests (base: $NX_BASE)"

  npx nx affected -t test:coverage --base="$NX_BASE" --head="$NX_HEAD" --parallel="$CONCURRENCY" -- --silent --maxWorkers="$MAX_WORKERS"
fi
