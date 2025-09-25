"""
Tests for datalake_folder.py Lambda function.
"""
import pytest
import json
import os
import sys
from unittest.mock import patch, MagicMock
from moto import mock_aws
import boto3
from botocore.exceptions import ClientError

# Add the source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'python', 'datalake_folder')
sys.path.insert(0, src_path)

# Import the module under test
import datalake_folder


class TestDatalakeFolder:
    """Test class for datalake folder Lambda function."""

    @mock_aws
    def test_lambda_handler_create_success(self, aws_credentials, lambda_context, create_event, env_vars):
        """Test successful folder creation."""
        # Create S3 bucket for testing
        s3 = boto3.client('s3', region_name='us-east-1')
        s3.create_bucket(Bucket='test-bucket')
        
        # Patch the s3_client in the module to use our mocked client
        with patch.object(datalake_folder, 's3_client', s3):
            # Call the lambda handler
            result = datalake_folder.lambda_handler(create_event, lambda_context)
            
            # Verify the result
            assert result['Status'] == 'SUCCESS'
            assert result['PhysicalResourceId'] == 'test-bucket:test-folder/'
            
            # Verify the folder was created in S3
            objects = s3.list_objects_v2(Bucket='test-bucket')
            assert 'Contents' in objects
            assert objects['Contents'][0]['Key'] == 'test-folder/'

    def test_lambda_handler_non_create_event(self, aws_credentials, lambda_context, delete_event, env_vars):
        """Test lambda handler with non-Create event type."""
        # Call the lambda handler with Delete event
        result = datalake_folder.lambda_handler(delete_event, lambda_context)
        
        # Should return None for non-Create events
        assert result is None

    @mock_aws
    def test_folder_name_normalization(self, aws_credentials, lambda_context, env_vars):
        """Test folder name normalization logic."""
        # Create S3 bucket for testing
        s3 = boto3.client('s3', region_name='us-east-1')
        s3.create_bucket(Bucket='test-bucket')
        
        # Test cases for folder name normalization
        test_cases = [
            ("folder", "folder/"),
            ("/folder", "folder/"),
            ("folder/", "folder/"),
            ("/folder/", "folder/"),
        ]
        
        # Patch the s3_client in the module to use our mocked client
        with patch.object(datalake_folder, 's3_client', s3):
            for input_folder, expected_folder in test_cases:
                # Create test event
                event = {
                    "RequestType": "Create",
                    "ResourceProperties": {
                        "bucket_name": "test-bucket",
                        "folder_name": input_folder
                    }
                }
                
                result = datalake_folder.handle_create(event, lambda_context)
                
                # Verify the result
                assert result['Status'] == 'SUCCESS'
                assert result['PhysicalResourceId'] == f'test-bucket:{expected_folder}'

    @patch('datalake_folder.time.sleep')
    def test_handle_create_retry_logic(self, mock_sleep, aws_credentials, lambda_context, create_event, env_vars):
        """Test retry logic in handle_create."""
        # Mock s3_client.put_object to fail once then succeed
        with patch.object(datalake_folder.s3_client, 'put_object') as mock_put_object:
            # Fail once, then succeed
            mock_put_object.side_effect = [
                ClientError({'Error': {'Code': 'ServiceUnavailable'}}, 'PutObject'),
                None  # Success on second try
            ]
            
            result = datalake_folder.handle_create(create_event, lambda_context)
            
            # Verify the result
            assert result['Status'] == 'SUCCESS'
            assert result['PhysicalResourceId'] == 'test-bucket:test-folder/'
            
            # Verify put_object was called twice
            assert mock_put_object.call_count == 2
            
            # Verify sleep was called once (after first failure)
            assert mock_sleep.call_count == 1

    @patch('datalake_folder.logger')
    def test_logging(self, mock_logger, aws_credentials, lambda_context, create_event, env_vars):
        """Test that appropriate logging occurs."""
        with patch.object(datalake_folder.s3_client, 'put_object') as mock_put_object:
            mock_put_object.return_value = None
            
            # Call lambda_handler
            datalake_folder.lambda_handler(create_event, lambda_context)
            
            # Verify logging calls
            mock_logger.info.assert_called()