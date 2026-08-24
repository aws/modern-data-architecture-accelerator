#!/bin/bash
set -e
rm package-lock.json
echo "Running release versioning script."

# package.json is the single version source of truth, kept in sync across all
# workspaces by the propagation below.
export CURRENT_VERSION=$(jq -r .version < package.json)

# Validate before handing the level to semver: `semver -i <level>` silently falls
# back to a patch bump for an unrecognized level, and for a prerelease it drops the
# identifier entirely, so a typo would compute a wrong version instead of failing.
case "${VERSION_BUMP_LEVEL}" in
  major|minor|patch) ;;
  *)
    echo "ERROR: Invalid VERSION_BUMP_LEVEL: '${VERSION_BUMP_LEVEL}'. Must be major, minor, or patch." >&2
    exit 1
    ;;
esac

# Determine the semver bump based on RELEASE_TYPE
case "${RELEASE_TYPE}" in
  "alpha"|"beta"|"rc")
    echo "Creating ${RELEASE_TYPE} prerelease version"
    NEW_VERSION=$(npx semver "$CURRENT_VERSION" -i "pre${VERSION_BUMP_LEVEL}" --preid "${RELEASE_TYPE}")
    ;;
  "release"|"")
    echo "Creating release version"
    NEW_VERSION=$(npx semver "$CURRENT_VERSION" -i "${VERSION_BUMP_LEVEL}")
    ;;
  *)
    echo "Invalid RELEASE_TYPE: ${RELEASE_TYPE}. Must be alpha, beta, rc, release, or empty."
    exit 1
    ;;
esac
export NEW_VERSION

if [ -z "$NEW_VERSION" ] || [ "$NEW_VERSION" = "$CURRENT_VERSION" ]; then
  echo "ERROR: semver did not produce a new version from '$CURRENT_VERSION' (bump '${VERSION_BUMP_LEVEL}', type '${RELEASE_TYPE}')." >&2
  exit 1
fi

# Assert a prerelease carries the requested identifier. A bare-numeric prerelease
# (e.g. 1.8.0-0) matches no consumer's @alpha/@beta/@rc dist-tag range.
case "${RELEASE_TYPE}" in
  alpha|beta|rc)
    if [[ "$NEW_VERSION" != *"-${RELEASE_TYPE}."* ]]; then
      echo "ERROR: RELEASE_TYPE='${RELEASE_TYPE}' but computed version '$NEW_VERSION' has no '-${RELEASE_TYPE}.N' identifier." >&2
      exit 1
    fi
    ;;
esac

echo "Updating version from $CURRENT_VERSION -> $NEW_VERSION"

# Update root package.json version
jq --arg version "$NEW_VERSION" '.version = $version' package.json > package.json.tmp && mv package.json.tmp package.json

# .jsii assemblies need no rewrite: they are untracked build outputs, and jsii
# stamps the assembly version from package.json at compile time.

# Update peerDependency and devDependency versions in package.json files
find ./ -type f -name "package.json" | grep -v node_modules | xargs -n1 -I{} sed -i  "s/@aws-mdaa\(.*\)\"\(.*\)$CURRENT_VERSION\"/@aws-mdaa\1\"\2$NEW_VERSION\"/" {}

# Update the version field in every workspace package.json
find ./ -type f -name "package.json" | grep -v node_modules | xargs -n1 -I{} sed -i  "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" {}

# installer/ is a standalone package, not an npm workspace, so the root `npm install`
# below regenerates only the root lockfile and nothing else bumps the installer's.
#
# `npm version` sets package.json and both lockfile version fields absolutely. A
# `sed` here would instead match every "version" field in the lockfile, including
# third-party deps pinned at the same number, producing a version/resolved mismatch
# that breaks `npm ci`.
if [ -f "installer/package.json" ]; then
  echo "Setting installer version to $NEW_VERSION"
  ( cd installer && npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version )
fi

# The installer's jest snapshot pins the release/v<version> branch default that
# mdaa-installer-stack.ts derives from the ROOT version, so it has to move with the bump.
INSTALLER_SNAPSHOT="installer/test/__snapshots__/mdaa-installer.snapshot.test.ts.snap"
if [ -f "$INSTALLER_SNAPSHOT" ]; then
  echo "Restamping installer snapshot branch default to release/v$NEW_VERSION"
  sed -i "s|release/v${CURRENT_VERSION}|release/v${NEW_VERSION}|g" "$INSTALLER_SNAPSHOT"
  if grep -q "release/v${CURRENT_VERSION}" "$INSTALLER_SNAPSHOT"; then
    echo "ERROR: $INSTALLER_SNAPSHOT still references release/v${CURRENT_VERSION}." >&2
    exit 1
  fi
  # A snapshot already off CURRENT_VERSION makes the sed a no-op, which the residue check
  # above cannot see.
  if ! grep -q "release/v${NEW_VERSION}" "$INSTALLER_SNAPSHOT"; then
    echo "ERROR: $INSTALLER_SNAPSHOT does not pin release/v${NEW_VERSION}; regenerate it on main with" >&2
    echo "  ( cd installer && npm ci && npm run test:snapshot:update )" >&2
    exit 1
  fi
fi

# Update version in solution-manifest.yaml
if [ -f "solution-manifest.yaml" ]; then
  echo "Updating solution-manifest.yaml version from v$CURRENT_VERSION to v$NEW_VERSION"
  sed -i "s|^version: v${CURRENT_VERSION}$|version: v${NEW_VERSION}|" solution-manifest.yaml
  if ! grep -q "^version: v${NEW_VERSION}$" solution-manifest.yaml; then
    echo "ERROR: solution-manifest.yaml was not stamped to v${NEW_VERSION}; it reads '$(grep '^version:' solution-manifest.yaml || echo 'no version line')'." >&2
    exit 1
  fi
fi

# The version badge is optional, so warn rather than fail when it is absent.
if [ -f "README.md" ]; then
  if grep -q "version-${CURRENT_VERSION}-green" README.md; then
    echo "Updating README.md version badge from $CURRENT_VERSION to $NEW_VERSION"
    sed -i "s/version-${CURRENT_VERSION}-green/version-${NEW_VERSION}-green/" README.md
  else
    echo "WARNING: README.md has no version-${CURRENT_VERSION}-green badge; skipping." >&2
  fi
fi

# Substitute the CHANGELOG release placeholders with the new version and today's UTC date.
# The Unreleased section is authored with NEXT_RELEASE_VERSION / NEXT_RELEASE_DATE markers
# (see CHANGELOG.md heading) so the release pipeline can stamp the section without manual edits.
if [ -f "CHANGELOG.md" ]; then
  RELEASE_DATE=$(date -u +%Y-%m-%d)
  if grep -q "NEXT_RELEASE_VERSION" CHANGELOG.md; then
    echo "Stamping CHANGELOG.md release heading with version $NEW_VERSION and date $RELEASE_DATE"
    sed -i "s/^## \[NEXT_RELEASE_VERSION\] - NEXT_RELEASE_DATE$/## [${NEW_VERSION}] - ${RELEASE_DATE}/" CHANGELOG.md
    if grep -q "NEXT_RELEASE_VERSION\|NEXT_RELEASE_DATE" CHANGELOG.md; then
      echo "ERROR: CHANGELOG.md still contains release placeholders after substitution." >&2
      exit 1
    fi
  else
    echo "WARNING: CHANGELOG.md has no NEXT_RELEASE_VERSION placeholder; skipping release-heading substitution." >&2
  fi
fi

npm install

# Assert the propagation above reached every package. The `sed` cascade is keyed on
# CURRENT_VERSION and exits 0 whether or not it substituted, so a package that had
# already drifted is skipped silently and can never self-correct.
#
# Scoped to npm workspaces plus the standalone installer: sample_customizations/*,
# deployment/cdk-solution-helper, and the custom_aspect test fixture carry
# deliberately independent versions. Runs after `npm install` because the lockfile
# `npm query --package-lock-only` needs was removed at the top of this script.
# Materialized rather than expanded inline in the `for` list: a failing command substitution
# there does not trip `set -e`, and npm writes its JSON error object to stdout where jq renders
# it as "null" and exits 0. The floor catches an empty or truncated enumeration.
STALE_PACKAGES=""
WORKSPACE_DIRS=$(npm query .workspace --package-lock-only --expect-results | jq -r '.[].location')
WORKSPACE_COUNT=$(printf '%s\n' "$WORKSPACE_DIRS" | grep -c . || true)
if [ "$WORKSPACE_COUNT" -lt 100 ]; then
  echo "ERROR: npm query enumerated only $WORKSPACE_COUNT workspaces; expected the full set." >&2
  exit 1
fi
while IFS= read -r pkg_dir; do
  [ -f "$pkg_dir/package.json" ] || continue
  pkg_version=$(jq -r '.version // empty' "$pkg_dir/package.json")
  if [ "$pkg_version" != "$NEW_VERSION" ]; then
    STALE_PACKAGES="${STALE_PACKAGES} ${pkg_dir}(${pkg_version:-none})"
  fi
done < <(printf '%s\ninstaller\n' "$WORKSPACE_DIRS")
if [ -n "$STALE_PACKAGES" ]; then
  echo "ERROR: these packages were not bumped to ${NEW_VERSION}:${STALE_PACKAGES}" >&2
  echo "The version sed is keyed on the current version string, so a package that had" >&2
  echo "already drifted cannot self-correct and must be re-synced manually." >&2
  exit 1
fi
echo "Verified ${WORKSPACE_COUNT} workspace packages and the installer are at ${NEW_VERSION}."

