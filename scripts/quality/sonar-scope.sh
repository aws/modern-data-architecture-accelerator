#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
set -e
#
# Computes SonarQube source scoping arguments based on changed packages.
#
# Both the target baseline and MR scan jobs source this script to
# ensure they use the exact same file set. This is critical for correct
# new-code classification — if the target and real scan see different
# files, SonarQube misclassifies unchanged code as new.
#
# Uses changed-only.py (direct file changes only, no transitive
# dependents) and affected-paths.py to keep the scope minimal and
# deterministic. Requires node_modules to be installed (for npx nx).
#
# After sourcing, SONAR_SCOPE_ARGS is set to the sonar-scanner
# arguments that scope the scan, or empty if no packages changed
# (in which case SONAR_SCOPE_SKIP=true).
#
# Usage:
#   source ./scripts/quality/sonar-scope.sh
#   if [ "${SONAR_SCOPE_SKIP}" = "true" ]; then
#     echo "No packages to scan"
#     exit 0
#   fi
#   sonar-scanner ${SONAR_SCOPE_ARGS} ...

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Compute the merge base between the target branch and the MR HEAD.
# Both the target baseline (checked out on main) and the real scan
# (on MR branch) use the same two refs so the diff is identical.
if [ -n "${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-}" ]; then
  NX_TARGET="origin/${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}"
else
  NX_TARGET="origin/main"
fi

# Use the MR source branch HEAD as the comparison point.
# In the target baseline job, we're checked out on main but the MR
# branch ref is still available via origin/<branch>.
if [ -n "${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME:-}" ]; then
  MR_HEAD=$(git rev-parse "origin/${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}" 2>/dev/null || git rev-parse HEAD)
else
  MR_HEAD="HEAD"
fi

MAIN_HEAD=$(git rev-parse "${NX_TARGET}")
NX_BASE=$(git merge-base "${NX_TARGET}" "${MR_HEAD}")

echo "--- Sonar scope debug ---"
echo "NX_TARGET: ${NX_TARGET} (${MAIN_HEAD})"
echo "MR_HEAD: ${MR_HEAD}"
echo "NX_BASE (merge-base): ${NX_BASE}"
echo ""

# Compute directly changed packages between merge-base and MR HEAD.
# Only consider TypeScript and Python source files — changes to
# non-code files (markdown, JSON, config) don't affect SonarQube
# analysis and shouldn't trigger a scan for the package.
echo "Computing changed packages (code files only)..."
CHANGED_PROJECTS=$(python3 "$SCRIPT_DIR/../nx/changed-only.py" "$NX_BASE" "$MR_HEAD" --extensions .ts .py)
AFFECTED_PATHS=$(echo "$CHANGED_PROJECTS" | python3 "$SCRIPT_DIR/../nx/affected-paths.py")

echo "Changed projects: ${CHANGED_PROJECTS}"
echo "Affected paths: ${AFFECTED_PATHS}"
echo "--- End sonar scope debug ---"

SONAR_SCOPE_SKIP=false
SONAR_SCOPE_ARGS=""

if [ -z "$AFFECTED_PATHS" ]; then
  echo "No affected packages found."
  SONAR_SCOPE_SKIP=true
else
  echo "Scoping scanner to: ${AFFECTED_PATHS}"
  SONAR_SCOPE_ARGS="-Dsonar.sources=${AFFECTED_PATHS}"
  # Restrict inclusions to lib/**/*.ts within affected packages only
  INCLUSIONS=$(echo "$AFFECTED_PATHS" | tr ',' '\n' | sed 's|$|/lib/**/*.ts|' | paste -sd ',' -)
  SONAR_SCOPE_ARGS="${SONAR_SCOPE_ARGS} -Dsonar.inclusions=${INCLUSIONS}"
  # Restrict TypeScript program creation to only the affected packages.
  # Without this, the plugin auto-discovers every tsconfig.json under the
  # project root and creates a program for each (~130), which dominates
  # scan time. Requires .d.ts files to exist in dependency packages so
  # the TS compiler can resolve types without chasing project references.
  TSCONFIGS=$(echo "$AFFECTED_PATHS" | tr ',' '\n' | sed 's|$|/tsconfig.json|' | paste -sd ',' -)
  SONAR_SCOPE_ARGS="${SONAR_SCOPE_ARGS} -Dsonar.typescript.tsconfigPaths=${TSCONFIGS}"
fi
