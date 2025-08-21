#!/bin/bash
set -e
echo "Running test script."

# Run TypeScript tests
echo "Running TypeScript tests..."
npx lerna run test --stream

# Run Python tests
echo "Running Python tests..."
npm run test:python:all






