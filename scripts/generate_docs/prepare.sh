#!/bin/bash
set -e

# Source this script to prepare the docs output directory.
#   source ./scripts/generate_docs/prepare.sh

rm -rf target/docs*
mkdir -p target/docs/

echo "Docs output directory prepared."
