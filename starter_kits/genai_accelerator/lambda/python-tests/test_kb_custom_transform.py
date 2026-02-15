"""
Unit tests for GenAI Accelerator Knowledge Base Custom Transform Lambda.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from moto import mock_aws
import boto3

import kb_custom_transform


class TestLambdaHandler:
    """Test cases for lambda_handler function."""
    
    @mock_aws
    def test_transform_success(self, lambda_context, aws_credentials):
        """Test successful document transformation."""
        # Setup mock S3
        s3_client = boto3.client('s3', region_name='us-east-1')
        bucket_name = 'test-bucket'
        s3_client.create_bucket(Bucket=bucket_name)
        
        # Put test content in S3
        test_content = {"text": "This is a test document"}
        s3_client.put_object(
            Bucket=bucket_name,
            Key='processed/test.JSON',
            Body=json.dumps(test_content),
            ContentType='application/json'
        )
        
        event = {
            "bucketName": bucket_name,
            "inputFiles": [
                {
                    "originalFileLocation": {
                        "bucketName": bucket_name,
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
        
        result = kb_custom_transform.lambda_handler(event, lambda_context)
        
        assert "outputFiles" in result
        assert len(result["outputFiles"]) == 1
        
        output_file = result["outputFiles"][0]
        assert "fileMetadata" in output_file
        assert "processedDate" in output_file["fileMetadata"]
        assert "processorVersion" in output_file["fileMetadata"]
        assert output_file["fileMetadata"]["processorVersion"] == "1.0.0"
    
    def test_empty_input_files(self, lambda_context):
        """Test handling of empty input files."""
        event = {
            "bucketName": "test-bucket",
            "inputFiles": []
        }
        
        result = kb_custom_transform.lambda_handler(event, lambda_context)
        
        assert "outputFiles" in result
        assert len(result["outputFiles"]) == 0
    
    def test_missing_bucket_name(self, lambda_context):
        """Test handling of missing bucket name."""
        event = {
            "inputFiles": [
                {
                    "originalFileLocation": {
                        "bucketName": "test-bucket",
                        "key": "documents/test.json"
                    },
                    "fileMetadata": {},
                    "contentBatches": []
                }
            ]
        }
        
        result = kb_custom_transform.lambda_handler(event, lambda_context)
        
        # Should handle gracefully and return empty output
        assert "outputFiles" in result


class TestTransformFile:
    """Test cases for transform_file function."""
    
    @mock_aws
    @patch('kb_custom_transform.s3_client')
    def test_transform_file_with_content(self, mock_s3_client, aws_credentials):
        """Test file transformation with valid content."""
        # Mock S3 operations
        test_content = {"text": "Original content"}
        mock_s3_client.get_object.return_value = {
            'Body': MagicMock(read=lambda: json.dumps(test_content).encode('utf-8'))
        }
        mock_s3_client.put_object.return_value = {}
        
        input_file = {
            "originalFileLocation": {
                "bucketName": "test-bucket",
                "key": "documents/test.json"
            },
            "fileMetadata": {
                "title": "Test Document"
            },
            "contentBatches": [
                {
                    "key": "test.JSON"
                }
            ]
        }
        
        result = kb_custom_transform.transform_file(input_file, "test-bucket")
        
        assert "fileMetadata" in result
        assert "processedDate" in result["fileMetadata"]
        assert "processorVersion" in result["fileMetadata"]
        assert result["fileMetadata"]["title"] == "Test Document"
        
        assert "contentBatches" in result
        assert len(result["contentBatches"]) == 1
        assert result["contentBatches"][0]["key"] == "test_transformed.JSON"
        assert result["contentBatches"][0]["transformed"] == True
        
        # Verify S3 operations were called
        mock_s3_client.get_object.assert_called_once()
        mock_s3_client.put_object.assert_called_once()
    
    def test_transform_file_no_content_batches(self):
        """Test file transformation with no content batches."""
        input_file = {
            "originalFileLocation": {
                "bucketName": "test-bucket",
                "key": "documents/test.json"
            },
            "fileMetadata": {
                "title": "Test Document"
            },
            "contentBatches": []
        }
        
        result = kb_custom_transform.transform_file(input_file, "test-bucket")
        
        assert "fileMetadata" in result
        assert "contentBatches" in result
        assert len(result["contentBatches"]) == 0


class TestTransformContent:
    """Test cases for transform_content function."""
    
    def test_transform_text_content(self):
        """Test transformation of text content."""
        content = {"text": "Original text"}
        
        result = kb_custom_transform.transform_content(content)
        
        assert result["text"] == "[PRODUCT DOCUMENTATION] Original text"
        assert result["transformation_applied"] == True
        assert "transformation_timestamp" in result
    
    def test_transform_list_content(self):
        """Test transformation of list content."""
        content = [
            {"text": "First item"},
            {"text": "Second item"}
        ]
        
        result = kb_custom_transform.transform_content(content)
        
        assert len(result) == 2
        assert result[0]["text"] == "[PRODUCT DOCUMENTATION] First item"
        assert result[1]["text"] == "[PRODUCT DOCUMENTATION] Second item"
    
    def test_transform_non_text_content(self):
        """Test transformation of non-text content."""
        content = {"data": "some data", "value": 123}
        
        result = kb_custom_transform.transform_content(content)
        
        # Should return as-is since no text field
        assert result == content
    
    def test_transform_empty_content(self):
        """Test transformation of empty content."""
        content = {}
        
        result = kb_custom_transform.transform_content(content)
        
        assert result == content