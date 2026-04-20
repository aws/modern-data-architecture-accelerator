#!/bin/bash
set -e

echo "Generating config schema docs..."

# CLI schema doc
generate-schema-doc --config-file ./scripts/generate_docs/jsfh-conf.yaml ./packages/cli/lib/config-schema.json ./packages/cli/SCHEMA.md

# Module schema docs
find ./packages/apps/ -name config-schema.json -execdir generate-schema-doc --config-file ../../../../../scripts/generate_docs/jsfh-conf.yaml {} ../SCHEMA.md ';'

echo "Schema docs generated."
