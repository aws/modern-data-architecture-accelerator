"""
Shared pytest fixtures for Bedrock Knowledge Base Create Index Lambda tests.
"""
import pytest
import os
import sys
from unittest.mock import MagicMock

# Set AWS region before any boto3 imports to prevent NoRegionError during module loading
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-east-1')

# Add the source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'python', 'create-index-aoss')
sys.path.insert(0, src_path)

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
            self.function_name = "create-index-function"
            self.function_version = "$LATEST"
            self.remaining_time_in_millis = lambda: 30000
            self.aws_request_id = "test-request-id"
            self.log_stream_name = "test-log-stream"
    
    return MockContext()

@pytest.fixture
def env_vars():
    """Set up environment variables for testing."""
    env_vars = {
        'COLLECTION_HOST': 'https://test-collection.us-east-1.aoss.amazonaws.com',
        'VECTOR_INDEX_NAME': 'test-vector-index',
        'VECTOR_FIELD_NAME': 'test_vector_field',
        'VECTOR_DIMENSION': '1536',
        'REGION_NAME': 'us-east-1'
    }
    
    # Set environment variables
    for key, value in env_vars.items():
        os.environ[key] = value
    
    yield env_vars
    
    # Clean up environment variables
    for key in env_vars.keys():
        os.environ.pop(key, None)

@pytest.fixture
def create_event():
    """CloudFormation Create event for testing."""
    return {
        "RequestType": "Create",
        "ResponseURL": "https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test",
        "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
        "RequestId": "test-request-id",
        "LogicalResourceId": "TestResource",
        "ResourceType": "Custom::CreateIndex"
    }

@pytest.fixture
def delete_event():
    """CloudFormation Delete event for testing."""
    return {
        "RequestType": "Delete",
        "ResponseURL": "https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test",
        "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
        "RequestId": "test-request-id",
        "LogicalResourceId": "TestResource",
        "ResourceType": "Custom::CreateIndex"
    }

@pytest.fixture
def update_event():
    """CloudFormation Update event for testing."""
    return {
        "RequestType": "Update",
        "ResponseURL": "https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test",
        "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
        "RequestId": "test-request-id",
        "LogicalResourceId": "TestResource",
        "ResourceType": "Custom::CreateIndex"
    }