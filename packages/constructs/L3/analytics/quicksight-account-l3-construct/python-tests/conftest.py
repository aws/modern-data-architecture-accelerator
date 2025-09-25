"""
Shared pytest fixtures for QuickSight Account L3 Construct Python tests.
"""
# Set up AWS credentials for testing before any other imports
import os
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_SECURITY_TOKEN'] = 'testing'
os.environ['AWS_SESSION_TOKEN'] = 'testing'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ['USER_AGENT_STRING'] = 'test-solution-identifier'
os.environ['LOG_LEVEL'] = 'INFO'

import pytest
import boto3
import sys
from unittest.mock import MagicMock, patch
from moto import mock_aws

# Add the Python source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), '../src/python')
sys.path.insert(0, src_path)

# Also add the ip_restrictions directory specifically
ip_restrictions_path = os.path.join(src_path, 'ip_restrictions')
sys.path.insert(0, ip_restrictions_path)

test_account_id = "111111111111"

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
def mock_quicksight_client():
    """Mock QuickSight client for testing."""
    with mock_aws():
        yield boto3.client('quicksight', region_name='us-east-1')

@pytest.fixture
def sample_create_event():
    """Sample CloudFormation Create event."""
    return {
        'RequestType': 'Create',
        'ResponseURL': 'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test',
        'StackId': 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id',
        'RequestId': 'test-request-id',
        'LogicalResourceId': 'TestResource',
        'ResourceType': 'Custom::QuickSightIPRestrictions',
        'ResourceProperties': {
            'accountId': test_account_id,
            'ipRestrictionsMap': {
                'AllowedCIDRs': ['10.0.0.0/8', '192.168.1.0/24']
            }
        }
    }

@pytest.fixture
def sample_update_event():
    """Sample CloudFormation Update event."""
    return {
        'RequestType': 'Update',
        'ResponseURL': 'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test',
        'StackId': 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id',
        'RequestId': 'test-request-id',
        'LogicalResourceId': 'TestResource',
        'ResourceType': 'Custom::QuickSightIPRestrictions',
        'PhysicalResourceId': test_account_id,
        'ResourceProperties': {
            'accountId': test_account_id,
            'ipRestrictionsMap': {
                'AllowedCIDRs': ['10.0.0.0/8', '172.16.0.0/12']
            }
        }
    }

@pytest.fixture
def sample_delete_event():
    """Sample CloudFormation Delete event."""
    return {
        'RequestType': 'Delete',
        'ResponseURL': 'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test',
        'StackId': 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id',
        'RequestId': 'test-request-id',
        'LogicalResourceId': 'TestResource',
        'ResourceType': 'Custom::QuickSightIPRestrictions',
        'PhysicalResourceId': test_account_id
    }

@pytest.fixture
def mock_quicksight_update_response():
    """Mock QuickSight update_ip_restriction response."""
    return {
        'AwsAccountId': test_account_id,
        'RequestId': 'test-request-id'
    }