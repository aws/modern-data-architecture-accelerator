#!/bin/bash
set -e
echo "Running package script."

mkdir -p $CI_PROJECT_DIR/target/package-build

# Bundled dependencies won't be included in package 
# because they are hoisted by npm install and not under 
# nodule_modules in the individual packages. This script
# will link them so they are included in the packages.
npx lerna exec "$CI_PROJECT_DIR/scripts/link_bundled_deps.sh $CI_PROJECT_DIR/node_modules" --stream

# Build npm packages
npx lerna exec "npm pack --pack-destination $CI_PROJECT_DIR/target/package-build" --stream

# Use jsii to build JSII Packages
npx lerna run package --stream


