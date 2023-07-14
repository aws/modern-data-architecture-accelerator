#!/bin/bash
set -e
CAEF_CODEARTIFACT_PIP_PUBLISH_REPO=$1
CAEF_CODEARTIFACT_PUBLISH_DOMAIN=$2
CAEF_CODEARTIFACT_PUBLISH_ACCOUNT=$3

export PUBLISHED_VERSION=`cat lerna.json | jq -r .version`
pip3 install urllib3==1.26.15 requests-toolbelt==0.10.1

#Publish pip release packages
aws codeartifact login --tool twine --repository $CAEF_CODEARTIFACT_PIP_PUBLISH_REPO --domain $CAEF_CODEARTIFACT_PUBLISH_DOMAIN --domain-owner $CAEF_CODEARTIFACT_PUBLISH_ACCOUNT --region us-east-1
find ./packages/ -type f|grep jsii-dist|grep python|grep tar.gz|xargs -n1 -I{} twine upload --repository codeartifact {}

echo "Published to CodeArtifact $CAEF_CODEARTIFACT_PIP_PUBLISH_REPO/$CAEF_CODEARTIFACT_PUBLISH_DOMAIN/$CAEF_CODEARTIFACT_PUBLISH_ACCOUNT as version $PUBLISHED_VERSION"

