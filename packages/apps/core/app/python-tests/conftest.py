"""
Shared pytest fixtures for Core App Python tests.
"""
import pytest
import boto3
import os
import sys
from unittest.mock import MagicMock

# Add the source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), '../src/python')
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
            self.function_name = "provisioning-macro"
            self.function_version = "$LATEST"
            self.remaining_time_in_millis = lambda: 30000
            self.aws_request_id = "test-request-id"
    
    return MockContext()

@pytest.fixture
def sample_provisioning_event():
    """Sample CloudFormation macro event for testing."""
    return {
        "requestId": "test-request-123",
        "templateParameterValues": {
            "PROVISIONEDID": "test-provisioned-id-456"
        },
        "fragment": {
            "Resources": {
                "TestResource": {
                    "Type": "AWS::S3::Bucket",
                    "Properties": {
                        "BucketName": "test-bucket-__provisioned_id__"
                    }
                },
                "AnotherResource": {
                    "Type": "AWS::IAM::Role",
                    "Properties": {
                        "RoleName": "TestRole__PROVISIONED_ID__"
                    }
                }
            }
        }
    }

@pytest.fixture
def expected_transformed_template():
    """Expected template after transformation."""
    return {
        "Resources": {
            "TestResource": {
                "Type": "AWS::S3::Bucket",
                "Properties": {
                    "BucketName": "test-bucket-test-provisioned-id-456"
                }
            },
            "AnotherResource": {
                "Type": "AWS::IAM::Role",
                "Properties": {
                    "RoleName": "TestRoletest-provisioned-id-456"
                }
            }
        }
    }