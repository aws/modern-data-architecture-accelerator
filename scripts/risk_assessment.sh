#!/bin/bash
set -e

###############################################################################
# Risk Assessment Pipeline — CI/CD wrapper
#
# Delegates to the change-risk-assessor Python application.
#
# Required CI/CD variables:
#   BASELINE_BUCKET_REGION   - AWS region for the baseline S3 bucket
#
# Optional CI/CD variables:
#   DIFF_OUTPUT_PATH         - Where to write diff output (default: ./diff-output)
#   BASELINE_BUCKET          - S3 bucket name
#                              (default: mdaa-baseline-{account-id}-{region})
#   RISK_THRESHOLD           - Risk score that triggers failure, 1-4 (default: 3)
#   ASSESSMENT_TIMEOUT       - Timeout in seconds per module (default: 300)
#   CONFIG_BUNDLE_PATH       - Override config bundle path, skips metadata.json
#   WORK_DIR                 - Persist intermediate files for debugging
#   MDAA_FILTER_ARGS         - Filter to domain/module, e.g. "-d domain -m module"
#   PROJECT_ACCESS_TOKEN     - GitLab project access token for MR discussion threads
#
# GitLab CI variables (set automatically in MR pipelines):
#   CI_API_V4_URL            - GitLab API base URL
#   CI_PROJECT_ID            - GitLab project ID
#   CI_MERGE_REQUEST_IID     - Merge request IID
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TOOL_DIR="${REPO_ROOT}/tools/change-risk-assessor"

# Required: region
if [ -z "${BASELINE_BUCKET_REGION:-}" ]; then
  echo "ERROR: BASELINE_BUCKET_REGION is required but not set." >&2
  exit 1
fi

# Required: GitLab project access token for MR discussion threads
if [ -z "${PROJECT_ACCESS_TOKEN:-}" ]; then
  echo "ERROR: PROJECT_ACCESS_TOKEN is required but not set. Check CI/CD variable settings (must not be Protected)." >&2
  exit 1
fi

# Required: risk threshold
if [ -z "${RISK_THRESHOLD:-}" ]; then
  echo "ERROR: RISK_THRESHOLD is required but not set. Set it as a CI/CD variable (1-4)." >&2
  exit 1
fi

export AWS_REGION="$BASELINE_BUCKET_REGION"

# Build CLI args — diff-output defaults to ./diff-output
ARGS=(--diff-output "${DIFF_OUTPUT_PATH:-./diff-output}")

[ -n "${BASELINE_BUCKET:-}" ]     && ARGS+=(--bucket "$BASELINE_BUCKET")
[ -n "${RISK_THRESHOLD:-}" ]      && ARGS+=(--threshold "$RISK_THRESHOLD")
[ -n "${ASSESSMENT_TIMEOUT:-}" ]  && ARGS+=(--timeout "$ASSESSMENT_TIMEOUT")
[ -n "${CONFIG_BUNDLE_PATH:-}" ]  && ARGS+=(--config-bundle-path "$CONFIG_BUNDLE_PATH")
[ -n "${WORK_DIR:-}" ]            && ARGS+=(--work-dir "$WORK_DIR")

# GitLab MR discussion thread integration
[ -n "${CI_API_V4_URL:-}" ]       && ARGS+=(--gitlab-api-url "$CI_API_V4_URL")
[ -n "${PROJECT_ACCESS_TOKEN:-}" ] && ARGS+=(--gitlab-token "$PROJECT_ACCESS_TOKEN")
[ -n "${CI_PROJECT_ID:-}" ]       && ARGS+=(--gitlab-project-id "$CI_PROJECT_ID")
[ -n "${CI_MERGE_REQUEST_IID:-}" ] && ARGS+=(--gitlab-mr-iid "$CI_MERGE_REQUEST_IID")

# Artifacts browse URL for the report
if [ -n "${CI_PROJECT_URL:-}" ] && [ -n "${CI_JOB_ID:-}" ]; then
  ARGS+=(--artifacts-url "${CI_PROJECT_URL}/-/jobs/${CI_JOB_ID}/artifacts/browse/${DIFF_OUTPUT_PATH:-diff-output}/")
fi

if [ -n "${MDAA_FILTER_ARGS:-}" ]; then
  set -- $MDAA_FILTER_ARGS
  while [ $# -gt 0 ]; do
    case "$1" in
      -d) ARGS+=(--domain "$2"); shift 2 ;;
      -m) ARGS+=(--module "$2"); shift 2 ;;
      *) shift ;;
    esac
  done
fi

# Log the resolved arguments (mask the token)
DISPLAY_ARGS=("${ARGS[@]}")
for i in "${!DISPLAY_ARGS[@]}"; do
  if [[ "${DISPLAY_ARGS[$i]}" == "--gitlab-token" ]]; then
    DISPLAY_ARGS[$((i+1))]="****"
  fi
done
echo "assess-risk ${DISPLAY_ARGS[*]}" >&2

exec uv run --project "${TOOL_DIR}" assess-risk "${ARGS[@]}"
