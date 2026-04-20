#!/bin/bash
# Script to create a testing domain and repository in CodeArtifact
# Usage: ./create_codeartifact_test_domain.sh <domain> <region>

set -euo pipefail

# `caef` on the CI/CD
MDAA_CODEARTIFACT_PRERELEASE_DOMAIN="$1"
# `us-east-1` on the CI/CD
MDAA_CODEARTIFACT_PRERELEASE_REGION="$2"

if [ -z "$MDAA_CODEARTIFACT_PRERELEASE_DOMAIN" ] || [ -z "$MDAA_CODEARTIFACT_PRERELEASE_REGION" ]; then
    echo "ERROR: Missing required parameters"
    echo "Usage: $0 <domain> <region>"
    exit 1
fi

# Check if domain exists
if aws codeartifact describe-domain --domain "$MDAA_CODEARTIFACT_PRERELEASE_DOMAIN" --region "$MDAA_CODEARTIFACT_PRERELEASE_REGION" --no-paginate >/dev/null 2>&1; then
    echo "Domain '$MDAA_CODEARTIFACT_PRERELEASE_DOMAIN' already exists, skipping creation"
else
    echo "Creating CodeArtifact domain '$MDAA_CODEARTIFACT_PRERELEASE_DOMAIN' in region '$MDAA_CODEARTIFACT_PRERELEASE_REGION'..."
    aws codeartifact create-domain --domain "$MDAA_CODEARTIFACT_PRERELEASE_DOMAIN" --region "$MDAA_CODEARTIFACT_PRERELEASE_REGION" --no-paginate
fi

# Check if repository exists
if aws codeartifact describe-repository --domain "$MDAA_CODEARTIFACT_PRERELEASE_DOMAIN" --repository test-npm --region "$MDAA_CODEARTIFACT_PRERELEASE_REGION" --no-paginate >/dev/null 2>&1; then
    echo "Repository 'test-npm' already exists in domain '$MDAA_CODEARTIFACT_PRERELEASE_DOMAIN', skipping creation"
else
    echo "Creating CodeArtifact repository 'test-npm' in domain '$MDAA_CODEARTIFACT_PRERELEASE_DOMAIN'..."
    aws codeartifact create-repository --domain "$MDAA_CODEARTIFACT_PRERELEASE_DOMAIN" --repository test-npm --region "$MDAA_CODEARTIFACT_PRERELEASE_REGION" --no-paginate
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --no-paginate)

echo ""
echo "✅ CodeArtifact test domain and repository created successfully"
echo ""
echo "To build and package (without tests):"
echo "  npx lerna run build"
echo "  CI_PROJECT_DIR=\$(pwd) ./scripts/build/package.sh"
echo ""
echo "To login and publish to the test repository:"
echo "  aws codeartifact login --tool npm --repository test-npm --domain $MDAA_CODEARTIFACT_PRERELEASE_DOMAIN --domain-owner $ACCOUNT_ID --namespace '@aws-mdaa' --region $MDAA_CODEARTIFACT_PRERELEASE_REGION"
echo "  CI_PROJECT_DIR=\$(pwd) ./scripts/publish/publish_npm.sh test-npm $MDAA_CODEARTIFACT_PRERELEASE_DOMAIN $ACCOUNT_ID test"
echo ""
echo "Test the inspect script:"
echo "  ./scripts/publish/inspect_codeartifact_version.sh 1.0.0 test-npm $MDAA_CODEARTIFACT_PRERELEASE_DOMAIN $ACCOUNT_ID $MDAA_CODEARTIFACT_PRERELEASE_REGION aws-mdaa"
echo ""
echo "Test the delete script (dry run):"
echo "  ./scripts/publish/delete_codeartifact_version.sh 1.0.0 test-npm $MDAA_CODEARTIFACT_PRERELEASE_DOMAIN $ACCOUNT_ID $MDAA_CODEARTIFACT_PRERELEASE_REGION aws-mdaa --dryrun"
echo ""
echo "To clean up when done, run:"
echo "  aws codeartifact delete-repository --domain $MDAA_CODEARTIFACT_PRERELEASE_DOMAIN --repository test-npm --region $MDAA_CODEARTIFACT_PRERELEASE_REGION --no-paginate"
echo "  aws codeartifact delete-domain --domain $MDAA_CODEARTIFACT_PRERELEASE_DOMAIN --region $MDAA_CODEARTIFACT_PRERELEASE_REGION --no-paginate"
