#!/bin/bash
set -e

echo "Merging coverage reports"
python3 ./scripts/test/mergelcov.py

echo "Running Sonar Scanner"
export SONAR_SCANNER_JAVA_OPTS="-Xmx1024m"

# Determine the base project key
BASE_PROJECT_KEY=${SONAR_PROJECT_KEY:-${CI_PROJECT_PATH_SLUG}}

# SonarQube Community Build only supports a single branch per project.
# MR pipelines must use a separate project key to avoid overwriting the
# main branch baseline and corrupting differential / new-code analysis.
if [ "${CI_PIPELINE_SOURCE}" = "merge_request_event" ] || [ -n "${CI_MERGE_REQUEST_IID}" ]; then
  # Sanitize the source branch name for use in a SonarQube project key.
  # SonarQube keys allow alphanumerics, hyphens, underscores, periods, and colons.
  SANITIZED_BRANCH=$(echo "${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}" | sed 's/[^a-zA-Z0-9._:-]/_/g')

  # Use a dedicated MR project so the main project stays untouched.
  PROJECT_KEY="${BASE_PROJECT_KEY}-mr-${SANITIZED_BRANCH}"
  echo "Merge Request detected (MR !${CI_MERGE_REQUEST_IID}, branch: ${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}) - using project key: ${PROJECT_KEY}"

  VERSION_ARGS="-Dsonar.projectVersion=${CI_COMMIT_SHORT_SHA}"

  # Scope the scan to the same changed packages as the target baseline job.
  # Both jobs use sonar-scope.sh with the same commit refs so the
  # file sets match exactly, ensuring correct new-code classification.
  source ./scripts/quality/sonar-scope.sh

  if [ "${SONAR_SCOPE_SKIP}" = "true" ]; then
    echo "No affected packages found, skipping SonarQube scan"
    exit 0
  fi

  SCOPE_ARGS="${SONAR_SCOPE_ARGS} -Dsonar.scm.disabled=true -Dsonar.scanner.skipSystemTruststore=true"
else
  # Main branch analysis - use the canonical project key
  PROJECT_KEY="${BASE_PROJECT_KEY}"
  echo "Main branch analysis - using project key: ${PROJECT_KEY}"

  # For main branch, pass the project version from lerna.json (if available)
  # so the "Previous Version" new code definition works correctly across releases.
  if [ -f "lerna.json" ]; then
    LERNA_VERSION=$(jq -r .version < lerna.json 2>/dev/null || echo "")
    if [ -n "${LERNA_VERSION}" ] && [ "${LERNA_VERSION}" != "null" ]; then
      VERSION_ARGS="-Dsonar.projectVersion=${LERNA_VERSION}"
      echo "Setting project version from lerna.json: ${LERNA_VERSION}"
    else
      VERSION_ARGS=""
    fi
  else
    VERSION_ARGS=""
  fi

  # Main branch scans the full repo
  SCOPE_ARGS=""
fi

sonar-scanner \
  -Dsonar.projectKey=${PROJECT_KEY} \
  -Dsonar.javascript.lcov.reportPaths=./coverage/merged_lcov.info \
  -Dsonar.qualitygate.wait=true \
  -Dsonar.host.url=${SONAR_SERVER} \
  -Dsonar.token=${SONAR_LOGIN} \
  -Dsonar.sourceEncoding=utf-8 \
  ${VERSION_ARGS} \
  ${SCOPE_ARGS}
