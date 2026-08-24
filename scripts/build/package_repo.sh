#!/bin/bash
set -eo pipefail
echo "Running package script."

# `.location` values from npm query are repo-root-relative, so every `cd` below
# assumes the repo root as cwd. Anchor it rather than relying on the job's cwd.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../.."

# Fail fast: unset, this would `mkdir -p /target/package-build` and later glob
# /target/... for tarballs. `set -u` is not enabled here, so nothing else catches it.
: "${CI_PROJECT_DIR:?CI_PROJECT_DIR must be set (locally: CI_PROJECT_DIR=\$(pwd) $0)}"

mkdir -p "$CI_PROJECT_DIR/target/package-build"

# Enumerate every workspace package directory once. `.location` is the package
# directory relative to the repo root.
#
# --package-lock-only reads the committed lockfile instead of the installed
# node_modules tree. These jobs restore node_modules from a cache and never run
# `npm ci`, so a stale cache would otherwise omit a newly added workspace from both
# the linking below and `npm pack`, publishing an incomplete release successfully.
#
# --expect-results and `jq -e` both exit non-zero on an empty selection, so with
# `pipefail` an enumeration failure aborts rather than packaging nothing.
WORKSPACE_LOCATIONS=$(npm query .workspace --package-lock-only --expect-results | jq -e -r '.[].location')
if [ -z "$WORKSPACE_LOCATIONS" ]; then
  echo "ERROR: 'npm query .workspace' enumerated no workspaces. Refusing to package nothing." >&2
  exit 1
fi
echo "Enumerated $(printf '%s\n' "$WORKSPACE_LOCATIONS" | wc -l | tr -d ' ') workspace packages."

# Bundled dependencies won't be included in package
# because they are hoisted by npm install and not under
# nodule_modules in the individual packages. This script
# will link them so they are included in the packages.
while IFS= read -r pkg_dir; do
  [ -n "$pkg_dir" ] || continue
  ( cd "$pkg_dir" && "$CI_PROJECT_DIR/scripts/build/link_bundled_deps.sh" "$CI_PROJECT_DIR/node_modules" )
done <<< "$WORKSPACE_LOCATIONS"

# Build npm packages (skip private packages)
while IFS= read -r pkg_dir; do
  [ -n "$pkg_dir" ] || continue
  (
    cd "$pkg_dir"
    if [ "$(jq -r '.private // false' package.json)" != 'true' ]; then
      npm pack --pack-destination "$CI_PROJECT_DIR/target/package-build"
    else
      echo "Skipping private package in $pkg_dir"
    fi
  )
done <<< "$WORKSPACE_LOCATIONS"

# Assert packing produced artifacts. The validation loop below globs for *.tgz and
# skips non-matches, so an empty directory would otherwise pass validation and let a
# downstream `npm publish` report success having published nothing.
TARBALL_COUNT=$(find "$CI_PROJECT_DIR/target/package-build" -maxdepth 1 -name '*.tgz' | wc -l | tr -d ' ')
if [ "$TARBALL_COUNT" -eq 0 ]; then
    echo "ERROR: no tarballs were produced in $CI_PROJECT_DIR/target/package-build." >&2
    exit 1
fi
echo "Packed $TARBALL_COUNT tarballs."

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

# Use jsii to build JSII Packages. `package` has no nx.json targetDefaults entry, so
# nx would otherwise default to 3 concurrent jsii-pacmak runs across ~90 packages,
# leaving most of the runner idle. release_version_package is the only job that both runs this
# script and sets BUILD_CONCURRENCY, at this same 8, so the default covers the others.
npx nx run-many -t package --all --parallel="${BUILD_CONCURRENCY:-8}"


