# Bedrock Knowledge Base Create Index Lambda Tests

This directory contains unit tests for the Bedrock Knowledge Base Create Index Lambda function.

## Test Structure

- `test_create_index_aoss.py` - Main tests for the Lambda handler and OpenSearch index operations
- `test_cfnresponse.py` - Tests for CloudFormation custom resource response functionality
- `conftest.py` - Shared pytest fixtures and test configuration
- `pyproject.toml` - Python project configuration and dependencies
- `pytest.ini` - Pytest configuration

## Running Tests

### Prerequisites

Ensure you have `uv` installed for Python dependency management.

### Run All Tests

```bash
# From this directory
uv run pytest

# With coverage
uv run pytest --cov=src/python/create-index-aoss --cov-report=html
```

### Run Specific Test Files

```bash
# Test only the main Lambda function
uv run pytest test_create_index_aoss.py

# Test only CFN response functionality
uv run pytest test_cfnresponse.py
```

### Run from Project Root

```bash
# From the CAEF project root
./scripts/test.sh
```

## Test Coverage

The tests cover:

- **Lambda Handler**: CloudFormation Create/Delete/Update events
- **OpenSearch Integration**: Index creation, deletion, and configuration
- **Error Handling**: Exception handling and retry logic
- **AWS Integration**: STS authentication and credential handling
- **CFN Response**: CloudFormation custom resource response handling

## Mocking Strategy

- **AWS Services**: Uses `moto` for STS mocking and `unittest.mock` for other AWS services
- **OpenSearch**: Mocked using `unittest.mock.MagicMock`
- **HTTP Requests**: CFN response HTTP calls are mocked
- **Environment Variables**: Test fixtures provide isolated environment setup