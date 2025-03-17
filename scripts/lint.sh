#!/bin/bash
set -e
echo "Running lintcheck"
npx lerna run lint --stream
