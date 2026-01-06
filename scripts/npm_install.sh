#!/bin/bash
set -e
echo "Running npm install script."

# Debug: Show versions
echo "Debug: Node version: $(node --version)"
echo "Debug: NPM version (before): $(npm --version)"

# TEMPORARY: Upgrade npm to version 10.x to fix Lerna exit code bug with Node 20+
# See: https://github.com/lerna/lerna/issues/3795
# Docker image has npm 8.x which has a bug where Lerna 9.x doesn't propagate exit codes
# npm 10.x is known to work correctly with Lerna 9.x + Node 20
# TODO: Remove this once Docker image is updated to use npm 10.x by default
echo "Upgrading npm to latest 10.x version..."
npm install -g npm@10

# Suppress WASI experimental warnings
export NODE_NO_WARNINGS=1

#Login to prerelease CodeArtifact to pull latest prerelease packages for build
aws codeartifact login --tool npm --repository $MDAA_CODEARTIFACT_PRERELEASE_NPM_REPO --domain $MDAA_CODEARTIFACT_PRERELEASE_DOMAIN --domain-owner $MDAA_CODEARTIFACT_PRERELEASE_ACCOUNT --namespace '@aws-mdaa' --region us-east-1

#Bootstrap and build packages
npm ci