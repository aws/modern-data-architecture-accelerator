"""
Shared pytest fixtures for Health Data Accelerator Python tests.
"""
import pytest
import boto3
import os
import sys
import json
from datetime import datetime

# Add the source directories to Python path
lambda_path = os.path.join(os.path.dirname(__file__), '../src/lambda')
glue_path = os.path.join(os.path.dirname(__file__), '../src/glue')
sys.path.insert(0, lambda_path)
sys.path.insert(0, glue_path)

@pytest.fixture
def aws_credentials():
    """Mocked AWS Credentials for testing."""
    os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
    os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
    os.environ['AWS_SECURITY_TOKEN'] = 'testing'
    os.environ['AWS_SESSION_TOKEN'] = 'testing'
    os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

@pytest.fixture
def mock_dms_tracker_table():
    """Mock DMS tracker table configuration."""
    table_name = 'test-dms-tracker-table'
    os.environ['DMS_TRACKER_TABLE'] = table_name
    return table_name

@pytest.fixture
def mock_raw_table_config_table():
    """Mock raw table config table configuration."""
    table_name = 'test-raw-table-config'
    os.environ['ODPF_RAW_TABLE_CONFIG_DDB_TABLE_NAME'] = table_name
    return table_name

@pytest.fixture
def sample_s3_event():
    """Sample S3 event for Lambda testing."""
    return {
        "Records": [
            {
                "eventVersion": "2.1",
                "eventSource": "aws:s3",
                "awsRegion": "us-east-1",
                "eventTime": "2023-01-01T12:00:00.000Z",
                "eventName": "ObjectCreated:Put",
                "s3": {
                    "bucket": {
                        "name": "test-bucket"
                    },
                    "object": {
                        "key": "raw/patients/LOAD00000001.csv",
                        "size": 1024
                    }
                }
            }
        ]
    }

@pytest.fixture
def sample_dms_file_record():
    """Sample DMS file record for testing."""
    return {
        'source_table_name': 'patients',
        'file_id': 'test-file-123',
        'file_ingestion_status': 'raw_file_landed',
        'file_ingestion_date_time': datetime.now().isoformat(),
        'file_ingestion_s3_bucket': 'test-bucket',
        'file_ingestion_path': 'raw/patients/LOAD00000001.csv',
        'dms_file_type': 'Full',
        'schema_name': 'public',
        'table_name': 'patients'
    }

@pytest.fixture
def sample_lambda_context():
    """Sample Lambda context for testing."""
    class MockContext:
        def __init__(self):
            self.function_name = "test-function"
            self.function_version = "$LATEST"
            self.remaining_time_in_millis = lambda: 30000
            self.aws_request_id = "test-request-id"
    
    return MockContext()