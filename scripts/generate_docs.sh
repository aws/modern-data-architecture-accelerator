#!/bin/bash
set -e
DOCS_BRANCH=$1

export CURRENT_VERSION=`jq -r .version < lerna.json`
export CURRENT_MAJOR=`cut -d'.' -f1 <<<"$CURRENT_VERSION"`
export CURRENT_MINOR=`cut -d'.' -f2 <<<"$CURRENT_VERSION"`

#Publish docs without the patch version
export PUBLISHED_VERSION="${CURRENT_MAJOR}.${CURRENT_MINOR}"

# Ensure target/docs exists but is empty
rm -rf target/docs*;mkdir -p target/docs/

# Generate TypeDocs
npx typedoc --out target/docs/typedocs/

# Copy all markdown and doc png images to target/docs dir (mkdocs needs everything in one spot)
rsync -zarvm --exclude="*node_modules*" --exclude="*coverage*" --include="*/" --include="*.md" --include="*.png" --include="*.css" --include=".pages" --include="*.yaml" --exclude="*" . target/docs/

# Setup a remote which will be used to push docs to the separate CAEF Docs repo (using mike/mkdocs)
git remote add docs_publish "https://gitlab-ci-token:$CI_GROUP_TOKEN@$CI_SERVER_HOST/$CAEF_DOCS_PROJECT_PATH.git/"
git fetch docs_publish

# Use mkdocs/mike to compile the documentation into HTML 
mike deploy -u -r docs_publish -b $DOCS_BRANCH $PUBLISHED_VERSION latest --push
mike set-default $PUBLISHED_VERSION -r docs_publish -b $DOCS_BRANCH --push
git remote remove docs_publish