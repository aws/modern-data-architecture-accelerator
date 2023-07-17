#!/bin/bash
set -e
git checkout "$CI_COMMIT_REF_NAME"

PUBLISHED_VERSION=`cat lerna.json | jq -r .version`

#Add tag and commit
git commit -a -m "Version $PUBLISHED_VERSION"
git tag -a $PUBLISHED_VERSION -m "Version $PUBLISHED_VERSION"

#Push published version to prerelease repo. This will be used to track the latest version for next publish
git remote add prerelease_publish "https://gitlab-ci-token:$CI_GROUP_TOKEN@$CI_SERVER_HOST/${CI_PROJECT_PATH}.git/"
git fetch prerelease_publish
git push prerelease_publish
git push prerelease_publish --tags

#Push published version to prerelease repo. This will be used to track the latest version for next publish
git remote add release_publish "https://gitlab-ci-token:$CI_GROUP_TOKEN@$CI_SERVER_HOST/${CAEF_RELEASE_PROJECT_PATH}.git/"
git fetch release_publish
git push release_publish
git push release_publish --tags

