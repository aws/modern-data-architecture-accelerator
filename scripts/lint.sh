#!/bin/bash
set -e

echo "Running lintcheck"

# Check @aws-mdaa package versions for caret prefixes
./scripts/check-aws-mdaa-versions.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run linting on affected packages only
source "$SCRIPT_DIR/nx/affected-base.sh"

echo "Linting affected packages (base: $NX_BASE)"
npx nx affected -t lint --base="$NX_BASE" --head="$NX_HEAD" --parallel=10
