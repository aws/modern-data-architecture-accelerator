# Python Testing Guide

This guide explains how to run Python unit tests for Lambda functions and Glue jobs in this monorepo.

## Overview

Python tests are co-located within each package that contains Python code, following the same pattern as TypeScript tests. Each package with Python code has its own `python-tests/` directory with isolated virtual environments and dependencies.

## Current Test Coverage

### Packages with Python Tests:
- **RDS Constructs** (`packages/constructs/L2/rds-constructs/`)
  - Tests for RDS Data Lambda function
- **Health Data Accelerator** (`sample_configs/health_data_accelerator/dataops/`)
  - Tests for ODPF File Manager Lambda functions
  - Tests for Glue file processor jobs

## Quick Start

### 1. Install Dependencies (First Time Only)

For all packages:
```bash
npm run test:python:install
```

For individual packages:
```bash
# RDS Constructs
cd packages/constructs/L2/rds-constructs
npm run test:python:install

# Health Data Accelerator
cd sample_configs/health_data_accelerator/dataops
npm run test:python:install
```

### 2. Run Tests

#### Run All Python Tests (Recommended)
```bash
# Using comprehensive script (runs ALL python-tests directories)
npm run test:python:all

# Using lerna (only runs workspace packages with test:python script)
npm run test:python
```

**Note:** `npm run test:python` only runs tests for packages in the npm workspace (under `packages/`). Sample configs are not in the workspace to avoid CI/CD issues, so use `npm run test:python:all` to test everything including sample configs.

#### Run Tests for Individual Packages
```bash
# RDS Constructs
cd packages/constructs/L2/rds-constructs
npm run test:python

# Health Data Accelerator
cd sample_configs/health_data_accelerator/dataops
npm run test:python
```

## Detailed Instructions

### RDS Constructs Testing

**Location:** `packages/constructs/L2/rds-constructs/python-tests/`

**What it tests:**
- RDS Data Lambda function (`lib/functions/rds-data/index.py`)
- Basic functionality and error handling

**Commands:**
```bash
cd packages/constructs/L2/rds-constructs

# First time setup
npm run test:python:install

# Run tests
npm run test:python

# Run with coverage
npm run test:python:coverage

# Run both TypeScript and Python tests
npm run test:all
```

### Health Data Accelerator Testing

**Location:** `sample_configs/health_data_accelerator/dataops/python-tests/`

**What it tests:**
- ODPF File Manager Lambda (`src/lambda/file_manager/odpf_file_manager.py`)
- File processor Lambda functions
- Glue job file processors
- Setup and import validation

**Commands:**
```bash
cd sample_configs/health_data_accelerator/dataops

# First time setup
npm run test:python:install

# Run all tests
npm run test:python

# Run specific test categories
npm run test:python:unit      # Unit tests only
npm run test:python:lambda    # Lambda tests only
npm run test:python:glue      # Glue tests only

# Run with coverage report
npm run test:python:coverage
```

## Test Structure

Each package with Python tests follows this structure:
```
package-name/
├── python-tests/              # Python testing directory
│   ├── requirements.txt       # Python test dependencies
│   ├── pytest.ini            # pytest configuration
│   ├── conftest.py           # Shared test fixtures
│   ├── setup.sh              # Setup script
│   ├── .venv/               # Virtual environment (created automatically)
│   └── test_*.py             # Test files
├── src/ or lib/              # Python source code being tested
└── package.json              # npm scripts for testing
```

## Available npm Scripts

### Root Level Scripts
- `npm run test:python:all` - Run comprehensive Python test script (ALL packages including sample configs)
- `npm run test:python` - Run Python tests using lerna (workspace packages only)
- `npm run test:python:install` - Install Python dependencies for workspace packages only

### Package Level Scripts
- `npm run test:python` - Run Python tests for this package
- `npm run test:python:install` - Install Python dependencies
- `npm run test:python:coverage` - Run tests with coverage report
- `npm run test:python:unit` - Run unit tests only (where available)
- `npm run test:python:lambda` - Run Lambda tests only (where available)
- `npm run test:python:glue` - Run Glue tests only (where available)

## Troubleshooting

### Virtual Environment Issues
If you encounter Python import errors:
```bash
# Recreate virtual environment
cd path/to/package/python-tests
rm -rf .venv
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

### Missing Dependencies
If tests fail due to missing dependencies:
```bash
# Reinstall dependencies
npm run test:python:install
```

### Import Errors
If Python modules can't be imported:
1. Check that the source code exists in the expected location
2. Verify the Python path setup in `conftest.py`
3. Run the setup verification tests: `pytest test_setup.py -v`

### Permission Issues
If you get permission errors on setup scripts:
```bash
chmod +x python-tests/setup.sh
```

## Adding Tests to New Packages

### Auto-Discovery Feature

**No registration required!** The Python testing system automatically discovers any `python-tests/` directory under `packages/` or `sample_configs/`. Simply create the directory structure and run `npm run test:python:all` - your new tests will be found and executed automatically.

The discovery works by searching for directories named `python-tests`:
```bash
find packages sample_configs -name "python-tests" -type d
```

### Steps to Add Python Testing

To add Python testing to a new package:

1. **Copy the structure** from an existing package:
   ```bash
   cp -r packages/constructs/L2/rds-constructs/python-tests your-package/
   ```

2. **Update `requirements.txt`** with package-specific dependencies

3. **Update `conftest.py`** to point to your Python source code

4. **Add npm scripts** to your `package.json`:
   ```json
   {
     "scripts": {
       "test:python": "cd python-tests && ./.venv/bin/python -m pytest",
       "test:python:install": "cd python-tests && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt",
       "test:python:coverage": "cd python-tests && ./.venv/bin/python -m pytest --cov-report=xml --cov-report=html"
     }
   }
   ```

5. **Create your test files** following the `test_*.py` naming convention

6. **Run tests** - Your new tests will be automatically discovered by `npm run test:python:all`

## CI/CD Integration

To integrate Python tests into your CI/CD pipeline, add this to `scripts/build_test.sh`:

```bash
echo "Running Python tests..."
npm run test:python:all
```

**Important:** Use `npm run test:python:all` (not `npm run test:python`) in CI/CD to ensure all Python tests are run, including those in sample configs which are not part of the npm workspace.

This will run all Python tests across all packages and fail the build if any tests fail.

## Dependencies

### Core Testing Dependencies
- `pytest` - Testing framework
- `pytest-cov` - Coverage reporting
- `pytest-mock` - Mocking utilities
- `coverage` - Coverage measurement

### AWS Testing Dependencies
- `boto3` - AWS SDK
- `moto` - AWS service mocking
- `responses` - HTTP request mocking

### Glue Testing Dependencies
- `pyspark` - For testing Glue jobs (large dependency)

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
Total packages tested: 2
Passed: 2
Failed: 0
All Python tests passed! 🎉
```