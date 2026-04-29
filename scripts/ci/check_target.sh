#!/bin/bash
set -e

if [ "$RUN_FEATURE_PIPELINE" = "true" ]; then
  echo "ERROR: RUN_FEATURE_PIPELINE is set to 'true'."
  echo "Set it back to 'false' before merging to main."
  exit 1
fi

TARGET_BRANCH="origin/${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-main}"

git fetch origin

# Fail if the feature branch is not up to date with the target branch.
# "is-ancestor" returns 0 when the target is reachable from HEAD,
# meaning the branch already contains all of the target's commits.
if ! git merge-base --is-ancestor "$TARGET_BRANCH" HEAD; then
  BEHIND_COUNT=$(git rev-list --count "HEAD..$TARGET_BRANCH")
  echo "============================================================"
  echo "ERROR: Branch is ${BEHIND_COUNT} commit(s) behind ${TARGET_BRANCH}."
  echo ""
  echo "Merge the latest ${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-main} into your branch and push again:"
  echo "  git fetch origin"
  echo "  git merge ${TARGET_BRANCH}"
  echo "  git push"
  echo ""
  echo "Or rebase:"
  echo "  git fetch origin"
  echo "  git rebase ${TARGET_BRANCH}"
  echo "  git push --force-with-lease"
  echo "============================================================"
  exit 1
fi

echo "Branch is up to date with ${TARGET_BRANCH}."
