#!/bin/bash
# Setup script for Health Data Accelerator Python testing environment

set -e

echo "Setting up Python testing environment for Health Data Accelerator..."

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing Python test dependencies..."
pip install -r requirements.txt

echo "Setup complete! To run tests:"
echo "  cd sample_configs/health_data_accelerator/dataops"
echo "  npm run test:python"
echo ""
echo "Available test commands:"
echo "  npm run test:python          # Run all tests"
echo "  npm run test:python:unit     # Run unit tests only"
echo "  npm run test:python:lambda   # Run Lambda tests only"
echo "  npm run test:python:glue     # Run Glue tests only"
echo "  npm run test:python:coverage # Run with coverage report"