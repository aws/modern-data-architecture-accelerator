# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for chat history helper module.
Tests chat history retrieval, storage, and update functionality.
"""

import json
import pytest
import time
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock

# Import the module under test
import sys
import os

from chat_history_helpers import ChatHistoryHelper, ChatMessage, ChatHistorySizeLimitError, ChatHistoryStorageError, MAX_ITEM_SIZE_BYTES, SIZE_WARNING_THRESHOLD_BYTES


class TestChatHistoryHelper:
    """Test class for ChatHistoryHelper"""

    def setup_method(self):
        """Setup test fixtures"""
        self.table_name = "test-sessions-table"
        self.chat_retention = 60  # minutes
        self.ttl_column = "ttl"
        self.user_id = "test-user-123"
        self.session_id = "session-456"
        
        # Sample chat history
        self.sample_history = [
            {
                'role': 'user',
                'id': 'msg-1',
                'data': {
                    'content': 'Hello'
                }
            },
            {
                'role': 'assistant',
                'id': 'msg-2',
                'data': {
                    'content': 'Hi there!',
                    'parts': [],
                    'additional_kwargs': {
                        'modelId': 'claude-3-sonnet'
                    }
                }
            }
        ]

    @patch('chat_history_helpers.boto3.resource')
    def test_init_success(self, mock_boto3_resource):
        """Test successful ChatHistoryHelper initialization"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        helper = ChatHistoryHelper(
            table_name=self.table_name,
            chat_retention_in_minutes=self.chat_retention,
            ttl_column_name=self.ttl_column
        )
        
        assert helper.table_name == self.table_name
        assert helper.chat_retention_in_minutes == self.chat_retention
        assert helper.ttl_column_name == self.ttl_column
        mock_boto3_resource.assert_called_once_with('dynamodb')
        mock_dynamodb.Table.assert_called_once_with(self.table_name)

    @patch('chat_history_helpers.boto3.resource')
    def test_get_chat_history_with_existing_session(self, mock_boto3_resource):
        """Test retrieving chat history for existing session"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Mock DynamoDB response
        mock_table.get_item.return_value = {
            'Item': {
                'PK': self.user_id,
                'SK': f'CONV#{self.session_id}',
                'History': json.dumps(self.sample_history)
            }
        }
        
        helper = ChatHistoryHelper(self.table_name, self.chat_retention, self.ttl_column)
        result = helper.get_chat_history(self.session_id, self.user_id)
        
        assert result == self.sample_history
        assert len(result) == 2
        assert result[0]['role'] == 'user'
        assert result[1]['role'] == 'assistant'
        
        mock_table.get_item.assert_called_once_with(
            Key={
                'PK': self.user_id,
                'SK': f'CONV#{self.session_id}'
            }
        )

    @patch('chat_history_helpers.boto3.resource')
    def test_get_chat_history_no_existing_session(self, mock_boto3_resource):
        """Test retrieving chat history for non-existent session"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Mock DynamoDB response with no Item
        mock_table.get_item.return_value = {}
        
        helper = ChatHistoryHelper(self.table_name, self.chat_retention, self.ttl_column)
        result = helper.get_chat_history(self.session_id, self.user_id)
        
        assert result == []

    @patch('chat_history_helpers.boto3.resource')
    def test_get_chat_history_no_history_field(self, mock_boto3_resource):
        """Test retrieving chat history when Item exists but has no History field"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Mock DynamoDB response with Item but no History
        mock_table.get_item.return_value = {
            'Item': {
                'PK': self.user_id,
                'SK': f'CONV#{self.session_id}'
            }
        }
        
        helper = ChatHistoryHelper(self.table_name, self.chat_retention, self.ttl_column)
        result = helper.get_chat_history(self.session_id, self.user_id)
        
        assert result == []

    @patch('chat_history_helpers.time.time')
    @patch('chat_history_helpers.boto3.resource')
    def test_store_chat_history_with_ttl(self, mock_boto3_resource, mock_time):
        """Test storing chat history with TTL enabled"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        current_time = 1000000
        mock_time.return_value = current_time
        
        helper = ChatHistoryHelper(self.table_name, self.chat_retention, self.ttl_column)
        helper.store_chat_history(self.session_id, self.user_id, self.sample_history)
        
        expected_ttl = current_time + (self.chat_retention * 60)
        
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args[1]['Item']
        
        assert call_args['PK'] == self.user_id
        assert call_args['SK'] == f'CONV#{self.session_id}'
        assert call_args['DateModified'] == current_time
        assert call_args['History'] == json.dumps(self.sample_history)
        assert call_args['MessageCount'] == 2
        assert call_args['GSI1PK'] == 'SESSION'
        assert call_args[self.ttl_column] == expected_ttl

    @patch('chat_history_helpers.time.time')
    @patch('chat_history_helpers.boto3.resource')
    def test_store_chat_history_without_ttl(self, mock_boto3_resource, mock_time):
        """Test storing chat history without TTL"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        current_time = 1000000
        mock_time.return_value = current_time
        
        # Create helper with no retention (TTL disabled)
        helper = ChatHistoryHelper(self.table_name, -1, self.ttl_column)
        helper.store_chat_history(self.session_id, self.user_id, self.sample_history)
        
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args[1]['Item']
        
        # Verify TTL field is not present
        assert self.ttl_column not in call_args

    @patch('chat_history_helpers.uuid.uuid4')
    @patch('chat_history_helpers.boto3.resource')
    def test_update_chat_history_success(self, mock_boto3_resource, mock_uuid):
        """Test updating chat history with new messages"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Mock UUID for user message
        mock_uuid.return_value.__str__ = Mock(return_value='new-user-msg-id')
        
        helper = ChatHistoryHelper(self.table_name, self.chat_retention, self.ttl_column)
        
        # Create a spy to verify store_chat_history is called
        with patch.object(helper, 'store_chat_history') as mock_store:
            user_input = "What is the weather?"
            ai_response = "The weather is sunny"
            model_id = "claude-3-sonnet"
            content_id = "ai-msg-id"
            parts = [{'type': 'text', 'text': ai_response}]
            response_time_ms = 1500
            chat_history = []
            
            helper.update_chat_history(ChatMessage(
                user_id=self.user_id,
                session_id=self.session_id,
                content_id=content_id,
                user_input=user_input,
                ai_response=ai_response,
                model_id=model_id,
                chat_history=chat_history,
                parts=parts,
                response_time_ms=response_time_ms
            ))
            
            # Verify store_chat_history was called
            mock_store.assert_called_once()
            call_args = mock_store.call_args[0]
            
            assert call_args[0] == self.session_id
            assert call_args[1] == self.user_id
            
            # Check the chat history structure
            updated_history = call_args[2]
            assert len(updated_history) == 2
            
            # Verify user message
            user_msg = updated_history[0]
            assert user_msg['role'] == 'user'
            assert user_msg['id'] == 'new-user-msg-id'
            assert user_msg['data']['content'] == user_input
            
            # Verify AI message
            ai_msg = updated_history[1]
            assert ai_msg['role'] == 'assistant'
            assert ai_msg['id'] == content_id
            assert ai_msg['data']['content'] == ai_response
            assert ai_msg['data']['parts'] == parts
            assert ai_msg['data']['additional_kwargs']['modelId'] == model_id
            assert ai_msg['data']['additional_kwargs']['responseTimeMs'] == response_time_ms

    @patch('chat_history_helpers.uuid.uuid4')
    @patch('chat_history_helpers.boto3.resource')
    def test_update_chat_history_without_response_time(self, mock_boto3_resource, mock_uuid):
        """Test updating chat history without response time"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        mock_uuid.return_value.__str__ = Mock(return_value='msg-id')
        
        helper = ChatHistoryHelper(self.table_name, self.chat_retention, self.ttl_column)
        
        with patch.object(helper, 'store_chat_history') as mock_store:
            chat_history = []
            helper.update_chat_history(ChatMessage(
                user_id=self.user_id,
                session_id=self.session_id,
                content_id='content-id',
                user_input='user input',
                ai_response='ai response',
                model_id='model-id',
                chat_history=chat_history,
                parts=[],
                response_time_ms=None
            ))
            
            updated_history = mock_store.call_args[0][2]
            ai_msg = updated_history[1]
            
            # Verify responseTimeMs is not in additional_kwargs
            assert 'responseTimeMs' not in ai_msg['data']['additional_kwargs']

    @patch('chat_history_helpers.uuid.uuid4')
    @patch('chat_history_helpers.boto3.resource')
    def test_update_chat_history_appends_to_existing(self, mock_boto3_resource, mock_uuid):
        """Test that update_chat_history appends to existing history"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        mock_uuid.return_value.__str__ = Mock(return_value='new-msg-id')
        
        helper = ChatHistoryHelper(self.table_name, self.chat_retention, self.ttl_column)
        
        with patch.object(helper, 'store_chat_history') as mock_store:
            # Start with existing history
            existing_history = self.sample_history.copy()
            
            helper.update_chat_history(ChatMessage(
                user_id=self.user_id,
                session_id=self.session_id,
                content_id='new-content-id',
                user_input='new user input',
                ai_response='new ai response',
                model_id='model-id',
                chat_history=existing_history,
                parts=[],
                response_time_ms=1000
            ))
            
            updated_history = mock_store.call_args[0][2]
            
            # Should have original 2 messages + 2 new messages = 4 total
            assert len(updated_history) == 4
            assert updated_history[0] == self.sample_history[0]
            assert updated_history[1] == self.sample_history[1]
            assert updated_history[2]['role'] == 'user'
            assert updated_history[3]['role'] == 'assistant'


class TestChatHistoryHelperEdgeCases:
    """Test edge cases and error scenarios"""

    @patch('chat_history_helpers.boto3.resource')
    def test_empty_history_storage(self, mock_boto3_resource):
        """Test storing empty chat history"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        helper = ChatHistoryHelper("test-table", 60, "ttl")
        helper.store_chat_history("session-1", "user-1", [])
        
        call_args = mock_table.put_item.call_args[1]['Item']
        assert call_args['MessageCount'] == 0
        assert json.loads(call_args['History']) == []

    @patch('chat_history_helpers.boto3.resource')
    def test_malformed_json_in_history(self, mock_boto3_resource):
        """Test handling malformed JSON in History field"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Mock response with malformed JSON
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'user-1',
                'SK': 'CONV#session-1',
                'History': 'invalid json{{'
            }
        }
        
        helper = ChatHistoryHelper("test-table", 60, "ttl")
        
        # Should handle exception and return empty list
        with pytest.raises(json.JSONDecodeError):
            helper.get_chat_history("session-1", "user-1")


class TestChatHistorySizeLimit:
    """Test chat history size limit functionality"""

    def test_size_constants_are_reasonable(self):
        """Test that size constants are set correctly"""
        assert MAX_ITEM_SIZE_BYTES == 400 * 1024  # 400KB
        assert SIZE_WARNING_THRESHOLD_BYTES == 350 * 1024  # 350KB
        assert SIZE_WARNING_THRESHOLD_BYTES < MAX_ITEM_SIZE_BYTES

    @patch('chat_history_helpers.boto3.resource')
    def test_store_chat_history_raises_error_when_size_exceeded(self, mock_boto3_resource):
        """Test that ChatHistorySizeLimitError is raised when item exceeds 400KB"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        helper = ChatHistoryHelper("test-table", 60, "ttl")
        
        # Create a chat history that exceeds 400KB
        # Each message is roughly 100 bytes, so we need ~4100 messages to exceed 400KB
        large_history = []
        for i in range(5000):
            large_history.append({
                'role': 'user',
                'id': f'msg-{i}',
                'data': {'content': 'x' * 100}
            })
        
        with pytest.raises(ChatHistorySizeLimitError) as exc_info:
            helper.store_chat_history("session-1", "user-1", large_history)
        
        assert "400KB limit" in str(exc_info.value)
        assert "start a new session" in str(exc_info.value)
        
        # Verify put_item was NOT called
        mock_table.put_item.assert_not_called()

    @patch('chat_history_helpers.logger')
    @patch('chat_history_helpers.boto3.resource')
    def test_store_chat_history_logs_warning_when_approaching_limit(self, mock_boto3_resource, mock_logger):
        """Test that a warning is logged when item size approaches 400KB"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        helper = ChatHistoryHelper("test-table", 60, "ttl")
        
        # Create a chat history between 350KB and 400KB (warning threshold)
        # Each message is ~150 bytes, so 2400 messages = ~360KB
        large_history = []
        for i in range(2300):
            large_history.append({
                'role': 'user',
                'id': f'msg-{i}',
                'data': {'content': 'x' * 100}
            })
        
        helper.store_chat_history("session-1", "user-1", large_history)
        
        # Verify warning was logged
        mock_logger.warning.assert_called_once()
        warning_msg = mock_logger.warning.call_args[0][0]
        assert "approaching size limit" in warning_msg
        assert "session-1" in warning_msg
        
        # Verify put_item WAS called (not blocked, just warned)
        mock_table.put_item.assert_called_once()

    @patch('chat_history_helpers.boto3.resource')
    def test_store_chat_history_no_warning_for_small_history(self, mock_boto3_resource):
        """Test that no warning is logged for small chat histories"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        helper = ChatHistoryHelper("test-table", 60, "ttl")
        
        # Small history - well under threshold
        small_history = [
            {'role': 'user', 'id': 'msg-1', 'data': {'content': 'Hello'}},
            {'role': 'assistant', 'id': 'msg-2', 'data': {'content': 'Hi there!'}}
        ]
        
        with patch('chat_history_helpers.logger') as mock_logger:
            helper.store_chat_history("session-1", "user-1", small_history)
            mock_logger.warning.assert_not_called()
        
        mock_table.put_item.assert_called_once()

    def test_chat_history_size_limit_error_is_exception(self):
        """Test that ChatHistorySizeLimitError is a proper exception"""
        error = ChatHistorySizeLimitError("Test error message")
        assert isinstance(error, Exception)
        assert str(error) == "Test error message"

    def test_chat_history_storage_error_is_exception(self):
        """Test that ChatHistoryStorageError is a proper exception"""
        error = ChatHistoryStorageError("Test storage error")
        assert isinstance(error, Exception)
        assert str(error) == "Test storage error"


class TestChatHistoryStorageErrors:
    """Test DynamoDB error handling in store_chat_history"""

    @patch('chat_history_helpers.boto3.resource')
    def test_store_chat_history_raises_storage_error_on_client_error(self, mock_boto3_resource):
        """Test that ClientError from DynamoDB raises ChatHistoryStorageError"""
        from botocore.exceptions import ClientError
        
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Simulate DynamoDB ClientError
        mock_table.put_item.side_effect = ClientError(
            {'Error': {'Code': 'ProvisionedThroughputExceededException', 'Message': 'Rate exceeded'}},
            'PutItem'
        )
        
        helper = ChatHistoryHelper("test-table", 60, "ttl")
        small_history = [{'role': 'user', 'id': 'msg-1', 'data': {'content': 'Hello'}}]
        
        with pytest.raises(ChatHistoryStorageError) as exc_info:
            helper.store_chat_history("session-1", "user-1", small_history)
        
        assert "database error" in str(exc_info.value)
        assert "ProvisionedThroughputExceededException" in str(exc_info.value)
        assert "response was delivered" in str(exc_info.value)

    @patch('chat_history_helpers.boto3.resource')
    def test_store_chat_history_raises_storage_error_on_unexpected_error(self, mock_boto3_resource):
        """Test that unexpected errors raise ChatHistoryStorageError"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        # Simulate unexpected error
        mock_table.put_item.side_effect = RuntimeError("Unexpected failure")
        
        helper = ChatHistoryHelper("test-table", 60, "ttl")
        small_history = [{'role': 'user', 'id': 'msg-1', 'data': {'content': 'Hello'}}]
        
        with pytest.raises(ChatHistoryStorageError) as exc_info:
            helper.store_chat_history("session-1", "user-1", small_history)
        
        assert "unexpected error" in str(exc_info.value)
        assert "response was delivered" in str(exc_info.value)

    @patch('chat_history_helpers.logger')
    @patch('chat_history_helpers.boto3.resource')
    def test_store_chat_history_logs_error_on_client_error(self, mock_boto3_resource, mock_logger):
        """Test that ClientError is logged with error code"""
        from botocore.exceptions import ClientError
        
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb
        
        mock_table.put_item.side_effect = ClientError(
            {'Error': {'Code': 'ValidationException', 'Message': 'Invalid'}},
            'PutItem'
        )
        
        helper = ChatHistoryHelper("test-table", 60, "ttl")
        
        with pytest.raises(ChatHistoryStorageError):
            helper.store_chat_history("session-1", "user-1", [])
        
        mock_logger.error.assert_called_once()
        log_message = mock_logger.error.call_args[0][0]
        assert "ValidationException" in log_message
        assert "session-1" in log_message


if __name__ == '__main__':
    pytest.main([__file__])