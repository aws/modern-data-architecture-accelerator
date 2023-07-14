#!/bin/bash
set -e
git checkout "$CI_COMMIT_REF_NAME"

PUBLISHED_VERSION=`cat lerna.json | jq -r .version`

#Add tag and commit/push published version to repo. This will be used to track the latest version for next publish
git remote add publish "https://gitlab-ci-token:$CI_GROUP_TOKEN@$CI_SERVER_HOST/${CI_PROJECT_PATH}.git/"
git fetch publish
git commit -a -m "Version $PUBLISHED_VERSION"
git tag -a $PUBLISHED_VERSION -m "Version $PUBLISHED_VERSION"
git push publish
git push publish --tags



