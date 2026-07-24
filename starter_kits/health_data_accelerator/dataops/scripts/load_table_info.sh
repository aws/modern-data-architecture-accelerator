#!/bin/bash
set -euo pipefail

# Fail fast on any unhandled error, unset variable, or failed pipeline stage.
# This is important because this script runs as an MDAA deploy hook: a swallowed
# failure here leaves the config table empty while the deploy reports success,
# and the pipeline then silently processes nothing.

JSON_FILE="${1:-}"

# The MDAA organization name is passed as the second argument (e.g. {{org}} from
# the hook command). MDAA publishes all resource names to SSM parameters under
# predictable paths rooted at the org, so we read canonical resource names from
# SSM rather than guessing them (resource names may be truncated + hash-suffixed
# by MDAA's naming, so pattern-matching on names is unreliable).
ORG="${2:-}"

# Check if JSON file is provided and exists
if [ -z "$JSON_FILE" ]; then
    echo "Error: JSON file path not provided" >&2
    echo "Usage: $0 <json_file_path> <org>" >&2
    exit 1
fi

if [ -z "$ORG" ]; then
    echo "Error: organization name must be passed as the second argument" >&2
    exit 1
fi

if [ ! -f "$JSON_FILE" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    RELATIVE_JSON_FILE="$SCRIPT_DIR/$JSON_FILE"
    if [ -f "$RELATIVE_JSON_FILE" ]; then
        JSON_FILE="$RELATIVE_JSON_FILE"
    else
        echo "Error: JSON file '$JSON_FILE' does not exist as is or as $RELATIVE_JSON_FILE" >&2
        exit 1
    fi
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

# Get the raw input from EventBridge rule target
RAW_INPUT=$(aws events list-targets-by-rule --region "${AWS_REGION}" --rule "$EVENTBRIDGE_RULE_NAME" --query "Targets[0].Input" --output text)

if [ -z "$RAW_INPUT" ] || [ "$RAW_INPUT" = "null" ] || [ "$RAW_INPUT" = "None" ]; then
    echo "Error: Could not get input from EventBridge rule target" >&2
    exit 1
fi

# Parse the JSON to extract refresh_cadence
REFRESH_CADENCE=$(echo "$RAW_INPUT" | jq -r '.refresh_cadence')

if [ -z "$REFRESH_CADENCE" ] || [ "$REFRESH_CADENCE" = "null" ]; then
    echo "Error: Could not extract refresh_cadence from EventBridge rule target input" >&2
    exit 1
fi

echo "Retrieved refresh_cadence from EventBridge rule: $REFRESH_CADENCE"

# Read the raw table config DynamoDB table name from SSM
TABLE_NAME=$(get_ssm "/${ORG}/dataops/hda-project/dynamodb/name/odpf_raw_table_config")
if [ -z "$TABLE_NAME" ] || [ "$TABLE_NAME" = "None" ]; then
    echo "Error: Could not read SSM parameter /${ORG}/dataops/hda-project/dynamodb/name/odpf_raw_table_config" >&2
    exit 1
fi

# Read the raw datalake S3 bucket name from SSM
RAW_BUCKET_NAME=$(get_ssm "/${ORG}/shared/datalake/bucket/raw/name")

if [ -z "$RAW_BUCKET_NAME" ] || [ "$RAW_BUCKET_NAME" = "None" ]; then
    echo "Error: Could not read SSM parameter /${ORG}/shared/datalake/bucket/raw/name" >&2
    exit 1
fi

# Read the raw Glue database (catalog) name from SSM
RAW_CATALOG_NAME=$(get_ssm "/${ORG}/dataops/hda-project/databaseName/raw_db")
if [ -z "$RAW_CATALOG_NAME" ] || [ "$RAW_CATALOG_NAME" = "None" ]; then
    echo "Error: Could not read SSM parameter /${ORG}/dataops/hda-project/databaseName/raw_db" >&2
    exit 1
fi

echo "Using table: $TABLE_NAME"
echo "Using bucket: $RAW_BUCKET_NAME"
echo "Using catalog: $RAW_CATALOG_NAME"

# Loop through tables in JSON and insert to DynamoDB.
# Feed the loop via process substitution rather than a `jq | while` pipe: a pipe
# runs the loop body in a subshell, so an `exit 1` there would only terminate the
# subshell and (without pipefail) the failure could be lost. Process substitution
# keeps the loop in the main shell, so a failed write aborts the whole script.
echo "Reading $JSON_FILE to generate items"
while read -r table; do
    # Decode and extract values
    table_data=$(echo "$table" | base64 --decode)
    database=$(echo "$table_data" | jq -r '.database')
    schema=$(echo "$table_data" | jq -r '.schema')
    table_name=$(echo "$table_data" | jq -r '.table_name')
    primary_key=$(echo "$table_data" | jq -r '.primary_key')
    partition_key=$(echo "$table_data" | jq -r '.partition_key')

    # Create DynamoDB item JSON
    item=$(cat <<EOF
{
    "refresh_cadence": {"S": "${REFRESH_CADENCE}"},
    "source_table_name": {"S": "${schema}/${table_name}"},
    "is_active": {"S": "Y"},
    "glue_table_data_versioning_type": {"S": "S"},
    "raw_table_name": {"S": "${table_name}"},
    "raw_database_name": {"S": "${database}"},
    "raw_database_S3_bucket": {"S": "${RAW_BUCKET_NAME}"},
    "iceberg_primary_key": {"S": "${primary_key}"},
    "iceberg_precombine_field": {"S": "CDC_TIMESTAMP_SEQ"},
    "iceberg_partition_key": {"S": "${partition_key}"},
    "table_storage_type": {"S": "iceberg"},
    "raw_catalog_name": {"S": "${RAW_CATALOG_NAME}"}
}
EOF
)

    # Insert item to DynamoDB. Check the exit code explicitly and fail loudly: a
    # failed write (throttling, AccessDenied, expired token, ValidationException,
    # ...) must not be reported as success.
    if ! aws dynamodb put-item --region "${AWS_REGION}" --table-name "$TABLE_NAME" --item "$item"; then
        echo "Error: Failed to write item for table '$table_name' to DynamoDB table $TABLE_NAME" >&2
        exit 1
    fi
    echo "Inserted item for table: $table_name"
done < <(jq -r '.tables[] | @base64' "$JSON_FILE")
