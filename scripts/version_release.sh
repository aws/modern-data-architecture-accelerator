#!/bin/bash
set -e
rm package-lock.json
echo "Running release versioning script."

#Increment version using lerna
export CURRENT_VERSION=$(jq -r .version < lerna.json )
npx lerna version $VERSION_BUMP_LEVEL --no-git-tag-version --no-push --force-publish -y || true
export NEW_VERSION=$(jq -r .version < lerna.json)

echo "Updating version from $CURRENT_VERSION -> $NEW_VERSION"

# Update version in .jsii files
find ./packages -type f -name ".jsii" | grep -v node_modules | xargs -n1 -I{} sed -i  "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" {}

# Update peerDependency and devDependency versions in package.json files
find ./packages -type f -name "package.json" | grep -v node_modules | xargs -n1 -I{} sed -i  "s/@aws-mdaa\(.*\)\"\(.*\)$CURRENT_VERSION\"/@aws-mdaa\1\"\2$NEW_VERSION\"/" {}
sed -i  "s/@aws-mdaa\(.*\)\"\(.*\)$CURRENT_VERSION\"/@aws-mdaa\1\"\2$NEW_VERSION\"/" ./schemas/package.json

npm install

