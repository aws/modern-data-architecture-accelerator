#!/bin/bash
set -e
echo "Running npm install script."
echo "Node version: $(node --version)"
echo "NPM version (before): $(npm --version)"

# Suppress WASI experimental warnings
export NODE_NO_WARNINGS=1

#Bootstrap and build packages
npm ci