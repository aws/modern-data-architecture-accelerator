#!/bin/bash
set -e

echo "Running lintcheck"

# Check @aws-mdaa package versions for caret prefixes
./scripts/check-aws-mdaa-versions.sh

# Run standard linting
npx lerna run lint --stream
