# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for service interruption helper module.
Tests interruption checking, caching, and WebSocket response formatting.
"""

import json
import pytest
import time
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError

# Import the module under test
import sys
import os

import service_interruption_helper
from service_interruption_helper import (
    ServiceInterruptionHelper,
    check_service_interruption,
    create_interruption_websocket_response,
    _interruption_cache,
    _get_fallback_state
)


class TestServiceInterruptionHelper:
    """Test class for ServiceInterruptionHelper"""

    def setup_method(self):
        """Setup test fixtures"""
        # Clear cache before each test
        _interruption_cache['data'] = None
        _interruption_cache['last_checked'] = 0
        
        self.table_name = "test-interruption-table"
        self.service_type = "bedrock-rag"

    @patch.dict(os.environ, {'SERVICE_INTERRUPTION_TABLE_NAME': 'test-table'})
    @patch('service_interruption_helper.boto3.resource')
    def test_init_with_table_name(self, mock_boto3_resource):
        """Test initialization with table name"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        helper = ServiceInterruptionHelper(self.table_name)
        
        assert helper.table_name == self.table_name
        # Lazy initialization - table not accessed yet
        assert helper._table is None

    @patch.dict(os.environ, {}, clear=True)
    def test_init_without_table_name(self):
        """Test initialization without table name"""
        helper = ServiceInterruptionHelper()
        
        assert helper.table_name is None

    @patch('service_interruption_helper.boto3.resource')
    def test_query_dynamodb_service_specific_active(self, mock_boto3_resource):
        """Test querying DynamoDB for active service-specific interruption"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Mock active service-specific interruption
        mock_table.get_item.return_value = {
            'Item': {
                'id': self.service_type,
                'isActive': True,
                'message': 'Service under maintenance',
                'activatedAt': '2024-01-01T00:00:00Z',
                'activatedBy': 'admin',
                'reason': 'Scheduled maintenance'
            }
        }
        
        helper = ServiceInterruptionHelper(self.table_name)
        result = helper._query_dynamodb(self.service_type)
        
        assert result['is_active'] is True
        assert result['message'] == 'Service under maintenance'
        assert result['scope'] == 'service'
        assert result['service_type'] == self.service_type
        assert result['source'] == 'dynamodb'
        assert 'last_updated' in result

    @patch('service_interruption_helper.boto3.resource')
    def test_query_dynamodb_service_specific_inactive(self, mock_boto3_resource):
        """Test querying DynamoDB for inactive service-specific interruption"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Mock inactive service-specific interruption
        mock_table.get_item.side_effect = [
            {'Item': {'id': self.service_type, 'isActive': False}},
            {'Item': {'id': 'global', 'isActive': False}}
        ]
        
        helper = ServiceInterruptionHelper(self.table_name)
        result = helper._query_dynamodb(self.service_type)
        
        # Should fall through to global check and return inactive
        assert result['is_active'] is False

    @patch('service_interruption_helper.boto3.resource')
    def test_query_dynamodb_global_active(self, mock_boto3_resource):
        """Test querying DynamoDB for active global interruption"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # No service-specific, but global is active
        mock_table.get_item.side_effect = [
            {},  # No service-specific interruption
            {
                'Item': {
                    'id': 'global',
                    'isActive': True,
                    'message': 'System-wide maintenance',
                    'activatedAt': '2024-01-01T00:00:00Z',
                    'activatedBy': 'admin'
                }
            }
        ]
        
        helper = ServiceInterruptionHelper(self.table_name)
        result = helper._query_dynamodb(self.service_type)
        
        assert result['is_active'] is True
        assert result['message'] == 'System-wide maintenance'
        assert result['scope'] == 'global'
        assert result['service_type'] is None

    @patch('service_interruption_helper.boto3.resource')
    def test_query_dynamodb_no_interruption(self, mock_boto3_resource):
        """Test querying DynamoDB when no interruption exists"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # No interruptions found
        mock_table.get_item.return_value = {}
        
        helper = ServiceInterruptionHelper(self.table_name)
        result = helper._query_dynamodb(self.service_type)
        
        assert result['is_active'] is False
        assert result['scope'] == 'none'

    @patch('service_interruption_helper.boto3.resource')
    def test_query_dynamodb_client_error(self, mock_boto3_resource):
        """Test handling DynamoDB ClientError"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Mock ClientError
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'ResourceNotFoundException', 'Message': 'Table not found'}},
            'GetItem'
        )
        
        helper = ServiceInterruptionHelper(self.table_name)
        result = helper._query_dynamodb(self.service_type)
        
        # Should return fallback state
        assert result['source'] == 'environment'

    def test_get_fallback_state_enabled(self):
        """Test fallback state when enabled via environment"""
        # Patch the module-level variable that was set at import time
        with patch.object(service_interruption_helper, 'FALLBACK_ENABLED', True), \
             patch.object(service_interruption_helper, 'FALLBACK_MESSAGE', 'Service temporarily unavailable'):
            result = service_interruption_helper._get_fallback_state()
            
            assert result['is_active'] is True
        assert result['message'] == 'Service temporarily unavailable'
        assert result['scope'] == 'fallback'
        assert result['source'] == 'environment'

    @patch.dict(os.environ, {}, clear=True)
    def test_get_fallback_state_disabled(self):
        """Test fallback state when disabled"""
        result = service_interruption_helper._get_fallback_state()
        
        assert result['is_active'] is False
        assert result['scope'] == 'fallback'

    @patch('service_interruption_helper.time.time')
    @patch('service_interruption_helper.boto3.resource')
    def test_check_interruption_cache_hit(self, mock_boto3_resource, mock_time):
        """Test cache hit scenario"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Setup cache
        _interruption_cache['data'] = {
            'is_active': True,
            'message': 'Cached message',
            'source': 'dynamodb'
        }
        _interruption_cache['last_checked'] = 1000000
        
        # Current time is within TTL
        mock_time.return_value = 1000010  # 10 seconds later (< 30 sec TTL)
        
        helper = ServiceInterruptionHelper(self.table_name)
        is_active, data = helper.check_interruption(self.service_type)
        
        assert is_active is True
        assert data['message'] == 'Cached message'
        # DynamoDB should not be queried
        mock_table.get_item.assert_not_called()

    @patch('service_interruption_helper.time.time')
    @patch('service_interruption_helper.boto3.resource')
    def test_check_interruption_cache_miss(self, mock_boto3_resource, mock_time):
        """Test cache miss scenario"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Cache expired
        _interruption_cache['data'] = None
        _interruption_cache['last_checked'] = 0
        
        mock_time.return_value = 1000000
        
        # Mock DynamoDB response
        mock_table.get_item.return_value = {
            'Item': {
                'id': self.service_type,
                'isActive': True,
                'message': 'Fresh message'
            }
        }
        
        helper = ServiceInterruptionHelper(self.table_name)
        is_active, data = helper.check_interruption(self.service_type)
        
        assert is_active is True
        assert data['message'] == 'Fresh message'
        # DynamoDB should be queried
        mock_table.get_item.assert_called()
        # Cache should be updated
        assert _interruption_cache['data'] == data

    @patch('service_interruption_helper.time.time')
    @patch('service_interruption_helper.boto3.resource')
    def test_check_interruption_cache_expired(self, mock_boto3_resource, mock_time):
        """Test cache expiration scenario"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Setup cache with old data
        _interruption_cache['data'] = {'is_active': False}
        _interruption_cache['last_checked'] = 1000000
        
        # Current time is beyond TTL (default 30 seconds)
        mock_time.return_value = 1000040  # 40 seconds later
        
        mock_table.get_item.return_value = {
            'Item': {
                'id': self.service_type,
                'isActive': True,
                'message': 'Updated message'
            }
        }
        
        helper = ServiceInterruptionHelper(self.table_name)
        is_active, data = helper.check_interruption(self.service_type)
        
        assert is_active is True
        assert data['message'] == 'Updated message'
        # Cache should be refreshed
        assert _interruption_cache['last_checked'] == 1000040

    def test_create_interruption_response(self):
        """Test creating WebSocket interruption response"""
        helper = ServiceInterruptionHelper(self.table_name)
        
        interruption_data = {
            'is_active': True,
            'message': 'Service temporarily unavailable',
            'scope': 'service'
        }
        
        response = helper.create_interruption_response(
            interruption_data,
            'content-123'
        )
        
        assert response['id'] == 'content-123'
        assert response['content']['type'] == 'textDelta'
        assert response['content']['sequenceNumber'] == 1
        assert response['content']['text'] == 'Service temporarily unavailable'


class TestConvenienceFunctions:
    """Test convenience functions"""

    def setup_method(self):
        """Setup test fixtures"""
        _interruption_cache['data'] = None
        _interruption_cache['last_checked'] = 0

    @patch('service_interruption_helper.ServiceInterruptionHelper')
    def test_check_service_interruption(self, mock_helper_class):
        """Test check_service_interruption convenience function"""
        mock_helper = MagicMock()
        mock_helper.check_interruption.return_value = (True, {'message': 'Test'})
        mock_helper_class.return_value = mock_helper
        
        is_active, data = check_service_interruption('bedrock-rag', 'test-table')
        
        assert is_active is True
        assert data['message'] == 'Test'
        mock_helper_class.assert_called_once_with('test-table')
        mock_helper.check_interruption.assert_called_once_with('bedrock-rag')

    @patch('service_interruption_helper.ServiceInterruptionHelper')
    def test_create_interruption_websocket_response_function(self, mock_helper_class):
        """Test create_interruption_websocket_response convenience function"""
        mock_helper = MagicMock()
        mock_response = {'id': 'test', 'content': {}}
        mock_helper.create_interruption_response.return_value = mock_response
        mock_helper_class.return_value = mock_helper
        
        interruption_data = {'message': 'Test message'}
        response = create_interruption_websocket_response(
            interruption_data,
            'content-id'
        )
        
        assert response == mock_response
        mock_helper.create_interruption_response.assert_called_once_with(
            interruption_data, 'content-id'
        )


class TestServiceInterruptionHelperEdgeCases:
    """Test edge cases and error scenarios"""

    def setup_method(self):
        """Setup test fixtures"""
        _interruption_cache['data'] = None
        _interruption_cache['last_checked'] = 0

    def test_init_without_table_name_fallback_to_env(self):
        """Test initialization falls back to environment variable"""
        with patch.dict(os.environ, {'SERVICE_INTERRUPTION_TABLE_NAME': 'env-table'}):
            helper = ServiceInterruptionHelper()
            assert helper.table_name == 'env-table'

    @patch('service_interruption_helper.boto3.resource')
    def test_query_dynamodb_without_table(self, mock_boto3_resource):
        """Test querying DynamoDB without table configured"""
        # Clear the environment variable to ensure no table name
        with patch.dict(os.environ, {}, clear=True):
            # Re-import to get fresh instance without table name
            helper = ServiceInterruptionHelper(None)
            helper.table_name = None  # Explicitly set to None
            result = helper._query_dynamodb('service')
        
            # Should return fallback state since no table is configured
            assert result['source'] == 'environment'
            assert result['scope'] == 'fallback'

    @patch('service_interruption_helper.boto3.resource')
    def test_query_dynamodb_unexpected_exception(self, mock_boto3_resource):
        """Test handling unexpected exception during query"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Mock unexpected exception
        mock_table.get_item.side_effect = Exception('Unexpected error')
        
        helper = ServiceInterruptionHelper('test-table')
        result = helper._query_dynamodb('service')
        
        # Should return fallback state
        assert result['source'] == 'environment'

    @patch('service_interruption_helper.time.time')
    @patch('service_interruption_helper.boto3.resource')
    def test_check_interruption_multiple_service_types(self, mock_boto3_resource, mock_time):
        """Test checking different service types with caching"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        mock_time.return_value = 1000000
        
        mock_table.get_item.return_value = {
            'Item': {'id': 'service1', 'isActive': True, 'message': 'Test'}
        }
        
        helper = ServiceInterruptionHelper('test-table')
        
        # First call
        helper.check_interruption('service1')
        first_call_count = mock_table.get_item.call_count
        
        # Second call to same service (should use cache)
        helper.check_interruption('service1')
        assert mock_table.get_item.call_count == first_call_count
        
        # Call to different service (cache key is same, so still uses cache)
        helper.check_interruption('service2')
        assert mock_table.get_item.call_count == first_call_count

    def test_create_response_with_empty_message(self):
        """Test creating response with empty message"""
        helper = ServiceInterruptionHelper('test-table')
        
        interruption_data = {
            'is_active': True,
            'message': '',
            'scope': 'service'
        }
        
        response = helper.create_interruption_response(
            interruption_data, 'id'
        )
        
        assert response['content']['text'] == ''

    @patch.dict(os.environ, {'INTERRUPTION_CACHE_TTL': '60'})
    @patch('service_interruption_helper.time.time')
    @patch('service_interruption_helper.boto3.resource')
    def test_custom_cache_ttl(self, mock_boto3_resource, mock_time):
        """Test custom cache TTL from environment"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Setup cache
        _interruption_cache['data'] = {'is_active': False}
        _interruption_cache['last_checked'] = 1000000
        _interruption_cache['ttl'] = 60  # Custom TTL
        
        # Time is 50 seconds later (within 60 sec TTL)
        mock_time.return_value = 1000050
        
        helper = ServiceInterruptionHelper('test-table')
        helper.check_interruption('service')
        
        # Should use cache, not query DynamoDB
        mock_table.get_item.assert_not_called()


if __name__ == '__main__':
    pytest.main([__file__])