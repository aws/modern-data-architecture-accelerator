#!/bin/bash
# Update diff test baselines.
#   Default: affected packages only
#   NX_RUN_ALL=true: all packages
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source "$SCRIPT_DIR/../nx/affected-base.sh"

export UPDATE_BASELINES=true

if [ "${NX_RUN_ALL:-false}" = "true" ]; then
  echo "Updating baselines (all packages)"
  npx nx run-many -t test:update-baselines --all "$@"
else
  echo "Updating baselines (affected packages)"
  npx nx affected -t test:update-baselines --base="$NX_BASE" --head="$NX_HEAD" "$@"
fi
