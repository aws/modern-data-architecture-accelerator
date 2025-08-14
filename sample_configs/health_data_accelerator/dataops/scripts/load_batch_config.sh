#!/bin/bash

# Configuration variables - extract refresh_cadence from EventBridge rule

# Check that AWS_REGION is set
if [ -z "$AWS_REGION" ]; then
    echo "Error: AWS_REGION environment variable is not set"
    exit 1
fi

# Get current AWS_REGION and account number
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

PREFIX=hda-${AWS_REGION}-${ACCOUNT_ID}

# Find the EventBridge rule for file processor scheduler and extract refresh_cadence
EVENTBRIDGE_RULE_NAME=$(aws events list-rules --region ${AWS_REGION} --query "Rules[?Description=='file processor scheduler' && starts_with(Name, '${PREFIX}')].Name" --output text)

if [ -z "$EVENTBRIDGE_RULE_NAME" ]; then
    echo "Error: Could not find EventBridge rule with description 'file processor scheduler' and prefix '${PREFIX}'"
    exit 1
fi

REFRESH_CADENCE=$(aws events list-targets-by-rule --region ${AWS_REGION} --rule "$EVENTBRIDGE_RULE_NAME" --query "Targets[0].Input" --output text | jq -r '.refresh_cadence')

if [ -z "$REFRESH_CADENCE" ] || [ "$REFRESH_CADENCE" = "null" ]; then
    echo "Error: Could not extract refresh_cadence from EventBridge rule target input"
    exit 1
fi

echo "Retrieved refresh_cadence from EventBridge rule: $REFRESH_CADENCE"

# Find the batch config DynamoDB table name
BATCH_CONFIG_TABLE=$(aws dynamodb list-tables --region ${AWS_REGION} --query "TableNames[?starts_with(@, '${PREFIX}') && ends_with(@, 'odpf_batch_config')]" --output text)

if [ -z "$BATCH_CONFIG_TABLE" ]; then
    echo "Error: Could not find table matching pattern ${PREFIX}*odpf_batch_config"
    exit 1
fi

# Find the Glue job name
SUFFIX="file-processor-glue-job"
GLUE_JOB_NAME=$(aws glue --region ${AWS_REGION} list-jobs --query 'JobNames' --output text | tr '\t' '\n' | grep "^${PREFIX}.*${SUFFIX}$")

if [ -z "$GLUE_JOB_NAME" ] || [ "$GLUE_JOB_NAME" = "None" ]; then
    echo "Error: Could not find Glue job matching pattern ${PREFIX}*file-processor-glue-job*"
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

# Insert item to DynamoDB
aws dynamodb put-item --table-name "$BATCH_CONFIG_TABLE" --item "$item"
echo "Inserted batch config item"
