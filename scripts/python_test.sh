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

# Check if uv is available
if ! command -v uv >/dev/null 2>&1; then
    echo "❌ uv is required for Python testing but not found."
    echo "Please install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo "Or use your package manager: brew install uv"
    exit 1
fi

for package in $PYTHON_TEST_PACKAGES; do
    TOTAL_PACKAGES=$((TOTAL_PACKAGES + 1))
    echo ""
    echo "========================================="
    echo "Running Python tests for: $package"
    echo "========================================="
    
    cd "$PROJECT_ROOT/$package/python-tests"
    
    # Check if this is the gaia-l3-construct package and skip coverage
    if [[ "$package" == *"gaia-l3-construct"* ]]; then
        echo "Running tests without coverage for gaia-l3-construct..."
        if uv run pytest --ignore=test_file_import_main.py -v; then
            echo "✅ Python tests passed for $package"
        else
            echo "❌ Python tests failed for $package"
            FAILED_PACKAGES+=("$package")
        fi
    else
        # Run tests with coverage using uv for other packages
        if uv run pytest --cov --cov-report=xml --cov-report=html --cov-report=term; then
            echo "✅ Python tests passed for $package"
        else
            echo "❌ Python tests failed for $package"
            FAILED_PACKAGES+=("$package")
        fi
    fi
    
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