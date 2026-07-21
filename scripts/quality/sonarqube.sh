#!/bin/bash
set -e

# Fail early if any specific-file sonar exclusion no longer matches a tracked
# file, so stale exclusions cannot silently linger in sonar-project.properties.
SONAR_SH_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
"${SONAR_SH_DIR}/../ci/check_sonar_exclusions.sh"

echo "Merging coverage reports"
python3 ./scripts/test/mergelcov.py

echo "Running Sonar Scanner"
export SONAR_SCANNER_JAVA_OPTS="-Xmx1024m"
unset NODE_OPTIONS

if [ -z "${SONAR_SECRET_ARN}" ]; then
  echo "ERROR: SONAR_SECRET_ARN CI/CD variable is not set" >&2
  exit 1
fi
export SONAR_TOKEN=$(aws secretsmanager get-secret-value --secret-id "${SONAR_SECRET_ARN}" --region us-east-1 --query 'SecretString' --output text)
if [ -z "${SONAR_TOKEN}" ]; then
  echo "ERROR: Failed to retrieve SonarQube token from Secrets Manager" >&2
  exit 1
fi

# Derive the project key (shared with the target-baseline scan so both
# scans target an identical key). See sonar-project-key.sh for details.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "${SCRIPT_DIR}/sonar-project-key.sh"
PROJECT_KEY="${SONAR_PROJECT_KEY}"

# SonarQube Community Build only supports a single branch per project.
# MR pipelines must use a separate project key to avoid overwriting the
# main branch baseline and corrupting differential / new-code analysis.
if [ "${SONAR_IS_MR}" = "true" ]; then
  echo "Merge Request detected (MR !${CI_MERGE_REQUEST_IID}, branch: ${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}, target: ${SONAR_TARGET_REF}@${SONAR_TARGET_SHA}) - using project key: ${PROJECT_KEY}"

  # No projectVersion. The baseline scan (sonarqube-target-baseline.sh) is the
  # project's first analysis and is dated at the MR's fork point via
  # sonar.projectDate. With "Previous Version" new code definition and no
  # version transitions, the new code period anchors to that first analysis,
  # so its fork-point date is the period start. This MR scan runs at "now",
  # so every line committed after the fork point — the MR's own changes — is
  # classified as new code.
  VERSION_ARGS=""

  # Check if the MR contains any TypeScript changes. If not, skip —
  # there's nothing for SonarQube to gate on.
  MERGE_BASE=$(git merge-base "${SONAR_TARGET_REF}" HEAD)
  TS_CHANGES=$(git diff --name-only "${MERGE_BASE}" HEAD -- '*.ts' | grep -v '\.d\.ts$' | grep -v '/test/' | head -1)

  if [ -z "${TS_CHANGES}" ]; then
    echo "No TypeScript source changes detected — skipping SonarQube scan."
    exit 0
  fi

  # Full unscoped scan with SCM enabled. Blame dates on MR-authored lines
  # are newer than the baseline, so issues on those lines are "new."
  SCOPE_ARGS=""
else
  # Main branch analysis - use the canonical project key (already set
  # to the base key by sonar-project-key.sh).
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

GATE_FAILED=""
sonar-scanner \
  -Dsonar.projectKey=${PROJECT_KEY} \
  -Dsonar.javascript.lcov.reportPaths=./coverage/merged_lcov.info \
  -Dsonar.javascript.node.maxspace=${SONAR_NODE_MAXSPACE:-8192} \
  -Dsonar.qualitygate.wait=true \
  -Dsonar.host.url=${SONAR_SERVER} \
  -Dsonar.token=${SONAR_TOKEN} \
  -Dsonar.sourceEncoding=utf-8 \
  ${VERSION_ARGS} \
  ${SCOPE_ARGS} || GATE_FAILED=true

# Always print quality gate details (conditions + issues on failure)
python3 "${SCRIPT_DIR}/sonar_quality_gate.py" "${PROJECT_KEY}" || true

# Post SonarQube findings as MR discussion threads (MR pipelines only)
if [ -n "${CI_MERGE_REQUEST_IID}" ]; then
  python3 ./scripts/review/sonar/post_sonar_threads.py "${PROJECT_KEY}" || true
fi

# If the gate failed, exit after printing details
if [ "${GATE_FAILED}" = "true" ]; then
  exit 1
fi

# Enforce that no issues are suppressed via the SonarQube UI.
# All issues must be fixed in code or suppressed inline with rationale
# (e.g., //NOSONAR). UI-based resolutions (won't fix, false positive,
# accepted) are not permitted. Fails closed on any error.
python3 "${SCRIPT_DIR}/sonar_check_suppressions.py" "${PROJECT_KEY}"
