#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."
cd "$PROJECT_ROOT"

echo "Running test script."

# --- Concurrency tuning ---
# CodeBuild gets conservative defaults to avoid OOM kills on jest workers.
# Local dev and GitLab get higher defaults.
if [ -n "${CODEBUILD_BUILD_ID:-}" ]; then
  DEFAULT_CONCURRENCY=4
  DEFAULT_MAX_WORKERS=2
else
  DEFAULT_CONCURRENCY=10
  DEFAULT_MAX_WORKERS="50%"
fi

CONCURRENCY="${LERNA_CONCURRENCY:-$DEFAULT_CONCURRENCY}"
MAX_WORKERS="${JEST_MAX_WORKERS:-$DEFAULT_MAX_WORKERS}"

# --- TypeScript tests ---
# In CI on main or when MERGE_PIPELINE_RUN_ALL is set, run the full test suite.
# Otherwise (local dev, feature branches, MRs), run only affected tests.
source "$SCRIPT_DIR/../nx/affected-base.sh"

if [ "${CI:-}" = "true" ] && [ "${CI_COMMIT_BRANCH:-}" = "main" ] || [ "${NX_RUN_ALL:-false}" = "true" ]; then
  echo "Running full TypeScript test suite (main or MERGE_PIPELINE_RUN_ALL=true)"
  npx nx run-many -t test --all --parallel="$CONCURRENCY" -- --silent --maxWorkers="$MAX_WORKERS"
else
  echo "Running affected TypeScript tests (base: $NX_BASE)"

  if [ "${CI:-}" = "true" ]; then
    npx nx affected -t test --base="$NX_BASE" --head="$NX_HEAD" --parallel="$CONCURRENCY" -- --silent --maxWorkers="$MAX_WORKERS"
  else
    npx nx affected -t test --base="$NX_BASE" --head="$NX_HEAD" "$@"
  fi
fi

# --- Python tests ---
# In CI, Python tests run as a separate job. Locally, run affected only.
if [ "${CI:-}" != "true" ]; then
  echo "Running Python tests..."
  npm run test:python
fi
