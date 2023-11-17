#!/bin/bash
set -e
echo "Running prerelease versioning script."

# Base prerelease version off of current minor version, setting
# patch version to current epoch
export CURRENT_VERSION=`jq -r .version < lerna.json `
export EPOCH=`date +%Y%m%d%H%M%S`
export CURRENT_MAJOR=`cut -d'.' -f1 <<<"$CURRENT_VERSION"`
export CURRENT_MINOR=`cut -d'.' -f2 <<<"$CURRENT_VERSION"`
export NEW_VERSION="${CURRENT_MAJOR}.${CURRENT_MINOR}.${EPOCH}"

echo "Updating version from $CURRENT_VERSION -> $NEW_VERSION"

rm package-lock.json

# Update version in lerna.json
sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" lerna.json

# Update version in package.json files (in each package)
find ./ -type f -name "package.json" | grep -v node_modules | xargs -n1 -I{} sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" {}

# Update peerDependency and devDependency versions in package.json files
find ./packages -type f -name "package.json" | grep -v node_modules | xargs -n1 -I{} sed -i  "s/@aws-caef\(.*\)\"\(.*\)$CURRENT_VERSION\"/@aws-caef\1\"\2$NEW_VERSION\"/" {}

# Update version in .jsii files (in each package)
find ./ -type f -name ".jsii" | grep -v node_modules | xargs -n1 -I{} sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" {}




