#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#
# Establishes the SonarQube "existing code" baseline for an MR project.
#
# Runs a full unscoped scan of the target branch with SCM (git blame)
# enabled. This creates the MR project on first analysis and seeds it
# with all existing main-branch code. Subsequent MR scans use blame
# dates to classify lines authored by MR commits as "new code."
#
# The baseline only runs once per MR project lifetime. If the project
# already exists on the SonarQube server, this script exits immediately.
# The analysis cache from the baseline carries over to the first MR scan,
# so unchanged files get cache hits and skip re-analysis.
#
# Environment variables (provided by GitLab CI):
#   SONAR_SERVER   - SonarQube server URL
#   SONAR_LOGIN    - SonarQube authentication token
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

BASE_PROJECT_KEY=${SONAR_PROJECT_KEY:-${CI_PROJECT_PATH_SLUG}}
SANITIZED_BRANCH=$(echo "${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}" | sed 's/[^a-zA-Z0-9._:-]/_/g')
SANITIZED_TARGET=$(echo "${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-main}" | sed 's/[^a-zA-Z0-9._:-]/_/g')
PROJECT_KEY="${BASE_PROJECT_KEY}-mr-${SANITIZED_BRANCH}-to-${SANITIZED_TARGET}"

echo "=== SonarQube Target Baseline ==="
echo "Project key:   ${PROJECT_KEY}"
echo "MR branch:     ${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}"

# Skip if the MR project already exists — baseline only needs to run once.
echo "Checking if project already exists on SonarQube server..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
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

# Resolve the MR target branch.
if [ -n "${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-}" ]; then
  TARGET_REF="origin/${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}"
else
  TARGET_REF="origin/main"
fi
TARGET_SHA=$(git rev-parse "${TARGET_REF}")
echo "Target branch: ${TARGET_REF} (${TARGET_SHA})"

# Check if the MR contains any TypeScript changes. If not, skip both
# the baseline and MR scan — there's nothing for SonarQube to gate on.
MR_HEAD=$(git rev-parse HEAD)
MERGE_BASE=$(git merge-base "${TARGET_REF}" "${MR_HEAD}")
TS_CHANGES=$(git diff --name-only "${MERGE_BASE}" "${MR_HEAD}" -- '*.ts' | grep -v '\.d\.ts$' | grep -v '/test/' | head -1)

if [ -z "${TS_CHANGES}" ]; then
  echo "No TypeScript source changes detected between merge-base and MR HEAD — skipping baseline."
  echo "=== Target baseline: SKIPPED (no TS changes) ==="
  exit 0
fi

# Check out the target branch for the baseline scan.
ORIGINAL_HEAD=$(git rev-parse HEAD)
echo "Checking out ${TARGET_REF} (${TARGET_SHA}) for baseline scan..."
git checkout "${TARGET_SHA}" --quiet

# Install dependencies so the TypeScript analyzer can resolve types.
echo "Installing dependencies on target branch..."
./scripts/build/npm_install_repo.sh

# Build all packages so .d.ts files exist for type resolution. Without
# compiled output, type-aware rules may produce different results than
# the MR scan (which runs after a full build). This ensures both scans
# have identical type resolution context.
echo "Building all packages for type resolution..."
export MDAA_BUILD_CODE_ONLY=true
npx nx run-many --target=build --all
unset MDAA_BUILD_CODE_ONLY

echo "Running baseline SonarQube scan from ${TARGET_REF}..."
export SONAR_SCANNER_JAVA_OPTS="-Xmx1024m"
unset NODE_OPTIONS

# Full unscoped scan with SCM enabled. Static version "baseline" creates
# the anchor point for "Previous Version" new code definition. The MR
# scan uses version "mr", so the transition baseline→mr defines the
# new code boundary. This boundary never resets because both versions
# are static strings.
sonar-scanner \
  -Dsonar.projectKey="${PROJECT_KEY}" \
  -Dsonar.projectVersion=baseline \
  -Dsonar.javascript.node.maxspace=${SONAR_NODE_MAXSPACE:-8192} \
  -Dsonar.host.url="${SONAR_SERVER}" \
  -Dsonar.token="${SONAR_LOGIN}" \
  -Dsonar.sourceEncoding=utf-8 \
  -Dsonar.qualitygate.wait=false

echo "Baseline scan complete."

# Restore the original MR commit
echo "Restoring original HEAD: ${ORIGINAL_HEAD}"
git checkout "${ORIGINAL_HEAD}" --quiet

echo "=== Target baseline: DONE ==="
