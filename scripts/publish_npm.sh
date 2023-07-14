#!/bin/bash
set -e
CAEF_CODEARTIFACT_PUBLISH_NPM_REPO=$1
CAEF_CODEARTIFACT_PUBLISH_DOMAIN=$2
CAEF_CODEARTIFACT_PUBLISH_ACCOUNT=$3
NPM_PUBLISH_TAG=$4

export PUBLISHED_VERSION=`cat lerna.json | jq -r .version`

#Login to CodeArtifact release repos where we will publish release NPM packages
aws codeartifact login --tool npm --repository $CAEF_CODEARTIFACT_PUBLISH_NPM_REPO --domain $CAEF_CODEARTIFACT_PUBLISH_DOMAIN --domain-owner $CAEF_CODEARTIFACT_PUBLISH_ACCOUNT --namespace '@aws-caef' --region us-east-1
#Publish npm release packages to CodeArtifact
find $CI_PROJECT_DIR/target/package-build -type f -name '*.tgz' | xargs -n1 -I{} npm publish --tag $NPM_PUBLISH_TAG {}

echo "Published to CodeArtifact $CAEF_CODEARTIFACT_PUBLISH_NPM_REPO/$CAEF_CODEARTIFACT_PUBLISH_DOMAIN/$CAEF_CODEARTIFACT_PUBLISH_ACCOUNT as version $PUBLISHED_VERSION with tag $NPM_PUBLISH_TAG"


