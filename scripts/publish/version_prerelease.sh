#!/bin/bash
set -e
echo "Running prerelease versioning script."

# Base prerelease version off of current minor version, setting
# patch version to current epoch. package.json is the version source of truth.
export CURRENT_VERSION=$(jq -r .version < package.json)
export EPOCH=$(date +%Y%m%d%H%M%S)
export CURRENT_MAJOR=$(cut -d'.' -f1 <<<"$CURRENT_VERSION")
export CURRENT_MINOR=$(cut -d'.' -f2 <<<"$CURRENT_VERSION")
export NEW_VERSION="${CURRENT_MAJOR}.${CURRENT_MINOR}.${EPOCH}"

echo "Updating version from $CURRENT_VERSION -> $NEW_VERSION"

# Update version in package.json files
find ./ -type f -name "package.json" | grep -v node_modules | xargs -n1 -I{} sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" {}

# Update peerDependency and devDependency versions in package.json files
find ./ -type f -name "package.json" | grep -v node_modules | xargs -n1 -I{} sed -i "s/@aws-mdaa\(.*\)\"\(.*\)$CURRENT_VERSION\"/@aws-mdaa\1\"\2$NEW_VERSION\"/" {}

# Note: .jsii assemblies are build outputs (untracked, regenerated at build time
# with the version stamped from package.json), so no .jsii rewrite is needed.

# Update version in solution-manifest.yaml
if [ -f "solution-manifest.yaml" ]; then
  echo "Updating solution-manifest.yaml version from v$CURRENT_VERSION to v$NEW_VERSION"
  sed -i "s/version: v${CURRENT_VERSION}/version: v${NEW_VERSION}/" solution-manifest.yaml
fi

# Update internal @aws-mdaa dependency versions in package-lock.json
if [ -f "package-lock.json" ]; then
  echo "Updating package-lock.json internal dependency versions from $CURRENT_VERSION to $NEW_VERSION"
  # Update @aws-mdaa dependency references (already scoped by the @aws-mdaa prefix)
  sed -i "s/@aws-mdaa\(.*\)\"\(.*\)$CURRENT_VERSION\"/@aws-mdaa\1\"\2$NEW_VERSION\"/" package-lock.json
  # Update version fields only for @aws-mdaa packages (lines preceded by @aws-mdaa name)
  sed -i "/@aws-mdaa/{n;s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/;}" package-lock.json
  # Update the root-level version field (line 3 of package-lock.json)
  sed -i "3s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" package-lock.json
fi

# installer/ is a standalone package, not an npm workspace, so it is not covered by
# the root package-lock.json handling above.
#
# `npm version` sets package.json and both lockfile version fields absolutely. Unlike
# the root lockfile edit above (anchored to line 3), an unanchored `sed` here would
# match every "version" field in the file, including third-party deps pinned at the
# same number, producing a version/resolved mismatch that breaks `npm ci`.
if [ -f "installer/package.json" ]; then
  echo "Setting installer version to $NEW_VERSION"
  ( cd installer && npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version )
fi
