#!/bin/bash
set -e

###############################################################################
# Baseline Generation — CI/CD wrapper
#
# Delegates to the change-risk-assessor Python application.
#
# Required CI/CD variables:
#   BASELINE_BUCKET_REGION   - AWS region for the baseline S3 bucket
#
# Optional CI/CD variables:
#   BASELINE_BUCKET          - S3 bucket name
#                              (default: mdaa-baseline-{account-id}-{region})
#   CONFIG_REPO              - Config repo path or URL
#                              (default: git@ssh.gitlab.aws.dev:mdaa/mdaa-testing.git)
#   MDAA_REPO_URL            - MDAA GitHub repository URL
#                              (default: https://github.com/aws/modern-data-architecture-accelerator.git)
#   USE_LOCAL_CLI             - Set to "true" to use current repo's bin/mdaa
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TOOL_DIR="${REPO_ROOT}/tools/change-risk-assessor"

# Required: region
if [ -z "${BASELINE_BUCKET_REGION:-}" ]; then
  echo "ERROR: BASELINE_BUCKET_REGION is required but not set." >&2
  exit 1
fi

export AWS_REGION="$BASELINE_BUCKET_REGION"

ARGS=()

[ -n "${BASELINE_BUCKET:-}" ] && ARGS+=(--bucket "$BASELINE_BUCKET")
[ -n "${CONFIG_REPO:-}" ]     && ARGS+=(--config-repo "$CONFIG_REPO")
[ -n "${MDAA_REPO_URL:-}" ]   && ARGS+=(--mdaa-repo-url "$MDAA_REPO_URL")

if [ "${USE_LOCAL_CLI:-}" = "true" ]; then
  ARGS+=(--use-local-cli)
fi

exec uv run --project "${TOOL_DIR}" generate-baselines "${ARGS[@]}"
