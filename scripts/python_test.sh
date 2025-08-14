#!/bin/bash
# Script to run Python tests across all packages

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

echo "Running Python tests across all packages..."

# Find all packages with python-tests directories
PYTHON_TEST_PACKAGES=$(find packages sample_configs -name "python-tests" -type d | sed 's|/python-tests||')

if [ -z "$PYTHON_TEST_PACKAGES" ]; then
    echo "No Python test packages found."
    exit 0
fi

FAILED_PACKAGES=()
TOTAL_PACKAGES=0

for package in $PYTHON_TEST_PACKAGES; do
    TOTAL_PACKAGES=$((TOTAL_PACKAGES + 1))
    echo ""
    echo "========================================="
    echo "Running Python tests for: $package"
    echo "========================================="
    
    cd "$PROJECT_ROOT/$package/python-tests"
    
    # Check if virtual environment exists, create if not
    if [ ! -d ".venv" ]; then
        echo "Creating virtual environment for $package..."
        python3 -m venv .venv
    fi
    
    # Activate virtual environment and run tests
    source .venv/bin/activate
    
    # Install dependencies if requirements.txt exists
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt > /dev/null 2>&1
    fi
    
    # Run tests
    if python3 -m pytest; then
        echo "✅ Python tests passed for $package"
    else
        echo "❌ Python tests failed for $package"
        FAILED_PACKAGES+=("$package")
    fi
    
    deactivate
    cd "$PROJECT_ROOT"
done

echo ""
echo "========================================="
echo "Python Test Summary"
echo "========================================="
echo "Total packages tested: $TOTAL_PACKAGES"
echo "Passed: $((TOTAL_PACKAGES - ${#FAILED_PACKAGES[@]}))"
echo "Failed: ${#FAILED_PACKAGES[@]}"

if [ ${#FAILED_PACKAGES[@]} -gt 0 ]; then
    echo ""
    echo "Failed packages:"
    for package in "${FAILED_PACKAGES[@]}"; do
        echo "  - $package"
    done
    exit 1
else
    echo "All Python tests passed! 🎉"
    exit 0
fi