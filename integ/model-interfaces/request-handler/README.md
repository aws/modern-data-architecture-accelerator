# Model Interface Request Handler Integration Tests

This directory contains integration tests for the Model Interface Request Handler container-based Lambda function.

## Overview

These tests verify that the containerized Lambda function works correctly with:
- Real AWS services (DynamoDB, SNS, Secrets Manager, etc.)
- Actual langchain functionality with upgraded versions
- End-to-end message processing workflows

## Prerequisites

### Dependencies
```bash
# Install test dependencies with uv
uv sync
```

### Container Runtime
- **Finch** (recommended for macOS) or **Docker**
- Used for building and testing the Lambda container

### AWS Credentials (for integration tests only)
- Valid AWS credentials with permissions for Lambda, DynamoDB, SNS, Secrets Manager
- Set via AWS CLI, environment variables, or IAM roles

## Quick Start

```bash
# Install dependencies
uv pip install -r requirements.txt

# Run container tests (no AWS credentials needed)
uv run pytest -m "container"

# Run integration tests (requires AWS credentials)
uv run pytest -m "integration"

# Run all tests
uv run pytest
```

## Test Structure

- `test_container_functionality.py` - Container build and import tests
- `test_lambda_handler.py` - Lambda handler integration tests  
- `test_langchain_integration.py` - LangChain functionality tests
- `conftest.py` - Pytest configuration and fixtures

## Running Tests

### Container Tests (No AWS Required)
```bash
# Test container builds and imports
uv run pytest -m "container"

# Test specific functionality
uv run pytest test_container_functionality.py
uv run pytest test_langchain_integration.py::TestLangChainVersions
```

### Integration Tests (AWS Required)
```bash
# Test with real AWS services
uv run pytest -m "integration"

# Test specific integration scenarios
uv run pytest test_lambda_handler.py::TestLambdaHandlerIntegration
```

### All Tests
```bash
# Run everything
uv run pytest

# Verbose output
uv run pytest -v

# Include slow tests
uv run pytest -m "not slow" # exclude slow tests
uv run pytest              # include slow tests
```

### Useful Options
```bash
# Stop on first failure
uv run pytest -x

# Run tests matching pattern
uv run pytest -k "langchain"

# Show local variables on failure
uv run pytest -l

# Capture output
uv run pytest -s
```

## Test Categories

### 1. Container Tests (`@pytest.mark.container`)
- Container builds successfully
- All dependencies are available
- LangChain versions are correct
- Handler can be imported

### 2. Integration Tests (`@pytest.mark.integration`)
- Lambda function integration with AWS services
- Real AWS credential usage
- End-to-end workflows

### 3. Slow Tests (`@pytest.mark.slow`)
- Performance tests
- Long-running integration scenarios

## Configuration

Tests can be configured via environment variables:
- `AWS_DEFAULT_REGION` - AWS region for tests (default: us-east-1)
- `CONTAINER_IMAGE_TAG` - Container image tag to test (default: model-interface-request-handler:test)
- `TEST_TIMEOUT` - Test timeout in seconds (default: 300)

## Example Workflow

```bash
# 1. Set up environment
uv sync

# 2. Run quick container tests first
uv run pytest -m "container" -v

# 3. If container tests pass, run integration tests
export AWS_DEFAULT_REGION=us-east-1
uv run pytest -m "integration" -v

# 4. Run full test suite
uv run pytest -v
```