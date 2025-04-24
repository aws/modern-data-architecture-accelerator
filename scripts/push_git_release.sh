#!/bin/bash
set -e
git checkout "$CI_COMMIT_REF_NAME"

PUBLISHED_VERSION=$(jq -r .version < lerna.json)

#Add tag and commit
git commit -a -m "Version $PUBLISHED_VERSION"
git tag -a $PUBLISHED_VERSION -m "Version $PUBLISHED_VERSION"

#Push published version to CAEF Release repo. This will become the public version.
git remote add release_publish $CAEF_DELIVERY_CODE_COMMIT_REPO
git fetch release_publish
git push release_publish --force
git push release_publish --tags --force

