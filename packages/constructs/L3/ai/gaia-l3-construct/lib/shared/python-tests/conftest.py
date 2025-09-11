"""
Shared pytest fixtures for GAIA L3 Construct Python tests.
"""
# Add this at the very top of conftest.py, before any other imports
import os
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_SECURITY_TOKEN'] = 'testing'
os.environ['AWS_SESSION_TOKEN'] = 'testing'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

# Set required environment variables for genai_core modules
os.environ['PROCESSING_BUCKET_NAME'] = 'test-processing-bucket'
os.environ['WORKSPACES_TABLE_NAME'] = 'test-workspaces-table'
os.environ['DOCUMENTS_TABLE_NAME'] = 'test-documents-table'
os.environ['DOCUMENTS_BY_COMPOUND_KEY_INDEX_NAME'] = 'test-documents-index'
os.environ['FILE_IMPORT_WORKFLOW_ARN'] = 'arn:aws:states:us-east-1:123456789012:stateMachine:test-file-import'
os.environ['WEBSITE_CRAWLING_WORKFLOW_ARN'] = 'arn:aws:states:us-east-1:123456789012:stateMachine:test-website-crawling'
os.environ['DEFAULT_KENDRA_S3_DATA_SOURCE_BUCKET_NAME'] = 'test-kendra-bucket'

import pytest
import boto3
import os
import sys
from unittest.mock import MagicMock, patch
from moto import mock_aws

# Add the shared Python source directories to Python path
shared_path = os.path.dirname(__file__)  # We're now in the shared directory
sys.path.insert(0, shared_path)

# Add genai_core module path
genai_core_path = os.path.join(shared_path, 'layers/python-sdk/python')
sys.path.insert(0, genai_core_path)

# Add file import batch job path
file_import_path = os.path.join(shared_path, 'file-import-batch-job')
sys.path.insert(0, file_import_path)

# Add secrets rotation function path
secrets_path = os.path.join(shared_path, 'secrets-rotation-function')
sys.path.insert(0, secrets_path)

@pytest.fixture
def aws_credentials():
    """Mocked AWS Credentials for testing."""
    os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
    os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
    os.environ['AWS_SECURITY_TOKEN'] = 'testing'
    os.environ['AWS_SESSION_TOKEN'] = 'testing'
    os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

@pytest.fixture
def lambda_context():
    """Mock Lambda context for testing."""
    class MockContext:
        def __init__(self):
            self.function_name = "test-function"
            self.function_version = "$LATEST"
            self.remaining_time_in_millis = lambda: 30000
            self.aws_request_id = "test-request-id"
            self.log_group_name = "/aws/lambda/test-function"
            self.log_stream_name = "test-stream"
    
    return MockContext()

@pytest.fixture
def mock_s3_client():
    """Mock S3 client for testing."""
    with mock_aws():
        yield boto3.client('s3', region_name='us-east-1')

@pytest.fixture
def mock_dynamodb_client():
    """Mock DynamoDB client for testing."""
    with mock_aws():
        yield boto3.client('dynamodb', region_name='us-east-1')

@pytest.fixture
def mock_secrets_client():
    """Mock Secrets Manager client for testing."""
    with mock_aws():
        yield boto3.client('secretsmanager', region_name='us-east-1')

@pytest.fixture
def sample_workspace():
    """Sample workspace data for testing."""
    return {
        "workspace_id": "test-workspace-123",
        "name": "Test Workspace",
        "description": "A test workspace for unit tests",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }

@pytest.fixture
def sample_document():
    """Sample document data for testing."""
    return {
        "document_id": "doc-123",
        "title": "Test Document",
        "content": "This is a test document content.",
        "metadata": {
            "source": "test",
            "type": "text"
        }
    }

@pytest.fixture
def sample_chunk():
    """Sample chunk data for testing."""
    return {
        "chunk_id": "chunk-123",
        "document_id": "doc-123",
        "content": "This is a test chunk.",
        "embedding": [0.1, 0.2, 0.3],
        "metadata": {
            "page": 1,
            "section": "introduction"
        }
    }

@pytest.fixture
def mock_bedrock_client():
    """Mock Bedrock client for testing."""
    mock_client = MagicMock()
    mock_client.invoke_model.return_value = {
        'body': MagicMock(),
        'contentType': 'application/json'
    }
    return mock_client

@pytest.fixture
def mock_opensearch_client():
    """Mock OpenSearch client for testing."""
    mock_client = MagicMock()
    mock_client.search.return_value = {
        'hits': {
            'total': {'value': 0},
            'hits': []
        }
    }
    return mock_client