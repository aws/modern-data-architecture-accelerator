#!/bin/bash
set -e
rm package-lock.json
echo "Running release versioning script."

#Increment version using lerna
export CURRENT_VERSION=$(jq -r .version < lerna.json )

# Determine the lerna command based on RELEASE_TYPE
case "${RELEASE_TYPE}" in
  "alpha"|"beta"|"rc")
    echo "Creating ${RELEASE_TYPE} prerelease version"
    npx lerna version pre${VERSION_BUMP_LEVEL} --preid=${RELEASE_TYPE} --no-git-tag-version --no-push --force-publish -y || true
    ;;
  "release"|"")
    echo "Creating release version"
    npx lerna version $VERSION_BUMP_LEVEL --no-git-tag-version --no-push --force-publish -y || true
    ;;
  *)
    echo "Invalid RELEASE_TYPE: ${RELEASE_TYPE}. Must be alpha, beta, rc, release, or empty."
    exit 1
    ;;
esac

export NEW_VERSION=$(jq -r .version < lerna.json)

echo "Updating version from $CURRENT_VERSION -> $NEW_VERSION"

# Update root package.json version
jq --arg version "$NEW_VERSION" '.version = $version' package.json > package.json.tmp && mv package.json.tmp package.json

# Update version in .jsii files
find ./packages -type f -name ".jsii" | grep -v node_modules | xargs -n1 -I{} sed -i  "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" {}

# Update peerDependency and devDependency versions in package.json files
find ./packages -type f -name "package.json" | grep -v node_modules | xargs -n1 -I{} sed -i  "s/@aws-mdaa\(.*\)\"\(.*\)$CURRENT_VERSION\"/@aws-mdaa\1\"\2$NEW_VERSION\"/" {}
sed -i  "s/@aws-mdaa\(.*\)\"\(.*\)$CURRENT_VERSION\"/@aws-mdaa\1\"\2$NEW_VERSION\"/" ./schemas/package.json

npm install

