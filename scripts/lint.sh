#!/bin/bash
set -e

# TEMPORARY FIX: Enable eslintrc compatibility mode for ESLint v9.x
# This environment variable enables the v8.x Linter functionality that accepts
# eslintrc format configurations. This is a temporary workaround to restore
# CI/CD functionality while planning a full migration to flat config format.
# TODO: Remove this once all packages are migrated to use flat config (eslint.config.js)
# See: https://eslint.org/docs/latest/use/configure/migration-guide
export ESLINT_USE_FLAT_CONFIG=false
# Temp flag to remove noice produced by ESLINT_USE_FLAT_CONFIG
export NODE_OPTIONS="--no-warnings"

echo "Running lintcheck"

# Check @aws-mdaa package versions for caret prefixes
./scripts/check-aws-mdaa-versions.sh

# Run standard linting
npx lerna run lint --stream
