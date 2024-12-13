#!/bin/bash
set -e
git checkout "$CI_COMMIT_REF_NAME"

PUBLISHED_VERSION=$(jq -r .version < lerna.json)

#Add tag and commit
git commit -a -m "Version $PUBLISHED_VERSION"
git tag -a $PUBLISHED_VERSION -m "Version $PUBLISHED_VERSION"

# export $(printf "AWS_ACCESS_KEY_ID=%s AWS_SECRET_ACCESS_KEY=%s AWS_SESSION_TOKEN=%s" \
# $(aws sts assume-role \
# --role-arn $CAEF_DELIVERY_CODE_COMMIT_ROLE_ARN \
# --role-session-name MdaaDeliveryCodeCommit \
# --query "Credentials.[AccessKeyId,SecretAccessKey,SessionToken]" \
# --output text))

#Push published version to CAEF Release repo. This will become the public version.
git remote add release_publish $CAEF_DELIVERY_CODE_COMMIT_REPO
git fetch release_publish
git pull release_publish main -Xours
git push release_publish --force
git push release_publish --tags --force

