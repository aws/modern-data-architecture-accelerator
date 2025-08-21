# Python Testing Guide

This guide explains how to run Python unit tests for Lambda functions and Glue jobs in this monorepo.

## Overview

Python tests are co-located within each package that contains Python code, following the same pattern as TypeScript tests. Each package with Python code has its own `python-tests/` directory with modern `uv`-based dependency management for fast, reliable testing.

## Discovering Python Tests

To see all packages with Python tests in this repository:

```bash
# Find all python-tests directories
find packages sample_configs -name "python-tests" -type d

# Count total test packages
find packages sample_configs -name "python-tests" -type d | wc -l
```

This will show you all available Python test suites that can be run.

## Quick Start

### 🚀 Single Command Testing (Recommended)

**No setup required!** Just run tests directly:

```bash
# Navigate to any python-tests directory
cd path/to/package/python-tests

# Run tests (uv handles everything automatically)
uv run pytest

# Run with coverage
uv run pytest --cov --cov-report=term-missing

# Run specific test file
uv run pytest test_specific_module.py

# Run with verbose output
uv run pytest -v
```

### 📦 Using npm Scripts

Many packages also provide npm scripts for convenience:

```bash
# Navigate to package root (not python-tests subdirectory)
cd path/to/package

# Run tests
npm run test:python

# Run with coverage (if available)
npm run test:python:coverage
```

## Universal Commands

These commands work for any Python test suite in the repository:

### Run All Python Tests
```bash
# Using comprehensive script (runs ALL python-tests directories)
npm run test:python:all

# Using lerna (only runs workspace packages with test:python script)
npm run test:python
```

**Note:** `npm run test:python` only runs tests for packages in the npm workspace (under `packages/`). Sample configs are not in the workspace to avoid CI/CD issues, so use `npm run test:python:all` to test everything including sample configs.

### Run Individual Package Tests
```bash
# Method 1: Direct uv command (fastest)
cd path/to/package/python-tests
uv run pytest

# Method 2: Using npm scripts (if available)
cd path/to/package
npm run test:python
```

## Test Structure

Each package with Python tests follows this modern structure:
```
package-name/
├── python-tests/              # Python testing directory
│   ├── pyproject.toml        # Modern Python project config (replaces requirements.txt)
│   ├── pytest.ini           # pytest configuration
│   ├── conftest.py          # Shared test fixtures
│   ├── .venv/              # Virtual environment (auto-managed by uv)
│   ├── uv.lock             # Dependency lock file (auto-generated)
│   └── test_*.py           # Test files
├── src/ or lib/             # Python source code being tested
└── package.json             # npm scripts for testing (optional)
```

### Key Files:
- **`pyproject.toml`** - Modern Python project configuration with dependencies and test settings
- **`conftest.py`** - Shared pytest fixtures and test setup
- **`pytest.ini`** - pytest configuration (can be replaced by pyproject.toml)
- **`uv.lock`** - Automatically generated dependency lock file for reproducible builds

## Available Commands

### 🚀 Direct uv Commands (Recommended)
```bash
cd path/to/package/python-tests
uv run pytest                    # Run all tests (auto-installs dependencies)
uv run pytest --cov            # Run with coverage
uv run pytest -v               # Verbose output
uv run pytest test_specific.py # Run specific test file
uv run pytest -m unit          # Run tests with specific markers
uv run pytest -k "test_name"   # Run tests matching pattern
```

### 📦 npm Scripts (Package-Specific)

#### Root Level Scripts
- `npm run test:python:all` - Run comprehensive Python test script (ALL packages including sample configs)
- `npm run test:python` - Run Python tests using lerna (workspace packages only)

#### Common Package Level Scripts
- `npm run test:python` - Run Python tests for this package
- `npm run test:python:coverage` - Run tests with coverage report
- `npm run test:python:unit` - Run unit tests only (if markers are used)
- `npm run test:python:lambda` - Run Lambda tests only (if markers are used)
- `npm run test:python:glue` - Run Glue tests only (if markers are used)

*Note: Available npm scripts vary by package. Check each package's `package.json` for specific scripts.*

## Example Workflow

Here's a typical workflow for working with Python tests:

```bash
# 1. Discover all Python test packages
find packages sample_configs -name "python-tests" -type d

# 2. Navigate to a specific package
cd sample_configs/your-package/python-tests

# 3. Run tests (uv handles setup automatically)
uv run pytest

# 4. Run with coverage to see test coverage
uv run pytest --cov

# 5. Run specific tests during development
uv run pytest test_specific_module.py -v
```

## Troubleshooting

### Virtual Environment Issues
With `uv`, virtual environments are managed automatically. If you encounter issues:
```bash
# Clean and recreate (uv handles this automatically)
cd path/to/package/python-tests
rm -rf .venv uv.lock
uv run pytest  # Will recreate everything
```

### Missing Dependencies
If tests fail due to missing dependencies:
```bash
# uv automatically installs dependencies, but you can force refresh:
cd path/to/package/python-tests
rm -rf .venv
uv run pytest
```

### uv Not Found Error
If you see "uv is required but not found":
```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
# Restart your shell or run:
source ~/.bashrc  # or ~/.zshrc
```

### Import Errors
If Python modules can't be imported:
1. Check that the source code exists in the expected location
2. Verify the Python path setup in `conftest.py`
3. Run the setup verification tests: `uv run pytest test_setup.py -v` (if available)

### uv Installation (Required)
`uv` is required for Python testing. If not installed:
```bash
# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
# or
pip install uv
# or
brew install uv
```

The CI/CD pipeline will automatically install `uv` if not present.

## Adding Tests to New Packages

### Auto-Discovery Feature

**No registration required!** The Python testing system automatically discovers any `python-tests/` directory under `packages/` or `sample_configs/`. Simply create the directory structure and run `npm run test:python:all` - your new tests will be found and executed automatically.

The discovery works by searching for directories named `python-tests`:
```bash
find packages sample_configs -name "python-tests" -type d
```

### Steps to Add Python Testing (Modern uv Approach)

To add Python testing to a new package:

1. **Copy the structure** from an existing package:
   ```bash
   # Find an existing python-tests directory to copy from
   find packages sample_configs -name "python-tests" -type d | head -1
   
   # Copy the structure
   cp -r path/to/existing/python-tests your-package/
   ```

2. **Update `pyproject.toml`** with package-specific dependencies:
   ```toml
   [project]
   name = "your-package-tests"
   version = "0.1.0"
   description = "Your Package Python Tests"
   requires-python = ">=3.9"
   dependencies = [
       "pytest>=7.4.0",
       "pytest-cov>=4.1.0",
       "pytest-mock>=3.11.1",
       "boto3>=1.28.0",
       # Add your specific dependencies here
   ]
   ```

3. **Update `conftest.py`** to point to your Python source code:
   ```python
   # Add the source directory to Python path
   src_path = os.path.join(os.path.dirname(__file__), '../src')
   sys.path.insert(0, src_path)
   ```

4. **Create your test files** following the `test_*.py` naming convention

5. **Run tests** - Just use `uv run pytest` in the python-tests directory!

6. **Optional: Add npm scripts** to your `package.json`:
   ```json
   {
     "scripts": {
       "test:python": "cd python-tests && uv run pytest",
       "test:python:coverage": "cd python-tests && uv run pytest --cov --cov-report=xml --cov-report=html"
     }
   }
   ```

## CI/CD Integration

To integrate Python tests into your CI/CD pipeline, add this to `scripts/build_test.sh`:

```bash
echo "Running Python tests..."
npm run test:python:all
```

**Important:** Use `npm run test:python:all` (not `npm run test:python`) in CI/CD to ensure all Python tests are run, including those in sample configs which are not part of the npm workspace.

This will run all Python tests across all packages and fail the build if any tests fail.

## Dependencies

Dependencies are now managed through `pyproject.toml` files and automatically installed by `uv`.

### Core Testing Dependencies
- `pytest>=7.4.0` - Testing framework
- `pytest-cov>=4.1.0` - Coverage reporting
- `pytest-mock>=3.11.1` - Mocking utilities

### AWS Testing Dependencies
- `boto3>=1.28.0` - AWS SDK
- `botocore>=1.31.0` - AWS SDK core
- `moto[s3,dynamodb,glue]>=4.2.0` - AWS service mocking
- `responses>=0.23.0` - HTTP request mocking

### Glue Testing Dependencies
- `pyspark>=3.4.0` - For testing Glue jobs (large dependency)

### Modern Tooling
- `uv` - Fast Python package manager and project manager
- `pyproject.toml` - Modern Python project configuration

## Expected Test Results

When running tests successfully, you should see output like:
```
==================== test session starts ====================
platform darwin -- Python 3.13.2, pytest-8.4.1, pluggy-1.6.0
collected X items

test_file.py ....                                     [100%]

=============== X passed in 0.0Xs ================
```

For the comprehensive script:
```
=========================================
Python Test Summary
=========================================
Total packages tested: N
Passed: N
Failed: 0
All Python tests passed! 🎉
```