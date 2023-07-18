#!/bin/bash
set -e
git checkout "$CI_COMMIT_REF_NAME"

PUBLISHED_VERSION=`cat lerna.json | jq -r .version`

#Add tag and commit
git commit -a -m "Version $PUBLISHED_VERSION"
git tag -a $PUBLISHED_VERSION -m "Version $PUBLISHED_VERSION"

#Push published version to CAEF Dev repo. This will be used to track the latest version for next publish
git remote add prerelease_publish "https://gitlab-ci-token:$CI_GROUP_TOKEN@$CI_SERVER_HOST/${CI_PROJECT_PATH}.git/"
git fetch prerelease_publish
git push prerelease_publish
git push prerelease_publish --tags

export $(printf "AWS_ACCESS_KEY_ID=%s AWS_SECRET_ACCESS_KEY=%s AWS_SESSION_TOKEN=%s" \
$(aws sts assume-role \
--role-arn $CAEF_DELIVERY_CODE_COMMIT_ROLE_ARN \
--role-session-name CaefDeliveryCodeCommit \
--query "Credentials.[AccessKeyId,SecretAccessKey,SessionToken]" \
--output text))

#Push published version to CAEF Release repo. This will become the public version.
git remote add release_publish $CAEF_DELIVERY_CODE_COMMIT_REPO
git fetch release_publish
git push release_publish
git push release_publish --tags

