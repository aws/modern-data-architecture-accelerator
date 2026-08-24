#!/bin/bash
set -euo pipefail

# Validates the version-bumped release commit from a pristine checkout, before anything is
# published or pushed. release_version_package builds against a dirty tree and never installs
# from the lockfile it regenerates, so this job asserts the version bump landed everywhere,
# then proves the tree installs/builds/tests from a strict `npm ci`.
#
# MUST NOT touch any git remote. It blocks the downstream publish/push/cornerstone jobs.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
cd "$PROJECT_ROOT"

# sample_customizations/* pin an older MDAA on purpose.
SPEC_CHECK_EXCLUDE='^sample_customizations/'

# Every check below enumerates files via a command whose failure yields an empty list, which
# would pass the check having inspected nothing. Real counts are ~157-167.
MIN_ENUMERATION_FLOOR=100

# Suppress WASI experimental warnings (matches npm_install_repo.sh)
export NODE_NO_WARNINGS=1

EXPECTED_VERSION=$(jq -r '.version // empty' < package.json)
if [ -z "$EXPECTED_VERSION" ]; then
  echo "ERROR: root package.json has no .version." >&2
  exit 1
fi

echo "=================================================================="
echo "Validating release commit for version: $EXPECTED_VERSION"
echo "=================================================================="

# Accumulated so one run reports every problem instead of one per re-run.
PROBLEMS=""
note_problem() {
  PROBLEMS="${PROBLEMS}
  - $1"
}

# 1. The checkout is the pre-bump commit with the artifacts overlaid on top. If that overlay
#    failed, every check below would pass against an unbumped tree.
echo "--- Checking the version bump reached the tree ---"
if ! PREVIOUS_VERSION=$(git show HEAD:package.json 2>/dev/null | jq -r '.version // empty') || [ -z "$PREVIOUS_VERSION" ]; then
  echo "ERROR: could not read the pre-bump version from git HEAD:package.json." >&2
  exit 1
fi
if [ "$EXPECTED_VERSION" = "$PREVIOUS_VERSION" ]; then
  echo "ERROR: root package.json is still at $PREVIOUS_VERSION; the release_version_package artifacts did not overlay the checkout." >&2
  exit 1
fi
echo "Bumped $PREVIOUS_VERSION -> $EXPECTED_VERSION."

# 2. Materialized rather than expanded inline in the `for` list: a failing command
#    substitution there does not trip `set -e`, and npm writes its JSON error object to stdout
#    where jq renders it as "null" and exits 0.
echo "--- Checking workspace and installer versions ---"
WORKSPACE_DIRS=$(npm query .workspace --package-lock-only --expect-results | jq -r '.[].location')
WORKSPACE_COUNT=$(printf '%s\n' "$WORKSPACE_DIRS" | grep -c . || true)
if [ "$WORKSPACE_COUNT" -lt "$MIN_ENUMERATION_FLOOR" ]; then
  echo "ERROR: npm query enumerated only $WORKSPACE_COUNT workspaces; this is not the release lockfile." >&2
  exit 1
fi
while IFS= read -r pkg_dir; do
  [ -f "$pkg_dir/package.json" ] || continue
  pkg_version=$(jq -r '.version // empty' "$pkg_dir/package.json")
  if [ "$pkg_version" != "$EXPECTED_VERSION" ]; then
    note_problem "$pkg_dir/package.json is at ${pkg_version:-none}, expected $EXPECTED_VERSION"
  fi
done < <(printf '%s\ninstaller\n' "$WORKSPACE_DIRS")

# 2b. `npm ci` accepts a lockfile whose version disagrees with its package.json, so the
#     install cannot be relied on to catch this.
echo "--- Checking lockfile versions ---"
for lock in package-lock.json installer/package-lock.json; do
  [ -f "$lock" ] || continue
  for field in '.version' '.packages[""].version'; do
    lock_version=$(jq -r "$field // empty" "$lock")
    if [ "$lock_version" != "$EXPECTED_VERSION" ]; then
      note_problem "$lock $field is ${lock_version:-none}, expected $EXPECTED_VERSION"
    fi
  done
done

# 3. A spec left on the old version resolves the published predecessor from CodeArtifact
#    instead of linking the local workspace. Sections are checked separately because packages
#    list the same dep in several, and a correct one would mask a drifted one. Exact equality
#    is intended: check-aws-mdaa-versions.sh rejects range prefixes on @aws-mdaa deps.
echo "--- Checking @aws-mdaa dependency specs ---"
SPEC_FILES=$(git ls-files '*package.json' | grep -Ev "$SPEC_CHECK_EXCLUDE" || true)
SPEC_FILE_COUNT=$(printf '%s\n' "$SPEC_FILES" | grep -c . || true)
if [ "$SPEC_FILE_COUNT" -lt "$MIN_ENUMERATION_FLOOR" ]; then
  echo "ERROR: only $SPEC_FILE_COUNT package.json files enumerated for the @aws-mdaa spec check." >&2
  exit 1
fi
while IFS= read -r pkg_file; do
  [ -f "$pkg_file" ] || continue
  # Assigned, not read from a process substitution: procsub exit status is discarded, so a jq
  # error would silently no-op this check.
  drifted_specs=$(jq -r --arg v "$EXPECTED_VERSION" '
    . as $pkg
    | ("dependencies", "devDependencies", "peerDependencies")
    | . as $section
    | ($pkg[$section] // {})
    | to_entries[]
    | select(.key | startswith("@aws-mdaa/"))
    | select(.value != $v)
    | "pins \($section) \(.key)@\(.value)"
  ' "$pkg_file")
  while IFS= read -r drifted; do
    [ -n "$drifted" ] && note_problem "$pkg_file $drifted, expected $EXPECTED_VERSION"
  done < <(printf '%s\n' "$drifted_specs")
done < <(printf '%s\n' "$SPEC_FILES")

# 4. Same property as 3, read from the lockfile: a `resolved` URL instead of `link: true`
#    means npm satisfied it from the registry.
echo "--- Checking @aws-mdaa packages resolve to local workspaces ---"
MDAA_LOCK_ENTRIES=$(jq -r '[.packages // {} | keys[] | select(startswith("node_modules/@aws-mdaa/"))] | length' package-lock.json)
if [ "$MDAA_LOCK_ENTRIES" -lt "$MIN_ENUMERATION_FLOOR" ]; then
  echo "ERROR: package-lock.json lists only $MDAA_LOCK_ENTRIES @aws-mdaa entries; this is not the release lockfile." >&2
  exit 1
fi
while IFS= read -r registry_dep; do
  [ -n "$registry_dep" ] && note_problem "$registry_dep is resolved from the registry in package-lock.json, not linked from the workspace"
done < <(jq -r '
  .packages // {}
  | to_entries[]
  | select(.key | startswith("node_modules/@aws-mdaa/"))
  | select(.value.link != true)
  | .key
' package-lock.json)

# 5. version_release.sh stamps these by substitution and cannot report what it produced.
echo "--- Checking version-stamped files ---"
if [ -f solution-manifest.yaml ] && ! grep -q "^version: v${EXPECTED_VERSION}$" solution-manifest.yaml; then
  note_problem "solution-manifest.yaml is not at v$EXPECTED_VERSION ($(grep '^version:' solution-manifest.yaml || echo 'no version line'))"
fi
if [ -f CHANGELOG.md ] && ! grep -q "^## \[${EXPECTED_VERSION}\] - " CHANGELOG.md; then
  note_problem "CHANGELOG.md has no '## [$EXPECTED_VERSION] - <date>' release heading"
fi

if [ -n "$PROBLEMS" ]; then
  echo "" >&2
  echo "ERROR: the version bump to $EXPECTED_VERSION did not reach everything it must:$PROBLEMS" >&2
  echo "" >&2
  echo "The version propagation is keyed on the previous version, so anything already drifted" >&2
  echo "must be re-synced by hand on main before re-running the release." >&2
  exit 1
fi
echo "Checked $WORKSPACE_COUNT workspaces plus the installer, both lockfiles, and the @aws-mdaa"
echo "specs in $SPEC_FILE_COUNT package.json files: all at $EXPECTED_VERSION."

# 6. `find`, not a `**` glob: globstar is off by default and would miss the nested
#    packages/constructs/L3/*/* layout.
echo "--- Removing any pre-existing node_modules and nx state for a clean install ---"
find . -name node_modules -type d -prune -exec rm -rf {} +
rm -rf .nx

# 7. installer/ is outside the workspaces and the nx graph, so no other job builds or tests it
#    before the publish. Its jest snapshot pins the release/v<version> branch default derived
#    from the root package.json, which is how a missed bump surfaces here.
echo "--- Validating the installer (strict npm ci, build, test) ---"
(
  cd installer
  npm ci
  npm run build
  npm test
)

# 8. `npm ci` fails, unlike `npm install`, when package.json and the lockfile disagree.
echo "--- Running strict npm ci from the committed package-lock.json ---"
npm ci

# 9-11. build:all / test:all are the repo's full-graph scripts, so the NX_RUN_ALL mechanism
#       stays defined in package.json. Under CI=true test_repo.sh runs the TS suite only; the
#       Python and starter-kit suites are their own jobs. The heap cap matches
#       release_version_package (BUILD_CONCURRENCY is capped in the job definition).
echo "--- Running full build ---"
npm run build:all

echo "--- Checking for schema drift ---"
./scripts/ci/check_schema_drift.sh

echo "--- Running the TypeScript test suite ---"
NODE_OPTIONS=--max-old-space-size=3072 npm run test:all

echo "=================================================================="
echo "Release commit for version $EXPECTED_VERSION validated successfully."
echo "=================================================================="
