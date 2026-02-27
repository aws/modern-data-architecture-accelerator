"""
Shared pytest fixtures for DataZone Lambda tests.
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
check_user_profiles_src_path = os.path.join(
    os.path.dirname(__file__), '..', 'src', 'lambda', 'check_user_profiles'
)
create_project_membership_src_path = os.path.join(
    os.path.dirname(__file__), '..', 'src', 'lambda', 'create_project_membership'
)
domain_config_src_path = os.path.join(
    os.path.dirname(__file__), '..', 'src', 'lambda', 'domain_config'
)
environment_blueprint_src_path = os.path.join(
    os.path.dirname(__file__), '..', 'src', 'lambda', 'environment_blueprint'
)
monitor_env_deployment_src_path = os.path.join(
    os.path.dirname(__file__), '..', 'src', 'lambda', 'monitor_env_deployment'
)
sys.path.insert(0, check_user_profiles_src_path)
sys.path.insert(0, create_project_membership_src_path)
sys.path.insert(0, domain_config_src_path)
sys.path.insert(0, environment_blueprint_src_path)
sys.path.insert(0, monitor_env_deployment_src_path)


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
            self.function_name = "check-user-profiles-function"
            self.function_version = "$LATEST"
            self.remaining_time_in_millis = lambda: 30000
            self.aws_request_id = "test-request-id"
            self.log_stream_name = "test-log-stream"

    return MockContext()


@pytest.fixture
def mock_datazone_client():
    """Mock DataZone client for testing."""
    client = MagicMock()
    client.exceptions = MagicMock()
    client.exceptions.ResourceNotFoundException = type(
        'ResourceNotFoundException', (Exception,), {}
    )
    return client


@pytest.fixture
def create_event():
    """CloudFormation Create event for testing."""
    return {
        "RequestType": "Create",
        "ResponseURL": "https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test",
        "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
        "RequestId": "test-request-id",
        "LogicalResourceId": "TestResource",
        "ResourceType": "Custom::CheckUserProfile",
        "ResourceProperties": {
            "domain_id": "dzd_test123",
            "user_identifier": "arn:aws:iam::123456789012:user/testuser"
        }
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
        "ResourceType": "Custom::CheckUserProfile",
        "ResourceProperties": {
            "domain_id": "dzd_test123",
            "user_identifier": "arn:aws:iam::123456789012:user/testuser"
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
        "ResourceType": "Custom::CheckUserProfile",
        "ResourceProperties": {
            "domain_id": "dzd_test123",
            "user_identifier": "arn:aws:iam::123456789012:user/testuser"
        }
    }
