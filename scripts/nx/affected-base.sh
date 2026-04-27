#!/bin/bash
# Computes the Nx affected base commit and exports NX_BASE.
# Source this script from other scripts:
#   source "$(dirname "$0")/nx/affected-base.sh"
#
# After sourcing, NX_BASE and NX_HEAD are set and can be used as:
#   npx nx affected -t <target> --base="$NX_BASE" --head="$NX_HEAD"
#
# When MERGE_PIPELINE_RUN_ALL=true, NX_RUN_ALL is exported so callers can switch to
# `npx nx run-many -t <target> --all` instead of `nx affected`.

if [ "${MERGE_PIPELINE_RUN_ALL:-false}" = "true" ]; then
  export NX_RUN_ALL=true
  echo "MERGE_PIPELINE_RUN_ALL=true — all projects will be included"
fi

if [ -n "${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-}" ]; then
  NX_TARGET="origin/${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}"
else
  NX_TARGET="origin/main"
fi

# Use the merge-base (fork point) so we only see what this branch changed,
# not what's new on the target branch since the branch was created.
NX_BASE=$(git merge-base "$NX_TARGET" HEAD)

# In CI, compare commits only. Locally, include uncommitted changes.
if [ "${CI:-}" = "true" ]; then
  NX_HEAD="HEAD"
else
  NX_HEAD=""
fi

echo "--- Nx affected debug ---"
echo "MERGE_PIPELINE_RUN_ALL: ${MERGE_PIPELINE_RUN_ALL:-false}"
echo "NX_TARGET: $NX_TARGET ($(git rev-parse "$NX_TARGET" 2>/dev/null || echo 'NOT FOUND'))"
echo "NX_BASE (merge-base): $NX_BASE"
echo "NX_HEAD: ${NX_HEAD:-<working tree>}"
echo "HEAD: $(git rev-parse HEAD)"
echo ""
echo "git status (short):"
git --no-pager status --short | head -20
echo ""
echo "Changed files (base..HEAD + uncommitted):"
git --no-pager diff --name-only "$NX_BASE"
echo "(total: $(git --no-pager diff --name-only "$NX_BASE" | wc -l))"
echo ""
python3 "$(dirname "${BASH_SOURCE[0]}")/affected-tree.py" "$NX_BASE" "$NX_HEAD" 2>/dev/null || true
echo "--- End Nx affected debug ---"
