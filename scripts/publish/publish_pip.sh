#!/bin/bash
set -e
MDAA_CODEARTIFACT_PIP_PUBLISH_REPO=$1
MDAA_CODEARTIFACT_PUBLISH_DOMAIN=$2
MDAA_CODEARTIFACT_PUBLISH_ACCOUNT=$3

export PUBLISHED_VERSION=$(jq -r .version < lerna.json )

#Publish pip release packages
aws codeartifact login --tool twine --repository $MDAA_CODEARTIFACT_PIP_PUBLISH_REPO --domain $MDAA_CODEARTIFACT_PUBLISH_DOMAIN --domain-owner $MDAA_CODEARTIFACT_PUBLISH_ACCOUNT --region us-east-1
find ./packages/ -type f|grep jsii-dist|grep python|grep tar.gz|xargs -n1 -I{} twine upload --repository codeartifact {}

echo "Published to CodeArtifact $MDAA_CODEARTIFACT_PIP_PUBLISH_REPO/$MDAA_CODEARTIFACT_PUBLISH_DOMAIN/$MDAA_CODEARTIFACT_PUBLISH_ACCOUNT as version $PUBLISHED_VERSION"

