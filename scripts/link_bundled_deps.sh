#!/bin/bash
set -e
ROOT_NODE_MODULES_DIR=$1

echo "Linking bundled dependencies to $ROOT_NODE_MODULES_DIR"

rm -rfv "node_modules/@aws-mdaa/"
mkdir -p "node_modules/@aws-mdaa"

# nosemgrep
cat package.json | jq -r '.bundledDependencies | .[]? | @sh'| grep -v null | xargs -n1 -I{} sh -c "ln -svf '$ROOT_NODE_MODULES_DIR/{}/' 'node_modules/{}'"