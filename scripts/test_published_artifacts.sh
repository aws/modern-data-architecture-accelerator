#!/bin/bash
set -e

# Script to test published NPM artifacts in CodeArtifact
# Parameters:
# $1 - SNAPSHOT_VERSION
# $2 - MDAA_CODEARTIFACT_PRERELEASE_NPM_REPO
# $3 - MDAA_CODEARTIFACT_PRERELEASE_DOMAIN
# $4 - MDAA_CODEARTIFACT_PRERELEASE_ACCOUNT
# $5 - CI_COMMIT_REF_SLUG (branch name)

SNAPSHOT_VERSION=$1
MDAA_CODEARTIFACT_REPO=$2
MDAA_CODEARTIFACT_DOMAIN=$3
MDAA_CODEARTIFACT_ACCOUNT=$4
BRANCH_NAME=$5

echo "=========================================="
echo "Testing Published NPM Artifacts"
echo "=========================================="
echo "Version: $SNAPSHOT_VERSION"
echo "Repository: $MDAA_CODEARTIFACT_REPO"
echo "Domain: $MDAA_CODEARTIFACT_DOMAIN"
echo "Account: $MDAA_CODEARTIFACT_ACCOUNT"
echo "Branch name: $BRANCH_NAME"
echo "=========================================="

# Validate required parameters
if [ -z "$SNAPSHOT_VERSION" ] || [ -z "$MDAA_CODEARTIFACT_REPO" ] || [ -z "$MDAA_CODEARTIFACT_DOMAIN" ] || [ -z "$MDAA_CODEARTIFACT_ACCOUNT" ]; then
    echo "ERROR: Missing required parameters"
    echo "Usage: $0 <version> <repo> <domain> <account> [branch]"
    exit 1
fi

# Create temporary test directory
TEST_DIR=$(mktemp -d)
echo "Created test directory: $TEST_DIR"
# Create test files
cp -r sample_configs/governed_lakehouse/* $TEST_DIR/

cd "$TEST_DIR"

# Login to CodeArtifact
echo "Logging into CodeArtifact..."
aws codeartifact login --tool npm --repository "$MDAA_CODEARTIFACT_REPO" --domain "$MDAA_CODEARTIFACT_DOMAIN" --domain-owner "$MDAA_CODEARTIFACT_ACCOUNT" --namespace '@aws-mdaa' --region us-east-1

# Replace organization field in YAML using sed 
# for MacOS you need to put `''` after `-i `
sed -i "s/^organization:.*/organization: \"test-pub-${BRANCH_NAME}\"/" mdaa.yaml

# run npm
npx --yes @aws-mdaa/cli@$SNAPSHOT_VERSION -c mdaa.yaml synth --mdaa_version $SNAPSHOT_VERSION


echo "Published artifacts are ready for use at version: $SNAPSHOT_VERSION"