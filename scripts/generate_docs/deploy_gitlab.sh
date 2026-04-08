#!/bin/bash
set -e

DOCS_BRANCH=$1

if [ -z "$CI_GROUP_TOKEN" ] || [ -z "$CI_SERVER_HOST" ] || [ -z "$MDAA_DOCS_PROJECT_PATH" ]; then
    echo "Error: Required GitLab CI variables are not set"
    exit 1
fi

CURRENT_VERSION=$(jq -r .version < lerna.json)
PUBLISHED_VERSION="$(cut -d'.' -f1 <<<"$CURRENT_VERSION").$(cut -d'.' -f2 <<<"$CURRENT_VERSION")"

echo "Deploying to GitLab Pages (version: $PUBLISHED_VERSION)..."

git remote add docs_publish "https://gitlab-ci-token:$DOCS_CI_GROUP_TOKEN@$CI_SERVER_HOST/$MDAA_DOCS_PROJECT_PATH.git/"
git fetch docs_publish

mike deploy -u -r docs_publish -b "$DOCS_BRANCH" "$PUBLISHED_VERSION" latest --push
mike set-default "$PUBLISHED_VERSION" -r docs_publish -b "$DOCS_BRANCH" --push

git remote remove docs_publish

echo "GitLab Pages deployment complete."
