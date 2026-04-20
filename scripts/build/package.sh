#!/bin/bash
set -e
echo "Running package script."

mkdir -p $CI_PROJECT_DIR/target/package-build

# Bundled dependencies won't be included in package 
# because they are hoisted by npm install and not under 
# nodule_modules in the individual packages. This script
# will link them so they are included in the packages.
npx lerna exec "$CI_PROJECT_DIR/scripts/build/link_bundled_deps.sh $CI_PROJECT_DIR/node_modules" --stream

# Build npm packages (skip private packages)
npx lerna exec "if [ \"\$(jq -r '.private // false' package.json)\" != 'true' ]; then npm pack --pack-destination $CI_PROJECT_DIR/target/package-build; else echo 'Skipping private package'; fi" --stream

# Validate no tarballs contain path traversal (e.g. from bundledDependencies hoisting issues)
echo "Validating tarball paths..."
TRAVERSAL_FOUND=false
for tarball in $CI_PROJECT_DIR/target/package-build/*.tgz; do
    if [ -f "$tarball" ]; then
        bad_paths=$(tar -tzf "$tarball" 2>/dev/null | grep '\.\.' || true)
        if [ -n "$bad_paths" ]; then
            echo "❌ $(basename "$tarball") contains path traversal entries:"
            echo "$bad_paths"
            TRAVERSAL_FOUND=true
        fi
    fi
done
if [ "$TRAVERSAL_FOUND" = true ]; then
    echo "ERROR: One or more tarballs contain '..' path traversal. This usually indicates a bundledDependencies issue with link_bundled_deps.sh."
    exit 1
fi
echo "✅ All tarballs validated — no path traversal found."

# Use jsii to build JSII Packages
npx lerna run package --stream


