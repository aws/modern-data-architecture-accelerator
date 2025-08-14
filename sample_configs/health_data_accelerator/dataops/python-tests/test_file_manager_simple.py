"""
Comprehensive unit tests for ODPF File Manager Lambda function.
"""
import pytest
import sys
import os
import json
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError

# Import the file manager module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../src/lambda/file_manager'))

try:
    import odpf_file_manager
    from odpf_file_manager import FileManagerConfig
except ImportError as e:
    pytest.skip(f"Could not import odpf_file_manager: {e}", allow_module_level=True)


class TestFileManagerConfig:
    """Test cases for FileManagerConfig class."""
    
    def test_config_with_env_var(self):
        """Test config initialization with environment variable."""
        with patch.dict(os.environ, {'DMS_TRACKER_TABLE': 'test-table'}):
            with patch('boto3.client') as mock_boto:
                mock_client = MagicMock()
                mock_boto.return_value = mock_client
                
                config = FileManagerConfig()
                
                assert config.table_name == 'test-table'
                assert config.ddb_client == mock_client
                mock_boto.assert_called_once_with('dynamodb')
    
    def test_config_with_parameters(self):
        """Test config initialization with explicit parameters."""
        mock_client = MagicMock()
        config = FileManagerConfig(table_name='custom-table', ddb_client=mock_client)
        
        assert config.table_name == 'custom-table'
        assert config.ddb_client == mock_client
    
    def test_config_missing_table_name(self):
        """Test config raises error when table name is missing."""
        with patch.dict(os.environ, {'AWS_DEFAULT_REGION': 'us-east-1'}, clear=True):
            with pytest.raises(ValueError, match="DMS_TRACKER_TABLE environment variable is required"):
                FileManagerConfig()


class TestLogRawFileIngestion:
    """Test cases for log_raw_file_ingestion function."""
    
    def test_log_raw_file_ingestion_success(self):
        """Test successful logging of file ingestion."""
        mock_client = MagicMock()
        config = FileManagerConfig(table_name='test-table', ddb_client=mock_client)
        
        test_record = {
            'source_table_name': 'schema/patients',
            'file_id': 'test-file-123',
            'file_ingestion_status': 'raw_file_landed',
            'file_ingestion_date_time': '2023-01-01 12:00:00',
            'file_ingestion_s3_bucket': 'test-bucket',
            'file_ingestion_path': 'raw/schema/patients/test.csv',
            'dms_file_type': 'Full',
            'schema_name': 'schema',
            'table_name': 'patients'
        }
        
        odpf_file_manager.log_raw_file_ingestion(test_record, config)
        
        # Verify DynamoDB client was called with correct parameters
        mock_client.transact_write_items.assert_called_once()
        call_args = mock_client.transact_write_items.call_args[1]
        
        assert call_args['TransactItems'][0]['Put']['TableName'] == 'test-table'
        item = call_args['TransactItems'][0]['Put']['Item']
        assert item['source_table_name']['S'] == 'schema/patients'
        assert item['file_id']['S'] == 'test-file-123'
    
    def test_log_raw_file_ingestion_with_default_config(self):
        """Test logging with default config creation."""
        with patch.dict(os.environ, {'DMS_TRACKER_TABLE': 'env-table'}):
            with patch('boto3.client') as mock_boto:
                mock_client = MagicMock()
                mock_boto.return_value = mock_client
                
                test_record = {
                    'source_table_name': 'schema/patients',
                    'file_id': 'test-file-123',
                    'file_ingestion_status': 'raw_file_landed',
                    'file_ingestion_date_time': '2023-01-01 12:00:00',
                    'file_ingestion_s3_bucket': 'test-bucket',
                    'file_ingestion_path': 'raw/schema/patients/test.csv',
                    'dms_file_type': 'Full',
                    'schema_name': 'schema',
                    'table_name': 'patients'
                }
                
                odpf_file_manager.log_raw_file_ingestion(test_record)
                
                mock_client.transact_write_items.assert_called_once()
    
    def test_log_raw_file_ingestion_client_error(self):
        """Test handling of DynamoDB client errors."""
        mock_client = MagicMock()
        error_response = {'Error': {'Code': 'ValidationException', 'Message': 'Test error'}}
        mock_client.transact_write_items.side_effect = ClientError(error_response, 'TransactWriteItems')
        
        config = FileManagerConfig(table_name='test-table', ddb_client=mock_client)
        
        test_record = {
            'source_table_name': 'schema/patients',
            'file_id': 'test-file-123',
            'file_ingestion_status': 'raw_file_landed',
            'file_ingestion_date_time': '2023-01-01 12:00:00',
            'file_ingestion_s3_bucket': 'test-bucket',
            'file_ingestion_path': 'raw/schema/patients/test.csv',
            'dms_file_type': 'Full',
            'schema_name': 'schema',
            'table_name': 'patients'
        }
        
        with pytest.raises(ClientError):
            odpf_file_manager.log_raw_file_ingestion(test_record, config)


class TestParseS3FilePath:
    """Test cases for _parse_s3_file_path function."""
    
    def test_parse_full_load_path(self):
        """Test parsing full load file path."""
        path = 'raw/schema/table/file.csv'
        schema, table, file_type = odpf_file_manager._parse_s3_file_path(path)
        
        assert schema == 'schema'
        assert table == 'table'
        assert file_type == 'Full'
    
    def test_parse_incremental_load_path(self):
        """Test parsing incremental load file path."""
        path = 'raw/schema/table/2023/01/01/file.csv'
        schema, table, file_type = odpf_file_manager._parse_s3_file_path(path)
        
        assert schema == 'schema'
        assert table == 'table'
        assert file_type == 'Incremental'
    
    def test_parse_invalid_path(self):
        """Test parsing invalid file path."""
        with pytest.raises(ValueError, match="Invalid S3 file path format"):
            odpf_file_manager._parse_s3_file_path('invalid/path')


class TestFormatTimestamp:
    """Test cases for _format_timestamp function."""
    
    def test_format_valid_timestamp(self):
        """Test formatting valid ISO timestamp."""
        timestamp = '2023-01-01T12:30:45Z'
        result = odpf_file_manager._format_timestamp(timestamp)
        assert result == '2023-01-01 12:30:45'
    
    def test_format_invalid_timestamp(self):
        """Test formatting invalid timestamp."""
        with pytest.raises(ValueError, match="Invalid timestamp format"):
            odpf_file_manager._format_timestamp('invalid-timestamp')


class TestCreateRawFileIngestionAuditRec:
    """Test cases for create_raw_file_ingestion_audit_rec function."""
    
    def test_create_audit_record_full_load(self):
        """Test creating audit record for full load."""
        mock_uuid = lambda: 'test-uuid-123'
        
        event = {
            'time': '2023-01-01T12:30:45Z',
            'detail': {
                'bucket': {'name': 'test-bucket'},
                'object': {'key': 'raw/public/patients/data.csv'}
            }
        }
        
        result = odpf_file_manager.create_raw_file_ingestion_audit_rec(event, mock_uuid)
        
        expected = {
            'file_id': 'test-uuid-123',
            'file_ingestion_s3_bucket': 'test-bucket',
            'file_ingestion_path': 'raw/public/patients/data.csv',
            'file_ingestion_date_time': '2023-01-01 12:30:45',
            'dms_file_type': 'Full',
            'source_table_name': 'public/patients',
            'schema_name': 'public',
            'table_name': 'patients',
            'file_ingestion_status': 'raw_file_landed'
        }
        
        assert result == expected
    
    def test_create_audit_record_incremental_load(self):
        """Test creating audit record for incremental load."""
        mock_uuid = lambda: 'test-uuid-456'
        
        event = {
            'time': '2023-01-01T12:30:45Z',
            'detail': {
                'bucket': {'name': 'test-bucket'},
                'object': {'key': 'raw/public/patients/2023/01/01/12/data.csv'}
            }
        }
        
        result = odpf_file_manager.create_raw_file_ingestion_audit_rec(event, mock_uuid)
        
        assert result['dms_file_type'] == 'Incremental'
        assert result['file_id'] == 'test-uuid-456'
    
    def test_create_audit_record_missing_fields(self):
        """Test error handling for missing event fields."""
        event = {'time': '2023-01-01T12:30:45Z'}  # Missing detail
        
        with pytest.raises(KeyError, match="Missing required field in ingestion event"):
            odpf_file_manager.create_raw_file_ingestion_audit_rec(event)
    
    def test_create_audit_record_invalid_timestamp(self):
        """Test error handling for invalid timestamp."""
        event = {
            'time': 'invalid-timestamp',
            'detail': {
                'bucket': {'name': 'test-bucket'},
                'object': {'key': 'raw/public/patients/data.csv'}
            }
        }
        
        with pytest.raises(ValueError, match="Invalid timestamp format"):
            odpf_file_manager.create_raw_file_ingestion_audit_rec(event)


class TestLambdaHandler:
    """Test cases for lambda_handler function."""
    
    def test_lambda_handler_success(self):
        """Test successful lambda execution."""
        mock_client = MagicMock()
        config = FileManagerConfig(table_name='test-table', ddb_client=mock_client)
        
        event = {
            'time': '2023-01-01T12:30:45Z',
            'detail': {
                'bucket': {'name': 'test-bucket'},
                'object': {'key': 'raw/public/patients/data.csv'}
            }
        }
        
        context = MagicMock()
        
        result = odpf_file_manager.lambda_handler(event, context, config)
        
        assert result['statusCode'] == 200
        body = json.loads(result['body'])
        assert body['message'] == 'DMS File Manager executed successfully'
        assert 'file_id' in body
        
        # Verify DynamoDB was called
        mock_client.transact_write_items.assert_called_once()
    
    def test_lambda_handler_with_default_config(self):
        """Test lambda handler with default config creation."""
        with patch.dict(os.environ, {'DMS_TRACKER_TABLE': 'env-table'}):
            with patch('boto3.client') as mock_boto:
                mock_client = MagicMock()
                mock_boto.return_value = mock_client
                
                event = {
                    'time': '2023-01-01T12:30:45Z',
                    'detail': {
                        'bucket': {'name': 'test-bucket'},
                        'object': {'key': 'raw/public/patients/data.csv'}
                    }
                }
                
                context = MagicMock()
                
                result = odpf_file_manager.lambda_handler(event, context)
                
                assert result['statusCode'] == 200
                mock_client.transact_write_items.assert_called_once()
    
    def test_lambda_handler_error(self):
        """Test lambda handler error handling."""
        event = {'invalid': 'event'}  # Invalid event structure
        context = MagicMock()
        
        result = odpf_file_manager.lambda_handler(event, context)
        
        assert result['statusCode'] == 500
        body = json.loads(result['body'])
        assert 'error' in body
        assert 'Error processing file ingestion' in body['error']