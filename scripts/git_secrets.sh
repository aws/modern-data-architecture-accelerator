#!/bin/bash
set -e

echo "Running git-secrets scan"
git secrets --register-aws
git secrets --add --allowed 'packages/constructs/L3/ai/gaia-l3-construct/lib/sagemaker-model/image-repository-mapping.ts:.*'
git secrets --scan --no-index