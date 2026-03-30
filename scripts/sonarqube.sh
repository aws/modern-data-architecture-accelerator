#!/bin/bash
set -e

echo "Merging coverage reports"
python3 ./scripts/mergelcov.py

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
  # Format: <SONAR_PROJECT_KEY>-mr-<branch-name> for easy identification
  # on a shared SonarQube instance.
  PROJECT_KEY="${BASE_PROJECT_KEY}-mr-${SANITIZED_BRANCH}"
  echo "Merge Request detected (MR !${CI_MERGE_REQUEST_IID}, branch: ${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}) - using project key: ${PROJECT_KEY}"

  # Pass the project version so SonarQube can compute new code correctly.
  # Using the MR source branch commit as the version ties the new-code
  # window to exactly what changed in this MR.
  VERSION_ARGS="-Dsonar.projectVersion=${CI_COMMIT_SHORT_SHA}"
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
fi

sonar-scanner \
  -Dsonar.projectKey=${PROJECT_KEY} \
  -Dsonar.javascript.lcov.reportPaths=./coverage/merged_lcov.info \
  -Dsonar.qualitygate.wait=true \
  -Dsonar.host.url=${SONAR_SERVER} \
  -Dsonar.token=${SONAR_LOGIN} \
  -Dsonar.sourceEncoding=utf-8 \
  ${VERSION_ARGS}
