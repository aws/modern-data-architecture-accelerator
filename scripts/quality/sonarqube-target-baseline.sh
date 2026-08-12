#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#
# Establishes the SonarQube "existing code" baseline for an MR project.
#
# Runs a full unscoped scan of the MR's *fork point* (the commit where the
# branch diverged from the target) with SCM (git blame) enabled, stamped with
# that commit's date via sonar.projectDate. This creates the MR project on
# first analysis and anchors the "new code" period to the branch point.
# Subsequent MR scans then classify every line committed after the fork point
# — i.e. exactly the MR's own changes — as new code.
#
# Why the fork point and not the target HEAD / git merge-base:
#   New code is determined by blame date vs. the period-start date. If the
#   baseline is dated at pipeline time (the old behavior), MR commits — which
#   were authored earlier — sort BEFORE the period start and are misclassified
#   as existing code, so the gate never sees them. Anchoring the period to the
#   fork-point date makes all MR-authored lines (committed after it) new.
#
#   `git merge-base` is the most-recent common ancestor, which drifts forward
#   when the target is merged back into the branch. The fork point (parent of
#   the oldest branch-unique commit) is stable across target movement and
#   back-merges, so it is used instead.
#
#   The fork point is resolved in sonar-project-key.sh, which folds it into
#   the project key. Anchor and key must come from one place: if the key named
#   a different commit, a rebase would move the anchor without moving the key,
#   the "project exists" check below would skip, and the stale period start
#   would misclassify the target's own commits as this MR's new code.
#
# The baseline only runs once per MR project lifetime. If the project
# already exists on the SonarQube server, this script exits immediately.
# The analysis cache from the baseline carries over to the first MR scan,
# so unchanged files get cache hits and skip re-analysis.
#
# Environment variables (provided by GitLab CI):
#   SONAR_SERVER   - SonarQube server URL
#   SONAR_TOKEN    - SonarQube authentication token
#   SONAR_PROJECT_KEY - (optional) base project key, defaults to CI_PROJECT_PATH_SLUG
#   CI_MERGE_REQUEST_SOURCE_BRANCH_NAME - MR source branch
#   CI_MERGE_REQUEST_IID - MR identifier
#   CI_PIPELINE_SOURCE - pipeline trigger type
set -e

# Only run in MR pipelines
if [ "${CI_PIPELINE_SOURCE}" != "merge_request_event" ] && [ -z "${CI_MERGE_REQUEST_IID}" ]; then
  echo "Not an MR pipeline — skipping target baseline."
  exit 0
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -z "${SONAR_SECRET_ARN}" ]; then
  echo "ERROR: SONAR_SECRET_ARN CI/CD variable is not set" >&2
  exit 1
fi
export SONAR_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${SONAR_SECRET_ARN}" --region us-east-1 --query 'SecretString' --output text)
if [ -z "${SONAR_TOKEN}" ]; then
  echo "ERROR: Failed to retrieve SonarQube token from Secrets Manager" >&2
  exit 1
fi
source "${SCRIPT_DIR}/sonar-project-key.sh"
PROJECT_KEY="${SONAR_PROJECT_KEY}"

echo "=== SonarQube Target Baseline ==="
echo "Project key:   ${PROJECT_KEY}"
echo "MR branch:     ${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}"
echo "Target branch: ${SONAR_TARGET_REF} (${SONAR_TARGET_SHA})"

# Skip if the MR project already exists — baseline only needs to run once
# per (source, target, fork-point) key. When the branch is rebased the fork
# point moves, the key changes, this lookup misses, and a fresh baseline is
# established at the new anchor.
echo "Checking if project already exists on SonarQube server..."
PROJECT_EXISTS=$(python3 "${SCRIPT_DIR}/sonar_project_exists.py" "${PROJECT_KEY}")

if [ "${PROJECT_EXISTS}" = "true" ]; then
  # Project exists — check for UI-suppressed issues before skipping.
  # Fail fast so the pipeline doesn't waste time on build/test if
  # someone has suppressed issues via the SonarQube UI.
  echo "Project exists — checking for UI-suppressed issues..."
  python3 "${SCRIPT_DIR}/sonar_check_suppressions.py" "${PROJECT_KEY}"

  echo "Project '${PROJECT_KEY}' already exists — skipping baseline."
  echo "=== Target baseline: SKIPPED (project exists) ==="
  exit 0
fi

echo "Project does not exist — running baseline scan."

# The fork point and its date come from sonar-project-key.sh, which derives
# the project key from the same commit. Recomputing them here would let the
# key and the baseline it names drift apart — the failure this anchoring is
# meant to prevent.
MR_HEAD=$(git rev-parse HEAD)
BRANCH_POINT="${SONAR_FORK_POINT}"
BASELINE_DATE="${SONAR_BASELINE_DATE}"

if [ -z "${BRANCH_POINT}" ]; then
  # Either no commits unique to this branch, or its oldest unique commit is a
  # root commit (orphan branch / unrelated-history MR) with no parent to anchor
  # to. Nothing to gate either way — skip cleanly instead of crashing the job
  # under `set -e`.
  echo "No fork point resolved against ${SONAR_TARGET_REF} — nothing to anchor a baseline to."
  echo "=== Target baseline: SKIPPED (no fork point) ==="
  exit 0
fi

echo "Fork point:   ${BRANCH_POINT}"
echo "Baseline date: ${BASELINE_DATE}"

# Check if the MR contains any TypeScript changes since the fork point. If
# not, skip both the baseline and MR scan — there's nothing to gate on.
TS_CHANGES=$(git diff --name-only "${BRANCH_POINT}" "${MR_HEAD}" -- '*.ts' | grep -v '\.d\.ts$' | grep -v '/test/' | head -1)

if [ -z "${TS_CHANGES}" ]; then
  echo "No TypeScript source changes detected between fork point and MR HEAD — skipping baseline."
  echo "=== Target baseline: SKIPPED (no TS changes) ==="
  exit 0
fi

# Check out the fork point for the baseline scan. The reference snapshot and
# its date both describe the branch point, so the MR scan's new code is
# exactly the diff the MR introduces on top of where it branched. There is no
# need to capture the current HEAD for later restoration — see the closing
# note below on why this job leaves the tree at the fork point.
echo "Checking out fork point ${BRANCH_POINT} for baseline scan..."
git checkout "${BRANCH_POINT}" --quiet

# Install dependencies so the TypeScript analyzer can resolve types.
echo "Installing dependencies at fork point..."
./scripts/build/npm_install_repo.sh

# Build all packages so .d.ts files exist for type resolution. Without
# compiled output, type-aware rules may produce different results than
# the MR scan (which runs after a full build). This ensures both scans
# have identical type resolution context.
echo "Building all packages for type resolution..."
export MDAA_BUILD_CODE_ONLY=true
npx nx run-many --target=build --all
unset MDAA_BUILD_CODE_ONLY

echo "Running baseline SonarQube scan at fork point ${BRANCH_POINT} (dated ${BASELINE_DATE})..."
export SONAR_SCANNER_JAVA_OPTS="-Xmx1024m"
unset NODE_OPTIONS

# Full unscoped scan with SCM enabled, dated at the fork point via
# sonar.projectDate. With no projectVersion, the "Previous Version" new code
# definition anchors to this first analysis, so its date becomes the new code
# period start. The MR scan (dated "now") then classifies everything committed
# after the fork point as new code.
sonar-scanner \
  -Dsonar.projectKey="${PROJECT_KEY}" \
  -Dsonar.projectDate="${BASELINE_DATE}" \
  -Dsonar.javascript.node.maxspace=${SONAR_NODE_MAXSPACE:-8192} \
  -Dsonar.host.url="${SONAR_SERVER}" \
  -Dsonar.token="${SONAR_TOKEN}" \
  -Dsonar.sourceEncoding=utf-8 \
  -Dsonar.qualitygate.wait=false

echo "Baseline scan complete."

# No HEAD restore needed. This is the job's final step: nothing downstream
# consumes the working tree. The baseline result is pushed to the SonarQube
# server over HTTP, and the only persisted CI artifact is the build cache
# (node_modules/.nx), which is independent of the checked-out commit. The
# dependent feature_merge_sonarqube job re-clones into its own workspace.
# Restoring HEAD here would also abort under `set -e`, because the baseline
# build recompiles TypeScript and dirties tracked compiled artifacts (e.g.
# starter-kit-synth-setup.js) at the fork point, so the checkout would hit
# "local changes would be overwritten".

echo "=== Target baseline: DONE (left at fork point ${BRANCH_POINT}) ==="
