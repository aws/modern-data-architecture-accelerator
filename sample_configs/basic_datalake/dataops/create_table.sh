#!/bin/bash

# Script to create a table by uploading data and running a crawler
# Usage: ./create_table.sh <org> <region>

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check arguments
if [ $# -lt 2 ]; then
    log_error "Usage: $0 <org> <region>"
    log_error "Example: $0 basic-datalake-eu-north-1-471341001955 eu-north-1"
    exit 1
fi

ORG=$1
REGION=$2

# Generate temporary CSV file with sample business data
TEMP_CSV="/tmp/sales_data_sample.csv"
log_info "Generating sample CSV data at: $TEMP_CSV"

# Remove if it already exists
rm -f "$TEMP_CSV"

cat > "$TEMP_CSV" << 'EOF'
order_id,customer_id,product_name,category,quantity,unit_price,total_amount,order_date,region,status
ORD-1001,CUST-5421,Laptop Pro 15,Electronics,2,1299.99,2599.98,2024-01-15,North America,Completed
ORD-1002,CUST-3892,Office Chair Deluxe,Furniture,5,249.50,1247.50,2024-01-15,Europe,Completed
ORD-1003,CUST-7234,Wireless Mouse,Electronics,10,29.99,299.90,2024-01-16,Asia Pacific,Shipped
ORD-1004,CUST-5421,USB-C Hub,Electronics,3,45.00,135.00,2024-01-16,North America,Processing
ORD-1005,CUST-9876,Standing Desk,Furniture,1,599.99,599.99,2024-01-17,Europe,Completed
ORD-1006,CUST-2341,Mechanical Keyboard,Electronics,4,89.99,359.96,2024-01-17,North America,Shipped
ORD-1007,CUST-6543,Monitor 27inch,Electronics,2,349.99,699.98,2024-01-18,Asia Pacific,Completed
ORD-1008,CUST-3892,Desk Lamp LED,Furniture,8,34.99,279.92,2024-01-18,Europe,Processing
ORD-1009,CUST-4567,Webcam HD,Electronics,6,79.99,479.94,2024-01-19,North America,Completed
ORD-1010,CUST-7890,Ergonomic Mat,Furniture,3,49.99,149.97,2024-01-19,Asia Pacific,Shipped
EOF

log_info "Generated sample CSV with 10 sales records"
FILE_TO_UPLOAD="$TEMP_CSV"

log_info "Starting table creation process"
log_info "Organization: $ORG"
log_info "Region: $REGION"

# Step 1: Retrieve crawler name from SSM parameter
log_info "Retrieving crawler name from SSM..."
CRAWLER_PARAM="/${ORG}/dataops/example-project/crawler/name/crawler1"
CRAWLER_NAME=$(aws ssm get-parameter \
    --name "$CRAWLER_PARAM" \
    --region "$REGION" \
    --no-paginate \
    --query 'Parameter.Value' \
    --output text)

if [ -z "$CRAWLER_NAME" ]; then
    log_error "Failed to retrieve crawler name from SSM parameter: $CRAWLER_PARAM"
    exit 1
fi

log_info "Crawler name: $CRAWLER_NAME"

# Step 2: Get crawler details to find S3 target
log_info "Retrieving crawler configuration..."
CRAWLER_INFO=$(aws glue get-crawler \
    --name "$CRAWLER_NAME" \
    --region "$REGION" \
    --no-paginate)

S3_TARGET=$(echo "$CRAWLER_INFO" | jq -r '.Crawler.Targets.S3Targets[0].Path')

if [ -z "$S3_TARGET" ] || [ "$S3_TARGET" == "null" ]; then
    log_error "Failed to retrieve S3 target from crawler: $CRAWLER_NAME"
    exit 1
fi

log_info "S3 target: $S3_TARGET"

# Step 3: Retrieve data admin role ARN from SSM
log_info "Retrieving data admin role ARN from SSM..."
ROLE_PARAM="/${ORG}/shared/generated-role/data-admin/arn"
ROLE_ARN=$(aws ssm get-parameter \
    --name "$ROLE_PARAM" \
    --region "$REGION" \
    --no-paginate \
    --query 'Parameter.Value' \
    --output text)

if [ -z "$ROLE_ARN" ]; then
    log_error "Failed to retrieve role ARN from SSM parameter: $ROLE_PARAM"
    exit 1
fi

log_info "Data admin role ARN: $ROLE_ARN"

# Step 4: Assume the data admin role
log_info "Assuming data admin role..."
SESSION_NAME="create-table-session-$(date +%s)"
ASSUMED_ROLE=$(aws sts assume-role \
    --role-arn "$ROLE_ARN" \
    --role-session-name "$SESSION_NAME" \
    --region "$REGION" \
    --no-paginate)

export AWS_ACCESS_KEY_ID=$(echo "$ASSUMED_ROLE" | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo "$ASSUMED_ROLE" | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo "$ASSUMED_ROLE" | jq -r '.Credentials.SessionToken')

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ "$AWS_ACCESS_KEY_ID" == "null" ]; then
    log_error "Failed to assume role: $ROLE_ARN"
    exit 1
fi

log_info "Successfully assumed role"

# Step 5: Upload file to S3
log_info "Uploading file to S3..."
# Ensure S3_TARGET ends with a slash
if [[ ! "$S3_TARGET" =~ /$ ]]; then
    S3_TARGET="${S3_TARGET}/"
fi

# Upload with a clean filename
CLEAN_FILENAME="sales_data.csv"
S3_DESTINATION="${S3_TARGET}${CLEAN_FILENAME}"

log_info "Uploading to: $S3_DESTINATION"
aws s3 cp "$FILE_TO_UPLOAD" "$S3_DESTINATION" \
    --region "$REGION" \
    --no-paginate

if [ $? -ne 0 ]; then
    log_error "Failed to upload file to S3"
    unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
    exit 1
fi

log_info "File uploaded successfully to $S3_DESTINATION"

# Step 6: Unassume role (restore original credentials)
log_info "Restoring original credentials..."
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

# Step 7: Start the crawler
log_info "Starting crawler: $CRAWLER_NAME"
aws glue start-crawler \
    --name "$CRAWLER_NAME" \
    --region "$REGION" \
    --no-paginate

if [ $? -ne 0 ]; then
    log_error "Failed to start crawler"
    exit 1
fi

# Step 8: Wait for crawler to complete
log_info "Waiting for crawler to complete..."
while true; do
    CRAWLER_STATE=$(aws glue get-crawler \
        --name "$CRAWLER_NAME" \
        --region "$REGION" \
        --no-paginate \
        --query 'Crawler.State' \
        --output text)
    
    if [ "$CRAWLER_STATE" == "READY" ]; then
        log_info "Crawler completed successfully"
        break
    elif [ "$CRAWLER_STATE" == "STOPPING" ] || [ "$CRAWLER_STATE" == "RUNNING" ]; then
        log_info "Crawler state: $CRAWLER_STATE - waiting..."
        sleep 10
    else
        log_error "Unexpected crawler state: $CRAWLER_STATE"
        exit 1
    fi
done

# Step 9: Verify table was created
log_info "Verifying table creation..."
DATABASE_NAME=$(echo "$CRAWLER_INFO" | jq -r '.Crawler.DatabaseName')

if [ -z "$DATABASE_NAME" ] || [ "$DATABASE_NAME" == "null" ]; then
    log_error "Failed to retrieve database name from crawler"
    exit 1
fi

log_info "Checking database: $DATABASE_NAME"

# Get list of tables in the database
TABLES=$(aws glue get-tables \
    --database-name "$DATABASE_NAME" \
    --region "$REGION" \
    --no-paginate \
    --query 'TableList[].Name' \
    --output text)

if [ -z "$TABLES" ]; then
    log_error "No tables found in database: $DATABASE_NAME"
    exit 1
fi

log_info "Tables found in database:"
echo "$TABLES" | tr '\t' '\n' | while read -r table; do
    echo "  - $table"
done

# Cleanup temporary file
log_info "Cleaning up temporary files..."
rm -f "$TEMP_CSV"

log_info "✓ Table creation process completed successfully!"
