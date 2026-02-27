"""
Shared pytest fixtures for DataZone L3 Construct Python tests.
"""
import pytest
import os
import sys
from unittest.mock import MagicMock

# Set up AWS environment variables before any imports
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_SECURITY_TOKEN'] = 'testing'
os.environ['AWS_SESSION_TOKEN'] = 'testing'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

# Add all Lambda source directories to Python path
lambda_dirs = [
    'add_policy_grant',
    'get_blueprint',
    'get_user_profile',
    'monitor_ram_association'
]

for lambda_dir in lambda_dirs:
    src_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'lambda', lambda_dir)
    if src_path not in sys.path:
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
            self.function_name = "datazone-function"
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