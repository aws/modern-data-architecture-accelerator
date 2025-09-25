"""
Shared pytest fixtures for Keypair Lambda tests.
"""
import pytest
import os
import sys
from unittest.mock import MagicMock

# Set up AWS credentials before importing the module
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_SECURITY_TOKEN'] = 'testing'
os.environ['AWS_SESSION_TOKEN'] = 'testing'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

# Add the source directories to Python path
keypair_src_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'lambda', 'keypair')
volume_check_src_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'lambda', 'volume_check')
sys.path.insert(0, keypair_src_path)
sys.path.insert(0, volume_check_src_path)

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
            self.function_name = "keypair-function"
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
        "ResourceType": "Custom::Keypair",
        "ResourceProperties": {
            "keypairName": "test-keypair"
        }
    }