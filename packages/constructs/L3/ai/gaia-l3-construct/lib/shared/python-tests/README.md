# GAIA L3 Construct Python Tests

This directory contains Python unit tests for the GAIA L3 Construct shared Python modules.

## Tested Modules

The test suite covers the following Python modules in the `shared/` directory:

### genai_core Package
- **Location**: `layers/python-sdk/python/genai_core/`
- **Modules**: auth, clients, workspaces, documents, embeddings, models, sessions, chunks, types, etc.
- **Subdirectories**: aurora, bedrock_kb, kendra, langchain, opensearch, registry, utils, websites

### File Import Batch Job
- **Location**: `file-import-batch-job/main.py`
- **Purpose**: Batch processing of file imports

### Secrets Rotation Function
- **Location**: `secrets-rotation-function/index.py`
- **Purpose**: AWS Secrets Manager rotation functionality

## Running Tests

### Quick Start (Recommended)
```bash
# Navigate to python-tests directory
cd packages/constructs/L3/ai/gaia-l3-construct/lib/shared/python-tests

# Run all tests (uv handles setup automatically)
uv run pytest

# Run with coverage
uv run pytest --cov --cov-report=term-missing
```

### Using npm Scripts
```bash
# Navigate to package root
cd packages/constructs/L3/ai/gaia-l3-construct

# Run all Python tests
npm run test:python

# Run with coverage
npm run test:python:coverage

# Run only unit tests
npm run test:python:unit
```

### Test Categories

Tests are organized with markers for easy filtering:

```bash
# Run only genai_core module tests
uv run pytest -m genai_core

# Run only file import tests
uv run pytest -m file_import

# Run only secrets rotation tests
uv run pytest -m secrets

# Run only unit tests
uv run pytest -m unit
```

## Test Structure

- `test_setup.py` - Verifies Python path setup and module imports
- `test_genai_core_*.py` - Tests for genai_core modules
- `test_file_import_main.py` - Tests for file import batch job
- `test_secrets_rotation.py` - Tests for secrets rotation function

## Configuration

- `pyproject.toml` - Modern Python project configuration with dependencies
- `conftest.py` - Shared pytest fixtures and test setup

## Dependencies

The test suite includes dependencies for:
- AWS SDK testing (boto3, moto)
- GenAI libraries (langchain, opensearch-py)
- Database testing (psycopg2-binary)
- Web scraping (beautifulsoup4, lxml)
- HTTP mocking (responses)

## Adding New Tests

1. Create test files following the `test_*.py` naming convention
2. Use appropriate markers (`@pytest.mark.genai_core`, etc.)
3. Import modules using the paths set up in `conftest.py`
4. Use the provided fixtures for AWS mocking and test data

## Troubleshooting

If you encounter import errors:
1. Verify the Python paths in `conftest.py` are correct
2. Run `test_setup.py` to verify module imports
3. Check that all required dependencies are in `pyproject.toml`

For uv installation issues:
```bash
# Install uv if not present
curl -LsSf https://astral.sh/uv/install.sh | sh
# or
pip install uv
```