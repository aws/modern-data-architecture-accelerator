#!/bin/bash
# Bootstrap script for MDAA integration tests
# Ensures AWS account is CDK bootstrapped and deploys fixture stack:
#   MdaaIntegInfraFixtureStack — VPC (2 AZs, NAT, IGW) + KMS key + EC2 KeyPair
#
# Fixture stack is defined in integ/constructs/fixture.ts.
#
# After deployment, exports environment variables for test stacks:
#   INTEG_KMS_KEY_ARN     - KMS key ARN for encryption
#   INTEG_VPC_ID          - VPC ID
#   INTEG_PRIVATE_SUBNETS - Comma-separated private subnet IDs
#   INTEG_AZS             - Comma-separated availability zones
#
# Usage:
#   ./scripts/bootstrap-integ.sh             # Bootstrap + deploy fixture
#   ./scripts/bootstrap-integ.sh --teardown  # Destroy fixture
#   source ./scripts/bootstrap-integ.sh      # Bootstrap + export env vars to current shell

set -eo pipefail

TEARDOWN=false
if [ "$1" = "--teardown" ]; then
  TEARDOWN=true
fi

echo "=== MDAA Integration Test Bootstrap ==="

# Check required env vars
if [ -z "$AWS_REGION" ] && [ -z "$AWS_DEFAULT_REGION" ]; then
  echo "ERROR: AWS_REGION or AWS_DEFAULT_REGION must be set"
  exit 1
fi

REGION="${AWS_REGION:-$AWS_DEFAULT_REGION}"
export AWS_REGION="$REGION"
export CDK_DEFAULT_REGION="$REGION"

# Verify AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
  echo "ERROR: AWS credentials not configured or invalid"
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_ACCOUNT="$ACCOUNT_ID"

echo "Account: $ACCOUNT_ID"
echo "Region:  $REGION"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INTEG_DIR="$PROJECT_ROOT/integ/constructs"
FIXTURE_APP="npx ts-node $INTEG_DIR/fixture.ts"
STACK_NAME="MdaaIntegInfraFixtureStack"

# --- Helpers ---

get_stack_status() {
  aws cloudformation describe-stacks \
    --stack-name "$1" \
    --region "$REGION" \
    --query "Stacks[0].StackStatus" \
    --output text 2>/dev/null || echo "NOT_FOUND"
}

get_stack_output() {
  aws cloudformation describe-stacks \
    --stack-name "$1" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" \
    --output text 2>/dev/null || echo ""
}

# ---- Teardown ----

# Compute short region tag matching fixture.ts shortRegion():
# e.g. us-east-2 → use2, eu-west-1 → euw1
IFS='-' read -r R_PREFIX R_DIR R_NUM <<< "$REGION"
REGION_SHORT="${R_PREFIX}${R_DIR:0:1}${R_NUM}"

if [ "$TEARDOWN" = true ]; then
  echo ""
  echo "=== Tearing down fixture stack ==="

  STATUS=$(get_stack_status "$STACK_NAME")
  if [ "$STATUS" = "NOT_FOUND" ]; then
    echo "  $STACK_NAME: not found, skipping."
  else
    echo "  Destroying $STACK_NAME (status: $STATUS)..."
    npx cdk destroy "$STACK_NAME" --app "$FIXTURE_APP" --force --exclusively 2>&1 || true
    AFTER=$(get_stack_status "$STACK_NAME")
    if [ "$AFTER" = "NOT_FOUND" ]; then
      echo "  ✓ $STACK_NAME destroyed."
    elif [ "$AFTER" = "DELETE_FAILED" ]; then
      echo "  ⚠ $STACK_NAME: DELETE_FAILED — forcing deletion with retained resources..."
      aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION" \
        --deletion-mode FORCE_DELETE_STACK 2>/dev/null || true
      aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION" 2>/dev/null || true
      FINAL=$(get_stack_status "$STACK_NAME")
      if [ "$FINAL" = "NOT_FOUND" ]; then
        echo "  ✓ $STACK_NAME force-deleted."
      else
        echo "  ✗ $STACK_NAME still in state: $FINAL — manual cleanup required."
      fi
    else
      echo "  $STACK_NAME in state: $AFTER"
    fi
  fi

  echo ""
  echo "--- Scheduling KMS key deletion ---"
  KMS_ALIAS="alias/mdaa-${REGION_SHORT}-fast-fixture-integ-shared"
  KMS_KEY_ID=$(aws kms describe-key --key-id "$KMS_ALIAS" --region "$REGION" \
    --query "KeyMetadata.KeyId" --output text 2>/dev/null || echo "")
  if [ -n "$KMS_KEY_ID" ] && [ "$KMS_KEY_ID" != "None" ]; then
    echo "  Key: $KMS_KEY_ID"
    aws kms disable-key-rotation --key-id "$KMS_KEY_ID" --region "$REGION" 2>/dev/null || true
    aws kms delete-alias --alias-name "$KMS_ALIAS" --region "$REGION" 2>/dev/null || true
    aws kms schedule-key-deletion --key-id "$KMS_KEY_ID" --pending-window-in-days 7 --region "$REGION" 2>/dev/null || true
    echo "  ✓ Key scheduled for deletion in 7 days."
  else
    echo "  No KMS key found, skipping."
  fi

  echo ""
  echo "--- Cleaning up EC2 key pair ---"
  KEYPAIR_NAME="mdaa-${REGION_SHORT}-fast-fixture-integ-shared"
  KEYPAIR_ID=$(aws ec2 describe-key-pairs --key-names "$KEYPAIR_NAME" --region "$REGION" \
    --query "KeyPairs[0].KeyPairId" --output text 2>/dev/null || echo "")
  if [ -n "$KEYPAIR_ID" ] && [ "$KEYPAIR_ID" != "None" ]; then
    echo "  Deleting key pair: $KEYPAIR_NAME ($KEYPAIR_ID)"
    aws ec2 delete-key-pair --key-pair-id "$KEYPAIR_ID" --region "$REGION" 2>/dev/null || true
    echo "  ✓ Key pair deleted."
  else
    echo "  No key pair found, skipping."
  fi

  # Clean up the Secrets Manager secret created by MdaaEC2SecretKeyPair
  SECRET_NAME="$KEYPAIR_NAME"
  SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" \
    --query "ARN" --output text 2>/dev/null || echo "")
  if [ -n "$SECRET_ARN" ] && [ "$SECRET_ARN" != "None" ]; then
    echo "  Deleting secret: $SECRET_NAME"
    aws secretsmanager delete-secret --secret-id "$SECRET_ARN" --force-delete-without-recovery \
      --region "$REGION" 2>/dev/null || true
    echo "  ✓ Secret deleted."
  fi

  echo ""
  echo "--- Cleaning up CloudWatch Log Groups ---"
  PREFIX="mdaa-${REGION_SHORT}-fast"
  DELETED_COUNT=0

  # Delete log groups matching our integration test patterns
  # We need separate API calls because describe-log-groups only supports one prefix
  for LOG_PREFIX in "/aws/lambda/MdaaInteg" "/aws/lambda/$PREFIX" "/aws/rds/cluster/$PREFIX" "/mdaa/integ"; do
    LOG_GROUPS=$(aws logs describe-log-groups --region "$REGION" \
      --log-group-name-prefix "$LOG_PREFIX" \
      --query 'logGroups[].logGroupName' --output text 2>/dev/null || echo "")
    for LG in $LOG_GROUPS; do
      if [ -n "$LG" ]; then
        aws logs delete-log-group --region "$REGION" --log-group-name "$LG" 2>/dev/null || true
        DELETED_COUNT=$((DELETED_COUNT + 1))
      fi
    done
  done

  if [ "$DELETED_COUNT" -gt 0 ]; then
    echo "  ✓ Deleted $DELETED_COUNT log group(s)."
  else
    echo "  No log groups found, skipping."
  fi

  echo ""
  echo "=== Teardown complete ==="
  exit 0
fi

# ---- CDK Bootstrap ----

BOOTSTRAP_STATUS=$(get_stack_status "CDKToolkit")

if [ "$BOOTSTRAP_STATUS" = "NOT_FOUND" ]; then
  echo "CDK bootstrap stack not found. Bootstrapping..."
  npx cdk bootstrap "aws://$ACCOUNT_ID/$REGION"
elif [[ "$BOOTSTRAP_STATUS" == *"COMPLETE"* ]]; then
  echo "CDK bootstrap stack exists (status: $BOOTSTRAP_STATUS)"
else
  echo "ERROR: CDK bootstrap stack in unexpected state: $BOOTSTRAP_STATUS"
  exit 1
fi

# ---- Deploy fixture stack ----

STACK_STATUS=$(get_stack_status "$STACK_NAME")

if [[ "$STACK_STATUS" == *"COMPLETE"* ]]; then
  echo ""
  echo "--- Fixture stack already deployed (status: $STACK_STATUS) ---"
  
  # Check if all required outputs exist
  EXISTING_OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[*].OutputKey" \
    --output text 2>/dev/null || echo "")
  
  NEEDS_UPDATE=false
  for REQUIRED_OUTPUT in KmsKeyArn VpcId PrivateSubnets AvailabilityZones; do
    if ! echo "$EXISTING_OUTPUTS" | grep -q "$REQUIRED_OUTPUT"; then
      echo "  Missing output: $REQUIRED_OUTPUT"
      NEEDS_UPDATE=true
    fi
  done
  
  if [ "$NEEDS_UPDATE" = true ]; then
    echo "  Updating stack to add missing outputs..."
    npx cdk deploy --all \
      --app "$FIXTURE_APP" \
      --require-approval never
  else
    echo "  All required outputs present, skipping deployment."
  fi
else
  echo ""
  echo "--- Deploying fixture stack ---"
  echo "  ($STACK_NAME: VPC + KMS + KeyPair)"
  echo "  This may take 5-10 minutes on first run."
  echo ""

  npx cdk deploy --all \
    --app "$FIXTURE_APP" \
    --require-approval never
fi

# ---- Export environment variables ----

echo ""
echo "--- Exporting fixture outputs as environment variables ---"

# Debug: show all outputs from the stack
echo "  Available outputs:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" \
  --output text 2>/dev/null | while read -r key value; do
    echo "    $key = $value"
  done

INTEG_KMS_KEY_ARN=$(get_stack_output "$STACK_NAME" "KmsKeyArn")
INTEG_VPC_ID=$(get_stack_output "$STACK_NAME" "VpcId")
INTEG_PRIVATE_SUBNETS=$(get_stack_output "$STACK_NAME" "PrivateSubnets")
INTEG_AZS=$(get_stack_output "$STACK_NAME" "AvailabilityZones")

if [ -z "$INTEG_KMS_KEY_ARN" ] || [ -z "$INTEG_VPC_ID" ] || [ -z "$INTEG_PRIVATE_SUBNETS" ] || [ -z "$INTEG_AZS" ]; then
  echo "ERROR: Failed to retrieve fixture stack outputs"
  echo "  KMS Key ARN: $INTEG_KMS_KEY_ARN"
  echo "  VPC ID: $INTEG_VPC_ID"
  echo "  Private Subnets: $INTEG_PRIVATE_SUBNETS"
  echo "  AZs: $INTEG_AZS"
  exit 1
fi

echo "  INTEG_KMS_KEY_ARN=$INTEG_KMS_KEY_ARN"
echo "  INTEG_VPC_ID=$INTEG_VPC_ID"
echo "  INTEG_PRIVATE_SUBNETS=$INTEG_PRIVATE_SUBNETS"
echo "  INTEG_AZS=$INTEG_AZS"

echo ""
echo "=== Bootstrap complete ==="
echo ""
