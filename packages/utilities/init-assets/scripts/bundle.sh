#!/bin/bash
# `set -u` and `pipefail` alongside `-e`: BASH_SOURCE is unset under sh/zsh, which made
# SCRIPT_DIR resolve to `.` and pointed the `rm -rf` below at directories outside the
# package. `set -e` alone also does not abort on a failing `&&` list, which is how the
# `[ -f x ] && cp x y` guards below could fail silently.
set -euo pipefail

# prepack hook for @aws-mdaa/init-assets.
#
# Bundles the documentation and canonical AI steering content that `mdaa init`
# copies into customer projects. Reaches into the repo for source content but
# writes only under this package.
#
# mdaa init generates the per-tool wrapper files itself (thin frontmatter +
# references into agent_rules/), so only the canonical rule BODY is bundled
# here — not the per-tool projections.
#
# Output:
#   docs/                  module READMEs + sample configs + repo README/CONFIGURATION
#   steering/canonical/    canonical rule bodies referenced by the wrappers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(cd "$PACKAGE_DIR/../../.." && pwd)"
DOCS_DIR="$PACKAGE_DIR/docs"
STEERING_DIR="$PACKAGE_DIR/steering"

# Files the package cannot ship without. A rename upstream used to leave prepack
# "succeeding" with an empty steering/canonical/, after which every scaffolded project got
# wrapper files pointing at a rule body that was never written.
REQUIRED_SOURCES=(
  "$REPO_ROOT/README.md"
  "$REPO_ROOT/CONFIGURATION.md"
  "$REPO_ROOT/agent_rules/user-config-authoring.md"
)

missing=()
for required in "${REQUIRED_SOURCES[@]}"; do
  [ -f "$required" ] || missing+=("$required")
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "ERROR: cannot bundle mdaa init assets, missing required source(s):" >&2
  printf '  %s\n' "${missing[@]}" >&2
  exit 1
fi

echo "Bundling mdaa init assets..."
rm -rf "$DOCS_DIR" "$STEERING_DIR"
mkdir -p "$DOCS_DIR" "$STEERING_DIR/canonical"

# Documentation: repo-level docs + per-module READMEs and sample configs
cp "$REPO_ROOT/README.md" "$DOCS_DIR/README.md"
cp "$REPO_ROOT/CONFIGURATION.md" "$DOCS_DIR/CONFIGURATION.md"

# `*-app` rather than `[!n]*-app`: the old glob excluded any app whose name starts with `n`
# for no documented reason, and diverged from the dev-mode fallback in init-steering.ts.
for readme in "$REPO_ROOT"/packages/apps/*/*-app/README.md; do
  [ -f "$readme" ] || continue
  rel_path="${readme#"$REPO_ROOT"/}"
  dest_dir="$DOCS_DIR/$(dirname "$rel_path")"
  mkdir -p "$dest_dir"
  cp "$readme" "$dest_dir/README.md"

  app_dir=$(dirname "$readme")
  if [ -d "$app_dir/sample_configs" ]; then
    cp -r "$app_dir/sample_configs" "$dest_dir/sample_configs"
  fi
done

# Canonical rule body that mdaa init copies into the consumer project's
# agent_rules/ dir (with references rewritten to versioned asset paths).
# (Canonical sources from @aws-mdaa/agent-rules, committed to the repo root.)
cp "$REPO_ROOT/agent_rules/user-config-authoring.md" "$STEERING_DIR/canonical/"

# Prove the two outputs the package exists to carry actually landed
[ -f "$DOCS_DIR/README.md" ] || { echo "ERROR: docs/README.md was not written" >&2; exit 1; }
[ -f "$STEERING_DIR/canonical/user-config-authoring.md" ] || {
  echo "ERROR: steering/canonical/user-config-authoring.md was not written" >&2
  exit 1
}

echo "Done."
