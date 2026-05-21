"""
Shared pytest fixtures for GenAI Accelerator Lambda tests.
"""
import pytest
import boto3
import os
import sys
from unittest.mock import MagicMock

# Add the source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), '../src')
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
            self.function_name = "test-function"
            self.function_version = "$LATEST"
            self.remaining_time_in_millis = lambda: 30000
            self.aws_request_id = "test-request-id"
    
    return MockContext()

@pytest.fixture
def sample_bedrock_event():
    """Sample Bedrock Agent event for testing."""
    return {
        "requestBody": {
            "apiPath": "/getAccountInfo",
            "content": {
                "accountId": "acc-12345"
            }
        }
    }

@pytest.fixture
def sample_kb_transform_event():
    """Sample Knowledge Base transform event for testing."""
    return {
        "bucketName": "test-bucket",
        "inputFiles": [
            {
                "originalFileLocation": {
                    "bucketName": "test-bucket",
                    "key": "documents/test.json"
                },
                "fileMetadata": {
                    "title": "Test Document"
                },
                "contentBatches": [
                    {
                        "key": "processed/test.JSON"
                    }
                ]
            }
        ]
    }