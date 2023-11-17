#!/bin/bash
set -e
PACKAGE_BUCKET=$1

export PUBLISHED_VERSION=`jq -r .version < lerna.json `

#Zip all built packages and publish to S3
zip -jr target/caef-packages-$PUBLISHED_VERSION.zip target/package-build/*
aws s3 cp target/caef-packages-$PUBLISHED_VERSION.zip s3://$PACKAGE_BUCKET/releases/caef-packages-$PUBLISHED_VERSION.zip
aws s3 cp target/caef-packages-$PUBLISHED_VERSION.zip s3://$PACKAGE_BUCKET/releases/caef-packages-latest.zip

echo "Published packages to s3://$PACKAGE_BUCKET/releases/caef-packages-$PUBLISHED_VERSION.zip"


