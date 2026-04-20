#!/bin/bash
set -e
MDAA_CODEARTIFACT_PUBLISH_NPM_REPO=$1
MDAA_CODEARTIFACT_PUBLISH_DOMAIN=$2
MDAA_CODEARTIFACT_PUBLISH_ACCOUNT=$3
NPM_PUBLISH_TAG=$4

export PUBLISHED_VERSION=$(jq -r .version < lerna.json )

#Login to CodeArtifact release repos where we will publish release NPM packages
aws codeartifact login --tool npm --repository $MDAA_CODEARTIFACT_PUBLISH_NPM_REPO --domain $MDAA_CODEARTIFACT_PUBLISH_DOMAIN --domain-owner $MDAA_CODEARTIFACT_PUBLISH_ACCOUNT --namespace '@aws-mdaa' --region us-east-1

#Publish npm release packages to CodeArtifact
find $CI_PROJECT_DIR/target/package-build -type f -name '*.tgz' | xargs -n1 -I{} npm publish --tag $NPM_PUBLISH_TAG {}

echo "Published to CodeArtifact $MDAA_CODEARTIFACT_PUBLISH_NPM_REPO/$MDAA_CODEARTIFACT_PUBLISH_DOMAIN/$MDAA_CODEARTIFACT_PUBLISH_ACCOUNT as version $PUBLISHED_VERSION with tag $NPM_PUBLISH_TAG"


