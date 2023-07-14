#!/bin/bash
set -e

echo "Running git-secrets scan"
git secrets --register-aws
git secrets --scan --no-index