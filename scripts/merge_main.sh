#!/bin/bash
set -e

if [ "$RUN_FEATURE_PIPELINE" = "true" ]; then
  echo "ERROR: RUN_FEATURE_PIPELINE is set to 'true'."
  echo "Set it back to 'false' before merging to main."
  exit 1
fi

git checkout "$CI_COMMIT_REF_NAME"

git fetch origin

echo "Attempting merge from main"
git merge origin/main

