"""
Unit tests for datasource_batch_sync Lambda function.
"""
import pytest
import json
import os
import sys
from unittest.mock import patch, MagicMock

# Add the source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), '..', 'lib', 'lambda-functions', 'datasource')
sys.path.insert(0, src_path)

import datasource_batch_sync


class TestDataSourceBatchSync:
    """Test cases for datasource_batch_sync function."""

    @pytest.fixture
    def mock_env_vars(self):
        """Mock environment variables."""
        env_vars = {
            'KNOWLEDGE_BASE_ID': 'test-kb-id',
            'DATA_SOURCE_ID': 'test-ds-id',
            'DLQ_URL': 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq'
        }
        
        # Set environment variables
        for key, value in env_vars.items():
            os.environ[key] = value
        
        yield env_vars
        
        # Clean up environment variables
        for key in env_vars.keys():
            os.environ.pop(key, None)

    @pytest.fixture
    def lambda_context(self):
        """Mock Lambda context for testing."""
        class MockContext:
            def __init__(self):
                self.function_name = "batch-sync-function"
                self.function_version = "$LATEST"
                self.remaining_time_in_millis = lambda: 30000
                self.aws_request_id = "test-request-id"
                self.log_stream_name = "test-log-stream"
        
        return MockContext()

    @pytest.fixture
    def sample_sqs_event(self):
        """Sample SQS event with S3 notifications."""
        return {
            'Records': [
                {
                    'messageId': 'msg-1',
                    'body': json.dumps({
                        'Records': [
                            {
                                's3': {
                                    'bucket': {'name': 'test-bucket'},
                                    'object': {'key': 'test-file-1.pdf'}
                                }
                            }
                        ]
                    })
                },
                {
                    'messageId': 'msg-2',
                    'body': json.dumps({
                        'Records': [
                            {
                                's3': {
                                    'bucket': {'name': 'test-bucket'},
                                    'object': {'key': 'test-file-2.pdf'}
                                }
                            }
                        ]
                    })
                }
            ]
        }

    @patch('datasource_batch_sync.bedrock_agent')
    @patch('datasource_batch_sync.is_ingestion_job_running')
    def test_lambda_handler_success(self, mock_is_running, mock_bedrock, mock_env_vars, 
                                   lambda_context, sample_sqs_event):
        """Test successful batch processing."""
        # Setup mocks
        mock_is_running.return_value = False
        mock_bedrock.start_ingestion_job.return_value = {
            'ingestionJob': {'ingestionJobId': 'job-123'}
        }
        
        # Execute
        result = datasource_batch_sync.lambda_handler(sample_sqs_event, lambda_context)
        
        # Verify
        assert result == {'batchItemFailures': []}
        mock_bedrock.start_ingestion_job.assert_called_once_with(
            knowledgeBaseId='test-kb-id',
            dataSourceId='test-ds-id'
        )

    @patch('datasource_batch_sync.is_ingestion_job_running')
    def test_lambda_handler_job_already_running(self, mock_is_running, mock_env_vars, 
                                               lambda_context, sample_sqs_event):
        """Test handling when ingestion job is already running."""
        # Setup
        mock_is_running.return_value = True
        
        # Execute
        result = datasource_batch_sync.lambda_handler(sample_sqs_event, lambda_context)
        
        # Verify - all messages should be returned as failures to requeue
        expected_failures = [
            {'itemIdentifier': 'msg-1'},
            {'itemIdentifier': 'msg-2'}
        ]
        assert result == {'batchItemFailures': expected_failures}

    @patch('datasource_batch_sync.bedrock_agent')
    @patch('datasource_batch_sync.is_ingestion_job_running')
    def test_lambda_handler_error(self, mock_is_running, mock_bedrock, mock_env_vars, 
                                 lambda_context, sample_sqs_event):
        """Test error handling."""
        # Setup
        mock_is_running.return_value = False
        mock_bedrock.start_ingestion_job.side_effect = Exception("API Error")
        
        # Execute
        result = datasource_batch_sync.lambda_handler(sample_sqs_event, lambda_context)
        
        # Verify
        expected_failures = [
            {'itemIdentifier': 'msg-1'},
            {'itemIdentifier': 'msg-2'}
        ]
        assert result == {'batchItemFailures': expected_failures}

    def test_extract_s3_events(self):
        """Test S3 event extraction from SQS records."""
        sqs_records = [
            {
                'body': json.dumps({
                    'Records': [
                        {'s3': {'bucket': {'name': 'bucket1'}, 'object': {'key': 'file1.pdf'}}}
                    ]
                })
            },
            {
                'body': json.dumps({
                    's3': {'bucket': {'name': 'bucket2'}, 'object': {'key': 'file2.pdf'}}
                })
            }
        ]
        
        events = datasource_batch_sync.extract_s3_events(sqs_records)
        assert len(events) == 2

    def test_extract_s3_events_invalid_json(self):
        """Test S3 event extraction with invalid JSON."""
        sqs_records = [
            {'messageId': 'msg-invalid', 'body': 'invalid json'},
            {
                'messageId': 'msg-valid',
                'body': json.dumps({
                    'Records': [
                        {'s3': {'bucket': {'name': 'bucket1'}, 'object': {'key': 'file1.pdf'}}}
                    ]
                })
            }
        ]
        
        events, failed_message_ids = datasource_batch_sync.extract_s3_events(sqs_records)
        assert len(events) == 1  # Only valid record should be processed
        assert len(failed_message_ids) == 1  # One failed message
        assert failed_message_ids[0] == 'msg-invalid'

    def test_deduplicate_s3_events(self):
        """Test S3 event deduplication."""
        s3_events = [
            {'s3': {'bucket': {'name': 'bucket1'}, 'object': {'key': 'file1.pdf'}}},
            {'s3': {'bucket': {'name': 'bucket1'}, 'object': {'key': 'file2.pdf'}}},
            {'s3': {'bucket': {'name': 'bucket1'}, 'object': {'key': 'file1.pdf'}}}  # duplicate
        ]
        
        unique_files = datasource_batch_sync.deduplicate_s3_events(s3_events)
        assert len(unique_files) == 2
        assert 'bucket1/file1.pdf' in unique_files
        assert 'bucket1/file2.pdf' in unique_files

    def test_deduplicate_s3_events_invalid_structure(self):
        """Test S3 event deduplication with invalid event structure."""
        s3_events = [
            {'s3': {'bucket': {'name': 'bucket1'}, 'object': {'key': 'file1.pdf'}}},
            {'invalid': 'event'},  # Invalid structure
            {'s3': {'bucket': {'name': 'bucket1'}, 'object': {'key': 'file2.pdf'}}}
        ]
        
        unique_files = datasource_batch_sync.deduplicate_s3_events(s3_events)
        assert len(unique_files) == 2

    @patch('datasource_batch_sync.bedrock_agent')
    def test_is_ingestion_job_running_true(self, mock_bedrock):
        """Test detection of running ingestion job."""
        mock_bedrock.list_ingestion_jobs.return_value = {
            'ingestionJobSummaries': [
                {'ingestionJobId': 'job-1', 'status': 'IN_PROGRESS'},
                {'ingestionJobId': 'job-2', 'status': 'COMPLETED'}
            ]
        }
        
        result = datasource_batch_sync.is_ingestion_job_running('kb-id', 'ds-id')
        assert result is True

    @patch('datasource_batch_sync.bedrock_agent')
    def test_is_ingestion_job_running_false(self, mock_bedrock):
        """Test when no ingestion job is running."""
        mock_bedrock.list_ingestion_jobs.return_value = {
            'ingestionJobSummaries': [
                {'ingestionJobId': 'job-1', 'status': 'COMPLETED'},
                {'ingestionJobId': 'job-2', 'status': 'FAILED'}
            ]
        }
        
        result = datasource_batch_sync.is_ingestion_job_running('kb-id', 'ds-id')
        assert result is False

    @patch('datasource_batch_sync.bedrock_agent')
    def test_is_ingestion_job_running_error(self, mock_bedrock):
        """Test error handling in ingestion job check."""
        mock_bedrock.list_ingestion_jobs.side_effect = Exception("API Error")
        
        result = datasource_batch_sync.is_ingestion_job_running('kb-id', 'ds-id')
        assert result is False
