#!/bin/bash
set -e
echo "Running npm install script."

#Login to prerelease CodeArtifact to pull latest prerelease packages for build
aws codeartifact login --tool npm --repository $CAEF_CODEARTIFACT_PRERELEASE_NPM_REPO --domain $CAEF_CODEARTIFACT_PRERELEASE_DOMAIN --domain-owner $CAEF_CODEARTIFACT_PRERELEASE_ACCOUNT --namespace '@aws-caef' --region us-east-1

#Bootstrap and build packages
npm install

npx nx reset