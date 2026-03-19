#!/bin/bash
set -e
ROOT_NODE_MODULES_DIR=$1

echo "Linking bundled dependencies to $ROOT_NODE_MODULES_DIR"

rm -rfv "node_modules/@aws-mdaa/"
mkdir -p "node_modules/@aws-mdaa"

# Copy bundled dependencies (with dereferenced symlinks) instead of symlinking,
# to ensure npm pack includes the full dependency tree without path traversal.
# Using cp -rL resolves symlinks so nested transitive deps (e.g. fast-xml-parser/node_modules/strnum)
# are included correctly in the tarball.
# nosemgrep
cat package.json | jq -r '.bundledDependencies | .[]? | @sh'| grep -v null | xargs -n1 -I{} sh -c "rm -rf 'node_modules/{}' && cp -rL '$ROOT_NODE_MODULES_DIR/{}/' 'node_modules/{}'"