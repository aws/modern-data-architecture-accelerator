"""
Shared pytest fixtures for LakeFormation Settings Lambda tests.
"""
import os
import sys
from unittest.mock import MagicMock

import pytest

# Set up AWS credentials/region before importing the handler module, which
# instantiates a boto3 Glue client at import time.
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_SECURITY_TOKEN'] = 'testing'
os.environ['AWS_SESSION_TOKEN'] = 'testing'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

# Add the handler source directory to the Python path.
s3tables_integration_src_path = os.path.join(
    os.path.dirname(__file__), '..', 'src', 'python', 's3tables_integration'
)
sys.path.insert(0, s3tables_integration_src_path)


@pytest.fixture
def lambda_context():
    """Mock Lambda context for testing."""
    class MockContext:
        def __init__(self):
            self.function_name = "s3tables-integration-function"
            self.function_version = "$LATEST"
            self.remaining_time_in_millis = lambda: 30000
            self.aws_request_id = "test-request-id"
            self.log_stream_name = "test-log-stream"

    return MockContext()


@pytest.fixture
def mock_glue_client():
    """Mock Glue client with the exception classes referenced by the handler."""
    client = MagicMock()
    client.exceptions = MagicMock()
    client.exceptions.AlreadyExistsException = type(
        'AlreadyExistsException', (Exception,), {}
    )
    client.exceptions.FederatedResourceAlreadyExistsException = type(
        'FederatedResourceAlreadyExistsException', (Exception,), {}
    )
    client.exceptions.EntityNotFoundException = type(
        'EntityNotFoundException', (Exception,), {}
    )
    return client


def _resource_properties():
    """Resource properties as emitted by the L3 construct handlerProps."""
    return {
        "catalogName": "s3tablescatalog",
        "federatedCatalogIdentifier": "arn:aws:s3tables:us-east-1:123456789012:bucket/*",
        "connectionName": "aws:s3tables",
        "removeOnDelete": False,
    }


@pytest.fixture
def create_event():
    """CloudFormation Create event."""
    return {
        "RequestType": "Create",
        "ResourceProperties": _resource_properties(),
    }


@pytest.fixture
def update_event():
    """CloudFormation Update event."""
    return {
        "RequestType": "Update",
        "ResourceProperties": _resource_properties(),
    }


@pytest.fixture
def delete_event():
    """CloudFormation Delete event with removeOnDelete disabled (default)."""
    props = _resource_properties()
    return {
        "RequestType": "Delete",
        "ResourceProperties": props,
    }
