#!/bin/bash

JSON_FILE=$1

# Check if JSON file is provided and exists
if [ -z "$JSON_FILE" ]; then
    echo "Error: JSON file path not provided"
    echo "Usage: $0 <json_file_path>"
    exit 1
fi

if [ ! -f "$JSON_FILE" ]; then
    echo "Error: JSON file '$JSON_FILE' does not exist"
    exit 1
fi

# Check that AWS_REGION is set
if [ -z "$AWS_REGION" ]; then
    echo "Error: AWS_REGION environment variable is not set"
    exit 1
fi

# Configuration variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
prefix="hda-${AWS_REGION}-${ACCOUNT_ID}"

# Find the EventBridge rule for file processor scheduler and extract refresh_cadence
EVENTBRIDGE_RULE_NAME=$(aws events list-rules --region ${AWS_REGION} --query "Rules[?Description=='file processor scheduler' && starts_with(Name, '${prefix}')].Name" --output text)

if [ -z "$EVENTBRIDGE_RULE_NAME" ]; then
    echo "Error: Could not find EventBridge rule with description 'file processor scheduler' and prefix '${prefix}'"
    exit 1
fi

# Get the raw input from EventBridge rule target
RAW_INPUT=$(aws events list-targets-by-rule --region ${AWS_REGION} --rule "$EVENTBRIDGE_RULE_NAME" --query "Targets[0].Input" --output text)

if [ -z "$RAW_INPUT" ] || [ "$RAW_INPUT" = "null" ] || [ "$RAW_INPUT" = "None" ]; then
    echo "Error: Could not get input from EventBridge rule target"
    exit 1
fi

# Parse the JSON to extract refresh_cadence
REFRESH_CADENCE=$(echo "$RAW_INPUT" | jq -r '.refresh_cadence')

if [ -z "$REFRESH_CADENCE" ] || [ "$REFRESH_CADENCE" = "null" ]; then
    echo "Error: Could not extract refresh_cadence from EventBridge rule target input"
    exit 1
fi

echo "Retrieved refresh_cadence from EventBridge rule: $REFRESH_CADENCE"

# Find the DynamoDB table name
TABLE_NAME=$(aws dynamodb list-tables --region "${AWS_REGION}" --query "TableNames[?starts_with(@, '${prefix}') && ends_with(@, 'odpf_raw_table_config')]" --output text)
if [ -z "$TABLE_NAME" ]; then
    echo "Error: Could not find table matching pattern ${prefix}*odpf_raw_table_config"
    exit 1
fi

# Find the S3 bucket name
RAW_BUCKET_NAME=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, '${prefix}') && ends_with(Name, 'datalake-raw')].Name" --output text)

if [ -z "$RAW_BUCKET_NAME" ]; then
    echo "Error: Could not find bucket matching pattern ${prefix}*datalake-staging"
    exit 1
fi

# Find the Glue catalog name
RAW_CATALOG_NAME=$(aws glue get-databases --output json | jq -r '.DatabaseList[].Name | select(endswith("raw_db"))')
if [ -z "$RAW_CATALOG_NAME" ]; then
    echo "Error: Could not find Glue catalog ending with 'raw_db'"
    exit 1
fi

echo "Using table: $TABLE_NAME"
echo "Using bucket: $RAW_BUCKET_NAME"
echo "Using catalog: $RAW_CATALOG_NAME"



# Loop through tables in JSON and insert to DynamoDB
echo "Reading $JSON_FILE to generate items"
jq -r '.tables[] | @base64' "$JSON_FILE" | while read -r table; do
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

    # Insert item to DynamoDB
    aws dynamodb put-item --table-name "$TABLE_NAME" --item "$item"
    echo "Inserted item for table: $table_name"
done
