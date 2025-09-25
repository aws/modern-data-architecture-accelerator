"""
Shared pytest fixtures for Datalake Folder Lambda tests.
"""
import pytest
import os
import sys
from unittest.mock import MagicMock

# Add the source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'python', 'datalake_folder')
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
            self.function_name = "datalake-folder-function"
            self.function_version = "$LATEST"
            self.remaining_time_in_millis = lambda: 30000
            self.aws_request_id = "test-request-id"
            self.log_stream_name = "test-log-stream"
    
    return MockContext()

@pytest.fixture
def env_vars():
    """Set up environment variables for testing."""
    env_vars = {
        'USER_AGENT_STRING': 'test-solution/1.0.0',
        'LOG_LEVEL': 'INFO'
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
        "ResourceType": "Custom::DatalakeFolder",
        "ResourceProperties": {
            "bucket_name": "test-bucket",
            "folder_name": "test-folder"
        }
    }

@pytest.fixture
def create_event_with_leading_slash():
    """CloudFormation Create event with leading slash in folder name."""
    return {
        "RequestType": "Create",
        "ResponseURL": "https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test",
        "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
        "RequestId": "test-request-id",
        "LogicalResourceId": "TestResource",
        "ResourceType": "Custom::DatalakeFolder",
        "ResourceProperties": {
            "bucket_name": "test-bucket",
            "folder_name": "/test-folder"
        }
    }

@pytest.fixture
def create_event_with_trailing_slash():
    """CloudFormation Create event with trailing slash in folder name."""
    return {
        "RequestType": "Create",
        "ResponseURL": "https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test",
        "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
        "RequestId": "test-request-id",
        "LogicalResourceId": "TestResource",
        "ResourceType": "Custom::DatalakeFolder",
        "ResourceProperties": {
            "bucket_name": "test-bucket",
            "folder_name": "test-folder/"
        }
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
        "ResourceType": "Custom::DatalakeFolder"
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
        "ResourceType": "Custom::DatalakeFolder"
    }