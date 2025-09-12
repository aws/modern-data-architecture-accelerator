"""
Unit tests for Bedrock Knowledge Base Create Index Lambda.
"""
import pytest
import json
from unittest.mock import patch, MagicMock, call
from moto import mock_aws
import boto3

import create_index_aoss
import cfnresponse


class TestLambdaHandler:
    """Test cases for lambda_handler function."""
    
    @mock_aws
    @patch('create_index_aoss.OpenSearch')
    @patch('create_index_aoss.cfnresponse.send')
    @patch('create_index_aoss.HOST', 'https://test-collection.us-east-1.aoss.amazonaws.com')
    @patch('create_index_aoss.VECTOR_INDEX_NAME', 'test-vector-index')
    @patch('create_index_aoss.VECTOR_FIELD_NAME', 'test_vector_field')
    @patch('create_index_aoss.VECTOR_DIMENSION', 1536)
    @patch('create_index_aoss.REGION_NAME', 'us-east-1')
    def test_create_index_success(self, mock_cfn_send, mock_opensearch, create_event, lambda_context, aws_credentials):
        """Test successful index creation."""
        # Mock OpenSearch client
        mock_client = MagicMock()
        mock_opensearch.return_value = mock_client
        mock_client.indices.create.return_value = {"acknowledged": True}
        mock_client.indices.get.return_value = {"test-vector-index": {}}
        
        result = create_index_aoss.lambda_handler(create_event, lambda_context)
        
        # Verify OpenSearch client was called correctly
        mock_opensearch.assert_called_once()
        mock_client.indices.create.assert_called_once()
        
        # Verify index creation parameters
        create_call = mock_client.indices.create.call_args
        assert create_call[1]['index'] == 'test-vector-index'
        
        index_body = create_call[1]['body']
        assert 'settings' in index_body
        assert 'mappings' in index_body
        assert index_body['settings']['index.knn'] is True
        assert 'test_vector_field' in index_body['mappings']['properties']
        
        # Verify CFN response
        mock_cfn_send.assert_called_once_with(
            create_event, lambda_context, cfnresponse.SUCCESS, {"acknowledged": True}
        )
        
        # Verify return value
        assert result['statusCode'] == 200
        assert 'Create index lambda ran successfully' in result['body']
    
    @mock_aws
    @patch('create_index_aoss.OpenSearch')
    @patch('create_index_aoss.cfnresponse.send')
    @patch('create_index_aoss.HOST', 'https://test-collection.us-east-1.aoss.amazonaws.com')
    @patch('create_index_aoss.VECTOR_INDEX_NAME', 'test-vector-index')
    @patch('create_index_aoss.VECTOR_FIELD_NAME', 'test_vector_field')
    @patch('create_index_aoss.VECTOR_DIMENSION', 1536)
    @patch('create_index_aoss.REGION_NAME', 'us-east-1')
    def test_delete_index_success(self, mock_cfn_send, mock_opensearch, delete_event, lambda_context, aws_credentials):
        """Test successful index deletion."""
        # Mock OpenSearch client
        mock_client = MagicMock()
        mock_opensearch.return_value = mock_client
        mock_client.indices.delete.return_value = {"acknowledged": True}
        
        result = create_index_aoss.lambda_handler(delete_event, lambda_context)
        
        # Verify OpenSearch client was called correctly
        mock_opensearch.assert_called_once()
        mock_client.indices.delete.assert_called_once_with('test-vector-index')
        
        # Verify CFN response
        mock_cfn_send.assert_called_once_with(
            delete_event, lambda_context, cfnresponse.SUCCESS, {"acknowledged": True}
        )
        
        assert result['statusCode'] == 200
    
    @mock_aws
    @patch('create_index_aoss.OpenSearch')
    @patch('create_index_aoss.cfnresponse.send')
    @patch('create_index_aoss.HOST', 'https://test-collection.us-east-1.aoss.amazonaws.com')
    @patch('create_index_aoss.VECTOR_INDEX_NAME', 'test-vector-index')
    @patch('create_index_aoss.VECTOR_FIELD_NAME', 'test_vector_field')
    @patch('create_index_aoss.VECTOR_DIMENSION', 1536)
    @patch('create_index_aoss.REGION_NAME', 'us-east-1')
    def test_update_event_no_action(self, mock_cfn_send, mock_opensearch, update_event, lambda_context, aws_credentials):
        """Test update event continues without action."""
        # Mock OpenSearch client
        mock_client = MagicMock()
        mock_opensearch.return_value = mock_client
        
        result = create_index_aoss.lambda_handler(update_event, lambda_context)
        
        # Verify no OpenSearch operations were called
        mock_client.indices.create.assert_not_called()
        mock_client.indices.delete.assert_not_called()
        
        # Verify CFN response
        mock_cfn_send.assert_called_once_with(
            update_event, lambda_context, cfnresponse.SUCCESS, {}
        )
        
        assert result['statusCode'] == 200
    
    @mock_aws
    @patch('create_index_aoss.OpenSearch')
    @patch('create_index_aoss.cfnresponse.send')
    @patch('create_index_aoss.HOST', 'https://test-collection.us-east-1.aoss.amazonaws.com')
    @patch('create_index_aoss.VECTOR_INDEX_NAME', 'test-vector-index')
    @patch('create_index_aoss.VECTOR_FIELD_NAME', 'test_vector_field')
    @patch('create_index_aoss.VECTOR_DIMENSION', 1536)
    @patch('create_index_aoss.REGION_NAME', 'us-east-1')
    def test_opensearch_error_handling(self, mock_cfn_send, mock_opensearch, create_event, lambda_context, aws_credentials):
        """Test error handling when OpenSearch operations fail."""
        # Mock OpenSearch client to raise exception
        mock_client = MagicMock()
        mock_opensearch.return_value = mock_client
        mock_client.indices.create.side_effect = Exception("OpenSearch error")
        
        result = create_index_aoss.lambda_handler(create_event, lambda_context)
        
        # Verify CFN response with FAILED status
        mock_cfn_send.assert_called_once_with(
            create_event, lambda_context, cfnresponse.FAILED, {}
        )
        
        assert result['statusCode'] == 200
    
    @mock_aws
    @patch('create_index_aoss.OpenSearch')
    @patch('create_index_aoss.cfnresponse.send')
    @patch('create_index_aoss.time.sleep')
    @patch('create_index_aoss.HOST', 'https://test-collection.us-east-1.aoss.amazonaws.com')
    @patch('create_index_aoss.VECTOR_INDEX_NAME', 'test-vector-index')
    @patch('create_index_aoss.VECTOR_FIELD_NAME', 'test_vector_field')
    @patch('create_index_aoss.VECTOR_DIMENSION', 1536)
    @patch('create_index_aoss.REGION_NAME', 'us-east-1')
    def test_index_ready_retry_logic(self, mock_sleep, mock_cfn_send, mock_opensearch, create_event, lambda_context, aws_credentials):
        """Test retry logic for index readiness check."""
        # Mock OpenSearch client
        mock_client = MagicMock()
        mock_opensearch.return_value = mock_client
        mock_client.indices.create.return_value = {"acknowledged": True}
        
        # Mock index.get to fail twice then succeed
        mock_client.indices.get.side_effect = [
            Exception("Not ready"),
            Exception("Still not ready"),
            {"test-vector-index": {}}
        ]
        
        result = create_index_aoss.lambda_handler(create_event, lambda_context)
        
        # Verify retry attempts
        assert mock_client.indices.get.call_count == 3
        assert mock_sleep.call_count == 2
        
        # Verify successful completion
        mock_cfn_send.assert_called_once_with(
            create_event, lambda_context, cfnresponse.SUCCESS, {"acknowledged": True}
        )
        
        assert result['statusCode'] == 200


class TestIndexConfiguration:
    """Test cases for index configuration."""
    
    @mock_aws
    @patch('create_index_aoss.OpenSearch')
    @patch('create_index_aoss.cfnresponse.send')
    @patch('create_index_aoss.HOST', 'https://test-collection.us-east-1.aoss.amazonaws.com')
    @patch('create_index_aoss.VECTOR_INDEX_NAME', 'test-vector-index')
    @patch('create_index_aoss.VECTOR_FIELD_NAME', 'test_vector_field')
    @patch('create_index_aoss.VECTOR_DIMENSION', 1536)
    @patch('create_index_aoss.REGION_NAME', 'us-east-1')
    def test_index_body_structure(self, mock_cfn_send, mock_opensearch, create_event, lambda_context, aws_credentials):
        """Test the structure of the index body."""
        # Mock OpenSearch client
        mock_client = MagicMock()
        mock_opensearch.return_value = mock_client
        mock_client.indices.create.return_value = {"acknowledged": True}
        mock_client.indices.get.return_value = {"test-vector-index": {}}
        
        create_index_aoss.lambda_handler(create_event, lambda_context)
        
        # Get the index body from the create call
        create_call = mock_client.indices.create.call_args
        index_body = create_call[1]['body']
        
        # Verify settings
        settings = index_body['settings']
        assert settings['index.knn'] is True
        assert settings['index.knn.algo_param.ef_search'] == 512
        
        # Verify mappings
        mappings = index_body['mappings']
        properties = mappings['properties']
        
        # Verify vector field
        vector_field = properties['test_vector_field']
        assert vector_field['type'] == 'knn_vector'
        assert vector_field['dimension'] == 1536
        assert vector_field['method']['space_type'] == 'innerproduct'
        assert vector_field['method']['engine'] == 'FAISS'
        assert vector_field['method']['name'] == 'hnsw'
        assert vector_field['method']['parameters']['m'] == 16
        assert vector_field['method']['parameters']['ef_construction'] == 512
        
        # Verify metadata fields
        assert properties['AMAZON_BEDROCK_METADATA']['type'] == 'text'
        assert properties['AMAZON_BEDROCK_METADATA']['index'] is False
        assert properties['AMAZON_BEDROCK_TEXT_CHUNK']['type'] == 'text'
        assert properties['id']['type'] == 'text'
    
    @mock_aws
    @patch('create_index_aoss.OpenSearch')
    @patch('create_index_aoss.cfnresponse.send')
    @patch('create_index_aoss.HOST', 'https://test-collection.us-east-1.aoss.amazonaws.com')
    @patch('create_index_aoss.VECTOR_INDEX_NAME', 'custom-index')
    @patch('create_index_aoss.VECTOR_FIELD_NAME', 'custom_vector')
    @patch('create_index_aoss.VECTOR_DIMENSION', 768)
    @patch('create_index_aoss.REGION_NAME', 'us-east-1')
    def test_custom_vector_dimension(self, mock_cfn_send, mock_opensearch, lambda_context, aws_credentials):
        """Test custom vector dimension configuration."""
        # Mock OpenSearch client
        mock_client = MagicMock()
        mock_opensearch.return_value = mock_client
        mock_client.indices.create.return_value = {"acknowledged": True}
        mock_client.indices.get.return_value = {"custom-index": {}}
        
        create_event = {
            "RequestType": "Create",
            "ResponseURL": "https://test.com",
            "StackId": "test-stack",
            "RequestId": "test-request",
            "LogicalResourceId": "TestResource"
        }
        
        create_index_aoss.lambda_handler(create_event, lambda_context)
        
        # Verify custom configuration
        create_call = mock_client.indices.create.call_args
        assert create_call[1]['index'] == 'custom-index'
        
        index_body = create_call[1]['body']
        vector_field = index_body['mappings']['properties']['custom_vector']
        assert vector_field['dimension'] == 768


class TestAwsIntegration:
    """Test cases for AWS service integration."""
    
    @mock_aws
    @patch('create_index_aoss.OpenSearch')
    @patch('create_index_aoss.cfnresponse.send')
    @patch('create_index_aoss.HOST', 'https://test-collection.us-east-1.aoss.amazonaws.com')
    @patch('create_index_aoss.VECTOR_INDEX_NAME', 'test-vector-index')
    @patch('create_index_aoss.VECTOR_FIELD_NAME', 'test_vector_field')
    @patch('create_index_aoss.VECTOR_DIMENSION', 1536)
    @patch('create_index_aoss.REGION_NAME', 'us-east-1')
    def test_sts_caller_identity(self, mock_cfn_send, mock_opensearch, create_event, lambda_context, aws_credentials):
        """Test STS caller identity retrieval."""
        # Mock OpenSearch client
        mock_client = MagicMock()
        mock_opensearch.return_value = mock_client
        mock_client.indices.create.return_value = {"acknowledged": True}
        mock_client.indices.get.return_value = {"test-vector-index": {}}
        
        with patch('create_index_aoss.boto3.Session') as mock_session:
            mock_sts_client = MagicMock()
            mock_sts_client.get_caller_identity.return_value = {
                'Arn': 'arn:aws:sts::123456789012:assumed-role/test-role/test-session'
            }
            mock_session.return_value.client.return_value = mock_sts_client
            mock_session.return_value.get_credentials.return_value = MagicMock()
            
            create_index_aoss.lambda_handler(create_event, lambda_context)
            
            # Verify STS client was called
            mock_sts_client.get_caller_identity.assert_called_once()
    
    @mock_aws
    @patch('create_index_aoss.OpenSearch')
    @patch('create_index_aoss.cfnresponse.send')
    @patch('create_index_aoss.HOST', 'https://test-collection.us-east-1.aoss.amazonaws.com')
    @patch('create_index_aoss.VECTOR_INDEX_NAME', 'test-vector-index')
    @patch('create_index_aoss.VECTOR_FIELD_NAME', 'test_vector_field')
    @patch('create_index_aoss.VECTOR_DIMENSION', 1536)
    @patch('create_index_aoss.REGION_NAME', 'us-east-1')
    def test_opensearch_client_configuration(self, mock_cfn_send, mock_opensearch, create_event, lambda_context, aws_credentials):
        """Test OpenSearch client configuration."""
        # Mock OpenSearch client
        mock_client = MagicMock()
        mock_opensearch.return_value = mock_client
        mock_client.indices.create.return_value = {"acknowledged": True}
        mock_client.indices.get.return_value = {"test-vector-index": {}}
        
        create_index_aoss.lambda_handler(create_event, lambda_context)
        
        # Verify OpenSearch client configuration
        opensearch_call = mock_opensearch.call_args
        assert opensearch_call[1]['use_ssl'] is True
        assert opensearch_call[1]['verify_certs'] is True
        assert opensearch_call[1]['pool_maxsize'] == 20
        
        # Verify host configuration
        hosts = opensearch_call[1]['hosts']
        assert len(hosts) == 1
        assert hosts[0]['host'] == 'test-collection.us-east-1.aoss.amazonaws.com'
        assert hosts[0]['port'] == 443