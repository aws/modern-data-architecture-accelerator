#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."
cd "$PROJECT_ROOT"

echo "Running test script."

# Concurrency tuning
if [ "${CI:-}" = "true" ] && [ -n "${KUBERNETES_CPU_REQUEST:-}" ]; then
  # K8s runners: trust the pod's CPU request (set by .size_* templates).
  DEFAULT_CONCURRENCY="${KUBERNETES_CPU_REQUEST}"
else
  # Local / non-K8s CI: ask Node (mdaa base dependency), fallback to 4 otherwise
  DETECTED_CONCURRENCY="$(node -e "console.log(require('os').availableParallelism?.() ?? require('os').cpus().length)" 2>/dev/null || true)"
  if [ -z "$DETECTED_CONCURRENCY" ]; then
    echo "WARNING: failed to detect CPU count; falling back to DEFAULT_CONCURRENCY=4" >&2
  fi
  DEFAULT_CONCURRENCY="${DETECTED_CONCURRENCY:-4}"
fi
DEFAULT_MAX_WORKERS=1

# BUILD_CONCURRENCY is the current name; LERNA_CONCURRENCY is honored as a
# fallback for any pipeline/project variable still using the old name.
CONCURRENCY="${BUILD_CONCURRENCY:-${LERNA_CONCURRENCY:-$DEFAULT_CONCURRENCY}}"
MAX_WORKERS="${JEST_MAX_WORKERS:-$DEFAULT_MAX_WORKERS}"

# --- TypeScript tests ---
# In CI on main or when MERGE_PIPELINE_RUN_ALL is set, run the full test suite.
# Otherwise (local dev, feature branches, MRs), run only affected tests.
source "$SCRIPT_DIR/../nx/affected-base.sh"

# Starter kits live in the single @aws-mdaa/starter-kits package and are always
# tested via the dedicated self-filtering harness (test_starter_kits_repo.sh),
# never via `nx affected` here. Excluding them keeps that separation in both CI
# (where they run in a dedicated job) and locally (where we invoke the harness
# after the TS tests below).
EXCLUDE_STARTER_KITS='--exclude=@aws-mdaa/starter-kits'

if [ "${CI:-}" = "true" ] && [ "${CI_COMMIT_BRANCH:-}" = "main" ] || [ "${NX_RUN_ALL:-false}" = "true" ]; then
  echo "Running full TypeScript test suite (main or MERGE_PIPELINE_RUN_ALL=true)"
  echo "Using CONCURRENCY=${CONCURRENCY}, MAX_WORKERS=${MAX_WORKERS}"
  npx nx run-many -t test --all --parallel="$CONCURRENCY" $EXCLUDE_STARTER_KITS -- --silent --maxWorkers="$MAX_WORKERS"
else
  echo "Running affected TypeScript tests (base: $NX_BASE)"

  if [ "${CI:-}" = "true" ]; then
    echo "Using CONCURRENCY=${CONCURRENCY}, MAX_WORKERS=${MAX_WORKERS}"
    npx nx affected -t test --base="$NX_BASE" --head="$NX_HEAD" --parallel="$CONCURRENCY" $EXCLUDE_STARTER_KITS -- --silent --maxWorkers="$MAX_WORKERS"
  else
    npx nx affected -t test --base="$NX_BASE" --head="$NX_HEAD" $EXCLUDE_STARTER_KITS -- --maxWorkers="$MAX_WORKERS" "$@"
  fi
fi

# --- Starter kit tests ---
# In CI, the heavy starter kit synth tests run in a separate job
# (feature_merge_starter_kit_test) to avoid overwhelming the build pod.
# Locally, run them inline via the self-filtering harness.
if [ "${CI:-}" != "true" ]; then
  echo "Running starter kit tests..."
  "$SCRIPT_DIR/test_starter_kits_repo.sh"
fi

# --- Python tests ---
# In CI, Python tests run as a separate job. Locally, run affected only.
if [ "${CI:-}" != "true" ]; then
  echo "Running Python tests..."
  npm run test:python
fi
