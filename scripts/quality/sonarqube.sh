#!/bin/bash
set -e

echo "Merging coverage reports"
python3 ./scripts/test/mergelcov.py

echo "Running Sonar Scanner"
export SONAR_SCANNER_JAVA_OPTS="-Xmx1024m"
unset NODE_OPTIONS

# Determine the base project key
BASE_PROJECT_KEY=${SONAR_PROJECT_KEY:-${CI_PROJECT_PATH_SLUG}}

# SonarQube Community Build only supports a single branch per project.
# MR pipelines must use a separate project key to avoid overwriting the
# main branch baseline and corrupting differential / new-code analysis.
if [ "${CI_PIPELINE_SOURCE}" = "merge_request_event" ] || [ -n "${CI_MERGE_REQUEST_IID}" ]; then
  # Sanitize the source branch name for use in a SonarQube project key.
  # SonarQube keys allow alphanumerics, hyphens, underscores, periods, and colons.
  SANITIZED_BRANCH=$(echo "${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}" | sed 's/[^a-zA-Z0-9._:-]/_/g')
  SANITIZED_TARGET=$(echo "${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-main}" | sed 's/[^a-zA-Z0-9._:-]/_/g')

  # Include target branch in key so retargeting an MR triggers a fresh baseline.
  PROJECT_KEY="${BASE_PROJECT_KEY}-mr-${SANITIZED_BRANCH}-to-${SANITIZED_TARGET}"
  echo "Merge Request detected (MR !${CI_MERGE_REQUEST_IID}, branch: ${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}) - using project key: ${PROJECT_KEY}"

  # Static version "mr" — paired with the baseline's "baseline" version,
  # this creates a permanent new code boundary via "Previous Version."
  # The boundary never resets because both versions are static strings.
  VERSION_ARGS="-Dsonar.projectVersion=mr"

  # Check if the MR contains any TypeScript changes. If not, skip —
  # there's nothing for SonarQube to gate on.
  TARGET_REF="origin/${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-main}"
  MERGE_BASE=$(git merge-base "${TARGET_REF}" HEAD)
  TS_CHANGES=$(git diff --name-only "${MERGE_BASE}" HEAD -- '*.ts' | grep -v '\.d\.ts$' | grep -v '/test/' | head -1)

  if [ -z "${TS_CHANGES}" ]; then
    echo "No TypeScript source changes detected — skipping SonarQube scan."
    exit 0
  fi

  # Full unscoped scan with SCM enabled. Blame dates on MR-authored lines
  # are newer than the baseline, so issues on those lines are "new."
  SCOPE_ARGS=""
else
  # Main branch analysis - use the canonical project key
  PROJECT_KEY="${BASE_PROJECT_KEY}"
  echo "Main branch analysis - using project key: ${PROJECT_KEY}"

  # No projectVersion — with "Previous Version" new code definition and
  # no version transitions, the new code period anchors to the first
  # unversioned analysis. All issues introduced after that point are
  # permanently "new" and must be fixed. This prevents issues from being
  # grandfathered in by version bumps.
  VERSION_ARGS=""

  # Main branch scans the full repo
  SCOPE_ARGS=""
fi

sonar-scanner \
  -Dsonar.projectKey=${PROJECT_KEY} \
  -Dsonar.javascript.lcov.reportPaths=./coverage/merged_lcov.info \
  -Dsonar.javascript.node.maxspace=${SONAR_NODE_MAXSPACE:-8192} \
  -Dsonar.qualitygate.wait=true \
  -Dsonar.host.url=${SONAR_SERVER} \
  -Dsonar.token=${SONAR_LOGIN} \
  -Dsonar.sourceEncoding=utf-8 \
  ${VERSION_ARGS} \
  ${SCOPE_ARGS}

# Enforce that no issues are suppressed via the SonarQube UI.
# All issues must be fixed in code or suppressed inline with rationale
# (e.g., //NOSONAR). UI-based resolutions (won't fix, false positive,
# accepted) are not permitted. Fails closed on any error.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
python3 "${SCRIPT_DIR}/sonar_check_suppressions.py" "${PROJECT_KEY}"
