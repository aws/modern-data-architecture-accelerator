#!/bin/bash
set -euo pipefail

# Fail fast on any unhandled error, unset variable, or failed pipeline stage.
# This is important because this script runs as an MDAA deploy hook: a swallowed
# failure here leaves the config table empty while the deploy reports success,
# and the pipeline then silently processes nothing.

# The MDAA organization name is passed as the first argument (e.g. {{org}} from
# the hook command). MDAA publishes all resource names to SSM parameters under
# predictable paths rooted at the org, so we read canonical resource names from
# SSM rather than guessing them (resource names may be truncated + hash-suffixed
# by MDAA's naming, so pattern-matching on names is unreliable).
ORG="${1:-}"

if [ -z "$ORG" ]; then
    echo "Error: organization name must be passed as the first argument" >&2
    exit 1
fi

# Check that AWS_REGION is set. MDAA runs deploy hooks with the deploy region
# exported into the environment, and every aws call below relies on it.
if [ -z "${AWS_REGION:-}" ]; then
    echo "Error: AWS_REGION environment variable is not set" >&2
    exit 1
fi

# Read a canonical resource name/value from an MDAA-published SSM parameter.
# Tolerate a non-zero exit (e.g. parameter not found) so the caller's emptiness
# check can emit a precise, named error rather than aborting silently under set -e.
get_ssm() {
    local name=$1
    aws ssm get-parameter --region "${AWS_REGION}" --name "$name" --query "Parameter.Value" --output text 2>/dev/null || true
}

# The EventBridge rule for the file processor scheduler carries the refresh_cadence
# in its target input. Match on the exact rule Description (not a guessed name),
# scoped to this org's rules, and extract refresh_cadence from the target input.
EVENTBRIDGE_RULE_NAME=$(aws events list-rules --region "${AWS_REGION}" --query "Rules[?Description=='file processor scheduler' && starts_with(Name, '${ORG}')].Name" --output text)

if [ -z "$EVENTBRIDGE_RULE_NAME" ]; then
    echo "Error: Could not find EventBridge rule with description 'file processor scheduler' for org '${ORG}'" >&2
    exit 1
fi

REFRESH_CADENCE=$(aws events list-targets-by-rule --region "${AWS_REGION}" --rule "$EVENTBRIDGE_RULE_NAME" --query "Targets[0].Input" --output text | jq -r '.refresh_cadence')

if [ -z "$REFRESH_CADENCE" ] || [ "$REFRESH_CADENCE" = "null" ]; then
    echo "Error: Could not extract refresh_cadence from EventBridge rule target input" >&2
    exit 1
fi

echo "Retrieved refresh_cadence from EventBridge rule: $REFRESH_CADENCE"

# Read the batch config DynamoDB table name from SSM
BATCH_CONFIG_TABLE=$(get_ssm "/${ORG}/dataops/hda-project/dynamodb/name/odpf_batch_config")

if [ -z "$BATCH_CONFIG_TABLE" ] || [ "$BATCH_CONFIG_TABLE" = "None" ]; then
    echo "Error: Could not read SSM parameter /${ORG}/dataops/hda-project/dynamodb/name/odpf_batch_config" >&2
    exit 1
fi

# Read the Glue job name from SSM
GLUE_JOB_NAME=$(get_ssm "/${ORG}/dataops/hda-project/job/name/file-processor-glue-job")

if [ -z "$GLUE_JOB_NAME" ] || [ "$GLUE_JOB_NAME" = "None" ]; then
    echo "Error: Could not read SSM parameter /${ORG}/dataops/hda-project/job/name/file-processor-glue-job" >&2
    exit 1
fi

echo "Using Dynamodb table: $BATCH_CONFIG_TABLE"
echo "Using Glue job: $GLUE_JOB_NAME"

# Create DynamoDB item JSON
item=$(cat <<EOF
{
    "refresh_cadence": {"S": "${REFRESH_CADENCE}"},
    "datalake_format": {"S": "iceberg"},
    "glue_job_max_workers": {"N": "10"},
    "glue_job_name": {"S": "${GLUE_JOB_NAME}"},
    "glue_job_worker_type": {"S": "G.1X"},
    "refresh_tables_batch_size": {"S": "4"}
}
EOF
)

# Insert item to DynamoDB. Check the exit code explicitly and fail loudly: a
# failed write (throttling, AccessDenied, expired token, ValidationException,
# ...) must not be reported as success.
if ! aws dynamodb put-item --region "${AWS_REGION}" --table-name "$BATCH_CONFIG_TABLE" --item "$item"; then
    echo "Error: Failed to write batch config item to DynamoDB table $BATCH_CONFIG_TABLE" >&2
    exit 1
fi
echo "Inserted batch config item"
