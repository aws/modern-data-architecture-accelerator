#!/bin/sh
echo "Checking Node.JS version"
node_version=`node -v`
if [[ $node_version < 'v22.0.0' ]]; then
  echo "MDAA requires Node.JS v22 or higher. Found $node_version."
  exit 1
else
  echo "Found Node.JS $node_version"
fi