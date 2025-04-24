#!/bin/bash
set -e
echo "Running npm install script."

# Debug: Show versions
echo "Debug: Node version: $(node --version)"
echo "Debug: NPM version: $(npm --version)"

# Suppress WASI experimental warnings
export NODE_NO_WARNINGS=1

#Login to prerelease CodeArtifact to pull latest prerelease packages for build
aws codeartifact login --tool npm --repository $CAEF_CODEARTIFACT_PRERELEASE_NPM_REPO --domain $CAEF_CODEARTIFACT_PRERELEASE_DOMAIN --domain-owner $CAEF_CODEARTIFACT_PRERELEASE_ACCOUNT --namespace '@aws-mdaa' --region us-east-1

#Bootstrap and build packages
npm ci