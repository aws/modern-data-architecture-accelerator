#!/bin/bash
set -e

# Validates documentation for a single package.
#
# Runs from the package root directory (via NX/lerna).
# 1. If typedoc.json exists, runs TypeDoc to validate API doc generation.
# 2. Builds a minimal MkDocs site from the package's markdown files using
#    --strict mode to catch warnings as errors, including snippet validation.
#
# Snippet paths in README files use the form:
#   --8<-- "target/docs/<package-path>/sample_configs/foo.yaml"
# These are resolved relative to the snippets base_path. This script mirrors
# the package's assets into the expected target/docs/ structure so that
# snippet resolution works identically to the full site build.
#
# Usage: test_package_docs.sh
# Must be run from the package root directory.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PACKAGE_DIR="$(pwd)"
PACKAGE_REL=$(python3 -c "import os; print(os.path.relpath('$PACKAGE_DIR', '$PROJECT_ROOT'))")
PACKAGE_NAME=$(python3 -c "import json; print(json.load(open('package.json'))['name'])")

echo "=== Validating docs for $PACKAGE_NAME ==="

# --- TypeDoc validation ---
if [ -f "typedoc.json" ]; then
  echo "Running TypeDoc validation..."
  npx typedoc --options typedoc.json --out "$PACKAGE_DIR/.docs-test/typedocs" --logLevel Warn
  echo "TypeDoc validation passed."
else
  echo "No typedoc.json found, skipping TypeDoc validation."
fi

# --- MkDocs validation ---
# Collect markdown files in this package (excluding build artifacts)
MD_FILES=$(find . -name "*.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/coverage/*" \
  -not -path "*/jsii-dist/*" \
  -not -path "*/.docs-test/*" \
  -not -path "*/.venv/*" \
  2>/dev/null || true)

if [ -z "$MD_FILES" ]; then
  echo "No markdown files found, skipping MkDocs validation."
  rm -rf "$PACKAGE_DIR/.docs-test"
  echo "=== Doc validation complete for $PACKAGE_NAME ==="
  exit 0
fi

echo "Validating MkDocs rendering for markdown files..."

# Create a temporary MkDocs project scoped to this package.
# The directory layout mirrors the full site build so snippet paths resolve:
#   .docs-test/mkdocs/docs/          <- MkDocs docs_dir (markdown lives here)
#   .docs-test/mkdocs/target/docs/<package-path>/  <- snippet assets
MKDOCS_TEMP="$PACKAGE_DIR/.docs-test/mkdocs"
rm -rf "$MKDOCS_TEMP"
mkdir -p "$MKDOCS_TEMP/docs"

# Copy markdown files preserving directory structure
for md in $MD_FILES; do
  dir=$(dirname "$md")
  mkdir -p "$MKDOCS_TEMP/docs/$dir"
  cp "$md" "$MKDOCS_TEMP/docs/$dir/"
done

# Mirror snippet-referenced assets into the target/docs/ path structure.
# Snippet paths use: "target/docs/<package-path>/sample_configs/foo.yaml"
# resolved relative to base_path (set to MKDOCS_TEMP below).
SNIPPET_TARGET="$MKDOCS_TEMP/target/docs/$PACKAGE_REL"
mkdir -p "$SNIPPET_TARGET"

# Copy all non-markdown assets that snippets may reference
ASSET_DIRS=$(find . -type d -name "sample_configs" \
  -not -path "*/node_modules/*" \
  -not -path "*/.docs-test/*" \
  -not -path "*/.venv/*" \
  2>/dev/null || true)

for asset_dir in $ASSET_DIRS; do
  rel_dir=$(dirname "$asset_dir")
  mkdir -p "$SNIPPET_TARGET/$rel_dir"
  cp -r "$asset_dir" "$SNIPPET_TARGET/$rel_dir/"
done

# Also copy any loose yaml/tf files that might be snippet targets
ASSET_FILES=$(find . \( -name "*.yaml" -o -name "*.yml" -o -name "*.tf" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/coverage/*" \
  -not -path "*/jsii-dist/*" \
  -not -path "*/.docs-test/*" \
  -not -path "*/.venv/*" \
  -not -path "*/sample_configs/*" \
  2>/dev/null || true)

for asset in $ASSET_FILES; do
  dir=$(dirname "$asset")
  mkdir -p "$SNIPPET_TARGET/$dir"
  cp "$asset" "$SNIPPET_TARGET/$dir/"
done

# Generate a minimal mkdocs.yml with the same markdown extensions as the root config.
# base_path is set to MKDOCS_TEMP so snippet paths like
# "target/docs/<package-path>/sample_configs/foo.yaml" resolve correctly.
cat > "$MKDOCS_TEMP/mkdocs.yml" << EOF
site_name: Doc Validation
docs_dir: docs
site_dir: site
use_directory_urls: false
theme:
  name: material
plugins:
  - search
markdown_extensions:
  - pymdownx.highlight:
      anchor_linenums: true
  - pymdownx.superfences
  - pymdownx.snippets:
      check_paths: true
      base_path: '$MKDOCS_TEMP'
  - pymdownx.inlinehilite
  - mdx_truly_sane_lists
EOF

# Build with --strict so warnings (broken refs, bad markdown) become errors
(cd "$MKDOCS_TEMP" && python3 -m mkdocs build --strict --quiet) || {
  echo "ERROR: MkDocs validation failed for $PACKAGE_NAME"
  rm -rf "$PACKAGE_DIR/.docs-test"
  exit 1
}

echo "MkDocs validation passed."

# Clean up
rm -rf "$PACKAGE_DIR/.docs-test"

echo "=== Doc validation complete for $PACKAGE_NAME ==="
