#!/bin/bash
set -e

# Validates the version-bumped release commit from a pristine environment, BEFORE
# it is pushed to main (prerelease_push_git / release_push_git) or built into the
# Cornerstone distribution.
#
# Why this exists:
#   release_version_package runs version_release.sh, which does `rm package-lock.json`
#   and then regenerates it with a lenient `npm install` on top of an already-populated
#   node_modules, then builds and tests against that dirty tree. The resulting commit is
#   pushed straight to main without ever being installed from the regenerated lockfile.
#   So the exact tree that becomes mainline HEAD is never proven to install/build/test
#   from a clean checkout. If it does not, main is poisoned and the next release engineer
#   inherits a broken mainline that requires a rewrite.
#
# What this does:
#   Consumes the version-bumped TRACKED files from the release_version_package artifacts
#   (package.json, package-lock.json, packages/, starter_kits/, schemas/,
#   solution-manifest.yaml, README.md, CHANGELOG.md), wipes all dependency and nx state,
#   then reproduces the release build/test from a strict `npm ci`. The strict install
#   from the committed lockfile is the signal release_version_package cannot give.
#
# This job MUST NOT touch any git remote. It only validates; it blocks the downstream
# push/cornerstone jobs (via their `needs:`) on failure.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
cd "$PROJECT_ROOT"

VALIDATED_VERSION=$(jq -r .version < package.json)
echo "=================================================================="
echo "Validating release commit for version: $VALIDATED_VERSION"
echo "=================================================================="

# Suppress WASI experimental warnings (matches npm_install_repo.sh)
export NODE_NO_WARNINGS=1

# 1. Guarantee a pristine dependency + nx state. The artifacts from
#    release_version_package deliberately exclude node_modules and .nx, but the
#    runner image may still leave them behind. Remove every node_modules at any depth
#    (find, not a `**` glob — bash globstar is off by default and would miss MDAA's
#    deeply nested packages/constructs/L3/*/* layout) plus the nx cache, so `npm ci`
#    installs entirely from scratch against the committed lockfile.
echo "Removing any pre-existing node_modules and nx state for a clean install..."
find . -name node_modules -type d -prune -exec rm -rf {} +
rm -rf .nx
# The nx daemon is stopped by build_repo.sh (CI=true) before the build; no need to
# stop it here, and doing so after removing node_modules would force npx to re-fetch nx.

# 2. Strict install from the committed lockfile. `npm ci` fails (unlike `npm install`)
#    if package.json and package-lock.json disagree — exactly the drift that
#    version_release.sh's lenient regeneration can introduce and that nothing else
#    in the release path exercises.
echo "Running strict npm ci from the committed package-lock.json..."
npm ci

# 3. Full build, from source, on main semantics. build:all is the repo's own
#    full-graph build (NX_RUN_ALL=true npm run build); using the script rather than
#    inlining NX_RUN_ALL keeps the full-graph mechanism defined in one place
#    (package.json) so a future nx migration only updates it there.
echo "Running full build..."
npm run build:all

# 4. The committed schema files (schemas/@aws-mdaa/, **/config-schema.json, **/SCHEMA.md
#    are tracked) must match what the build regenerates. If version_release.sh or a
#    stale commit left schemas out of sync, the tree that lands on main would fail the
#    next merge pipeline's drift check; catch it here instead.
echo "Checking for schema drift..."
./scripts/ci/check_schema_drift.sh

# 5. TypeScript test suite against the pristine, version-bumped tree. test:all is the
#    repo's own full-graph test (NX_RUN_ALL=true npm run test), kept in package.json
#    for the same single-source reason as build:all above. Under CI=true test_repo.sh
#    runs the TS suite only; the Python and starter-kit synth suites are guarded with
#    `if CI != true` because they run as their own pipeline jobs (prerelease_test_python,
#    feature_merge_starter_kit_test). This mirrors release_version_package's test
#    surface — install integrity + TS build + TS tests + schema.
echo "Running the TypeScript test suite..."
npm run test:all

echo "=================================================================="
echo "Release commit for version $VALIDATED_VERSION validated successfully."
echo "The tree installs (strict npm ci), builds, and passes the TypeScript test"
echo "suite and schema-drift check from a pristine checkout. (Python and starter-kit"
echo "test suites run in their own pipeline jobs.)"
echo "=================================================================="
