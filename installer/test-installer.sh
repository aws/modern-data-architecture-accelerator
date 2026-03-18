#!/bin/bash
# =============================================================================
# MDAA Installer End-to-End Test Script
#
# Validates the installer by:
#   1. Building and synthesizing all CDK template variants
#   2. Running lint and unit tests
#   3. Deploying the installer CloudFormation stack
#   4. Triggering the CodeBuild project and waiting for completion
#   5. Verifying expected MDAA stacks were created
#   6. Cleaning up all resources (unless --skip-cleanup is set)
#
# Usage:
#   ./test-installer.sh --region <aws-region> [--org-name <name>] [--skip-cleanup]
#
# Requirements:
#   - AWS CLI configured with sufficient permissions
#   - Node.js and npm installed
# =============================================================================

set -euo pipefail

# Disable AWS CLI pager for all commands
export AWS_PAGER=""

# Defaults
REGION=""
ORG_NAME=""
SKIP_CLEANUP=false
SAMPLE_NAME="basic_datalake"
SAMPLE_CONFIG_FOLDER=""
POLL_INTERVAL=30
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Minimum number of stacks expected from a basic_datalake deployment
MIN_EXPECTED_STACKS=6

usage() {
  echo "Usage: $0 --region <aws-region> [--org-name <name>] [--skip-cleanup]"
  echo ""
  echo "Options:"
  echo "  --region                  AWS region to deploy into (required)"
  echo "  --org-name                Organization name prefix (default: mit-<account>-<region>)"
  echo "  --sample-config-folder    Sample config folder name (default: starter_kits)"
  echo "  --skip-cleanup            Leave resources in place after test for debugging"
  exit 1
}

log() {
  echo "[$(date '+%H:%M:%S')] $*"
}

fail() {
  echo "[$(date '+%H:%M:%S')] ERROR: $*" >&2
  if [ "$SKIP_CLEANUP" = false ]; then
    log "Attempting cleanup before exit..."
    cleanup || true
  fi
  exit 1
}

# Print the reason a CloudFormation stack failed
print_stack_failure_reasons() {
  local stack_name="$1"
  log "Fetching failure reasons for stack '$stack_name'..."
  log "--- Stack failure events ---"
  aws cloudformation describe-stack-events \
    --stack-name "$stack_name" \
    --query "StackEvents[?contains(ResourceStatus,'FAILED')].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]" \
    --output table \
    --region "$REGION" \
    --no-paginate 2>/dev/null || true
  # Also show ROLLBACK events which often contain the root cause
  aws cloudformation describe-stack-events \
    --stack-name "$stack_name" \
    --query "StackEvents[?contains(ResourceStatus,'ROLLBACK')].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]" \
    --output table \
    --region "$REGION" \
    --no-paginate 2>/dev/null || true
  log "--- End of failure events ---"
}

# Delete a stack if it exists in ROLLBACK_COMPLETE state (can't be updated, must be deleted first)
delete_rollback_complete_stack() {
  local stack_name="$1"
  local stack_status
  stack_status=$(aws cloudformation describe-stacks \
    --stack-name "$stack_name" \
    --query "Stacks[0].StackStatus" \
    --output text \
    --region "$REGION" \
    --no-paginate 2>/dev/null || echo "DOES_NOT_EXIST")

  if [ "$stack_status" = "ROLLBACK_COMPLETE" ]; then
    log "Found existing stack '$stack_name' in ROLLBACK_COMPLETE state. Deleting before re-deploy..."
    aws cloudformation delete-stack \
      --stack-name "$stack_name" \
      --region "$REGION" \
      --no-paginate
    aws cloudformation wait stack-delete-complete \
      --stack-name "$stack_name" \
      --region "$REGION" \
      --no-paginate
    log "Deleted ROLLBACK_COMPLETE stack."
  fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --region) REGION="$2"; shift 2 ;;
    --org-name) ORG_NAME="$2"; shift 2 ;;
    --sample-config-folder) SAMPLE_CONFIG_FOLDER="$2"; shift 2 ;;
    --skip-cleanup) SKIP_CLEANUP=true; shift ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if [ -z "$REGION" ]; then
  echo "Error: --region is required"
  usage
fi

CODEBUILD_PROJECT_NAME="MDAA-Build-${SAMPLE_NAME}"

# Build org name with account and region if not explicitly provided
if [ -z "$ORG_NAME" ]; then
  ACCOUNT_ID=$(aws sts get-caller-identity \
    --query "Account" \
    --output text \
    --region "$REGION" \
    --no-paginate)
  ORG_NAME="mit-${ACCOUNT_ID}-${REGION}"
  log "Using org name: $ORG_NAME"
fi

STACK_NAME="${ORG_NAME}-installer"

# =========================================================
# Cleanup function (defined early so fail() can call it)
# =========================================================
cleanup() {
  log "Cleaning up installer stack..."

  log "  Deleting installer stack: $STACK_NAME"
  aws cloudformation delete-stack \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --no-paginate

  aws cloudformation wait stack-delete-complete \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --no-paginate 2>/dev/null || log "  Warning: installer stack deletion may not have completed cleanly"

  log "Installer stack deleted."
  log ""
  log "MDAA stacks with prefix '${ORG_NAME}' were NOT deleted automatically."
  log "To tear down, manually delete CloudFormation stacks starting with '${ORG_NAME}'"
  log "in reverse chronological order, then clean up any protected resources (S3 buckets, etc.)."
}

# =========================================================
# Step 1: Install dependencies and build
# =========================================================
log "Step 1: Installing dependencies and building..."
cd "$SCRIPT_DIR"
npm install
npm run build

# =========================================================
# Step 2: Synthesize CDK template
# =========================================================
log "Step 2: Synthesizing CDK template..."
CDK_CONTEXT_ARGS=""
if [ -n "$SAMPLE_CONFIG_FOLDER" ]; then
  CDK_CONTEXT_ARGS="-c sampleConfigFolder=${SAMPLE_CONFIG_FOLDER}"
fi
npx cdk synth $CDK_CONTEXT_ARGS --quiet
log "Template synthesized successfully."

# =========================================================
# Step 3: Lint
# =========================================================
log "Step 3: Running lint..."
npm run lint

# =========================================================
# Step 4: Unit tests
# =========================================================
log "Step 4: Running unit tests..."
npm test

# =========================================================
# Step 5: Deploy the installer stack
# =========================================================
log "Step 5: Deploying installer stack '${STACK_NAME}'..."
delete_rollback_complete_stack "$STACK_NAME"

# Discover a real VPC and subnet in the target region (CF validates these exist)
log "  Discovering VPC and subnet in ${REGION}..."
VPC_ID=$(aws ec2 describe-vpcs \
  --query "Vpcs[0].VpcId" \
  --output text \
  --region "$REGION" \
  --no-paginate)

if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
  fail "No VPC found in ${REGION}. A VPC is required for CloudFormation parameter validation."
fi

SUBNET_ID=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${VPC_ID}" \
  --query "Subnets[0].SubnetId" \
  --output text \
  --region "$REGION" \
  --no-paginate)

if [ -z "$SUBNET_ID" ] || [ "$SUBNET_ID" = "None" ]; then
  fail "No subnet found for VPC ${VPC_ID} in ${REGION}."
fi

log "  Using VPC: ${VPC_ID}, Subnet: ${SUBNET_ID}"

if ! aws cloudformation deploy \
  --template-file cdk.out/MdaaInstallerStack.template.json \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    OrgName="$ORG_NAME" \
    SampleName="$SAMPLE_NAME" \
    VpcId="$VPC_ID" \
    SubnetId="$SUBNET_ID" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region "$REGION" \
  --no-paginate; then
  print_stack_failure_reasons "$STACK_NAME"
  fail "Installer stack deployment failed. See failure reasons above."
fi

log "Installer stack deployed."

# =========================================================
# Step 6: Start CodeBuild run
# =========================================================
log "Step 6: Starting CodeBuild project '${CODEBUILD_PROJECT_NAME}'..."
BUILD_ID=$(aws codebuild start-build \
  --project-name "$CODEBUILD_PROJECT_NAME" \
  --query "build.id" \
  --output text \
  --region "$REGION" \
  --no-paginate)

log "Build started: $BUILD_ID"

# =========================================================
# Step 7: Poll for CodeBuild completion
# =========================================================
log "Step 7: Waiting for build to complete (polling every ${POLL_INTERVAL}s)..."
while true; do
  STATUS=$(aws codebuild batch-get-builds \
    --ids "$BUILD_ID" \
    --query "builds[0].buildStatus" \
    --output text \
    --region "$REGION" \
    --no-paginate)

  log "  Build status: $STATUS"

  if [ "$STATUS" != "IN_PROGRESS" ]; then
    break
  fi
  sleep "$POLL_INTERVAL"
done

# =========================================================
# Step 8: Verify build succeeded
# =========================================================
if [ "$STATUS" != "SUCCEEDED" ]; then
  LOGS_LINK=$(aws codebuild batch-get-builds \
    --ids "$BUILD_ID" \
    --query "builds[0].logs.deepLink" \
    --output text \
    --region "$REGION" \
    --no-paginate)
  fail "CodeBuild run failed with status: $STATUS. Logs: $LOGS_LINK"
fi

log "Step 8: CodeBuild run succeeded."

# =========================================================
# Step 9: Sanity check deployed stacks
# =========================================================
log "Step 9: Verifying expected MDAA stacks..."

DEPLOYED_STACKS=$(aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?starts_with(StackName, '${ORG_NAME}')].StackName" \
  --output text \
  --region "$REGION" \
  --no-paginate)

STACK_COUNT=$(echo "$DEPLOYED_STACKS" | wc -w | tr -d ' ')

log "Found $STACK_COUNT stack(s) with prefix '${ORG_NAME}':"
echo "$DEPLOYED_STACKS" | tr '\t' '\n' | sort

if [ "$STACK_COUNT" -lt "$MIN_EXPECTED_STACKS" ]; then
  fail "Expected at least $MIN_EXPECTED_STACKS stacks but found $STACK_COUNT."
fi

log "Stack count check passed ($STACK_COUNT >= $MIN_EXPECTED_STACKS)."

if [ "$SKIP_CLEANUP" = true ]; then
  log "Skipping cleanup (--skip-cleanup was set)."
  log "Remember to manually delete stacks prefixed with '${ORG_NAME}' and stack '${STACK_NAME}'."
else
  cleanup
fi

log "========================================="
log "Installer end-to-end test PASSED"
log "========================================="
