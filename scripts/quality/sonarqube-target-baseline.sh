#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#
# Scans the target branch codebase to establish the SonarQube
# "new code" baseline before the real MR scan runs.
#
# SonarQube Community Edition creates a new project on first analysis.
# Whatever code is present in that first scan becomes "existing code".
# Without a target baseline, the first MR scan would include the MR
# changes, causing all new code to be classified as existing and
# bypassing new-code quality gates.
#
# This script scopes the target scan to the same set of changed
# packages that the real MR scan will analyze (via sonar-scope.sh).
# Both jobs see the same files, ensuring SonarQube's new-code
# classification is accurate — only actual MR changes show up as
# new code.
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
PROJECT_KEY="${BASE_PROJECT_KEY}-mr-${SANITIZED_BRANCH}"

# Resolve the MR target branch dynamically (same logic as sonar-scope.sh).
if [ -n "${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-}" ]; then
  TARGET_REF="origin/${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}"
else
  TARGET_REF="origin/main"
fi
TARGET_SHA=$(git rev-parse "${TARGET_REF}")

echo "=== SonarQube Target Baseline ==="
echo "Project key:   ${PROJECT_KEY}"
echo "MR branch:     ${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}"
echo "Target branch: ${TARGET_REF} (${TARGET_SHA})"

# Install dependencies on the MR branch first so that sonar-scope.sh
# can use changed-only.py (which requires npx nx for the project graph).
echo "Installing dependencies on MR branch for scope computation..."
./scripts/build/npm_install_repo.sh

# Compute scope on the MR branch — sonar-scope.sh uses the merge base
# between the target branch and the MR HEAD, so the result is the same
# regardless of which branch is checked out.
source ./scripts/quality/sonar-scope.sh

if [ "${SONAR_SCOPE_SKIP}" = "true" ]; then
  echo "No affected packages — skipping target baseline scan."
  echo "=== Target baseline: SKIPPED ==="
  exit 0
fi

# Remember where we are so we can restore after target baseline scan
ORIGINAL_HEAD=$(git rev-parse HEAD)

echo "Checking out ${TARGET_REF} (${TARGET_SHA}) for baseline scan..."
git checkout "${TARGET_SHA}" --quiet

# Re-install dependencies on the target branch so the TypeScript
# analyzer has type resolution matching the target's dependency
# versions. Without this, type-dependent rules may produce different
# findings than the real scan if dependency versions differ between
# branches.
echo "Installing dependencies on target branch for type resolution..."
./scripts/build/npm_install_repo.sh

# Build the scoped packages and their monorepo dependencies so that
# .d.ts files exist for type resolution. Without compiled output, the
# TS plugin chases project references through symlinked node_modules
# and ends up loading every tsconfig in the repo (~130 programs).
#
# nx handles the dependency graph via ^build — transitive deps are
# built first. MDAA_BUILD_CODE_ONLY=true runs only tsc, skipping
# schema generation and doc generation which aren't needed here.
PROJECTS=$(echo "$CHANGED_PROJECTS" | python3 -c "import sys,json; print(','.join(json.loads(sys.stdin.read())))")
echo "Building scoped packages for type resolution: ${PROJECTS}"
export MDAA_BUILD_CODE_ONLY=true
npx nx run-many --target=build --projects="${PROJECTS}"
unset MDAA_BUILD_CODE_ONLY

echo "Running baseline SonarQube scan from ${TARGET_REF}..."
export SONAR_SCANNER_JAVA_OPTS="-Xmx1024m"

sonar-scanner \
  -Dsonar.projectKey="${PROJECT_KEY}" \
  -Dsonar.projectVersion="target:${TARGET_SHA}" \
  -Dsonar.host.url="${SONAR_SERVER}" \
  -Dsonar.token="${SONAR_LOGIN}" \
  -Dsonar.sourceEncoding=utf-8 \
  -Dsonar.qualitygate.wait=false \
  -Dsonar.scm.disabled=true \
  -Dsonar.scanner.skipSystemTruststore=true \
  ${SONAR_SCOPE_ARGS}

echo "Baseline scan complete."

# Restore the original MR commit
echo "Restoring original HEAD: ${ORIGINAL_HEAD}"
git checkout "${ORIGINAL_HEAD}" --quiet

echo "=== Target baseline: DONE ==="
