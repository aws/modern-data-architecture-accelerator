#!/bin/bash
set -e
git checkout "$CI_COMMIT_REF_NAME"

git fetch origin

echo "Attempting merge from main"
git merge origin/main

