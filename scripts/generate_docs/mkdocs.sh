#!/bin/bash
set -e

echo "Building MkDocs site..."

# Copy all markdown and doc assets to target/docs dir (mkdocs needs everything in one spot)
rsync -zarvm --exclude="*node_modules*" --exclude="*coverage*" \
  --include="*/" --include="*.md" --include="*.png" --include="*.css" \
  --include=".pages" --include="*.yaml" --include="*.yml" --include="*.tf" \
  --exclude="*" . target/docs/

# Build using mkdocs from root directory
mkdocs build --config-file mkdocs.yml --site-dir target/docs_site

echo "MkDocs site built."
