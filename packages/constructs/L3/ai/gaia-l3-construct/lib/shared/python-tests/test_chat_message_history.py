"""
Unit tests for DynamoDBChatMessageHistory class.
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError
from langchain.schema.messages import HumanMessage, AIMessage
from langchain_core.messages.ai import AIMessageChunk

# Import the class under test
from genai_core.langchain.chat_message_history import DynamoDBChatMessageHistory


class TestDynamoDBChatMessageHistory:
    """Test cases for DynamoDBChatMessageHistory class."""

    @pytest.fixture
    def mock_table(self):
        """Mock DynamoDB table for testing."""
        return MagicMock()

    @pytest.fixture
    def chat_history(self, mock_table):
        """Create a DynamoDBChatMessageHistory instance for testing."""
        with patch('genai_core.langchain.chat_message_history.client') as mock_client:
            mock_client.Table.return_value = mock_table
            return DynamoDBChatMessageHistory(
                table_name="test-table",
                session_id="test-session-123",
                user_id="test-user-456"
            )

    def test_init(self, chat_history):
        """Test initialization of DynamoDBChatMessageHistory."""
        assert chat_history.session_id == "test-session-123"
        assert chat_history.user_id == "test-user-456"
        assert chat_history.table is not None

    def test_messages_property_with_existing_data(self, chat_history, mock_table):
        """Test retrieving messages when data exists in DynamoDB."""
        # Mock DynamoDB response with existing messages
        mock_response = {
            "Item": {
                "History": [
                    {
                        "type": "human",
                        "data": {"content": "Hello", "additional_kwargs": {}}
                    },
                    {
                        "type": "ai", 
                        "data": {"content": "Hi there!", "additional_kwargs": {}}
                    }
                ]
            }
        }
        mock_table.get_item.return_value = mock_response

        messages = chat_history.messages
        
        assert len(messages) == 2
        assert isinstance(messages[0], HumanMessage)
        assert messages[0].content == "Hello"
        assert isinstance(messages[1], AIMessage)
        assert messages[1].content == "Hi there!"
        
        mock_table.get_item.assert_called_once_with(
            Key={"SessionId": "test-session-123", "UserId": "test-user-456"}
        )

    def test_messages_property_with_no_data(self, chat_history, mock_table):
        """Test retrieving messages when no data exists in DynamoDB."""
        mock_table.get_item.return_value = {}
        
        messages = chat_history.messages
        
        assert messages == []
        mock_table.get_item.assert_called_once_with(
            Key={"SessionId": "test-session-123", "UserId": "test-user-456"}
        )

    def test_messages_property_with_resource_not_found(self, chat_history, mock_table):
        """Test retrieving messages when DynamoDB table doesn't exist."""
        error = ClientError(
            error_response={"Error": {"Code": "ResourceNotFoundException"}},
            operation_name="GetItem"
        )
        mock_table.get_item.side_effect = error
        
        messages = chat_history.messages
        
        assert messages == []

    def test_messages_property_with_other_client_error(self, chat_history, mock_table):
        """Test retrieving messages when other ClientError occurs."""
        error = ClientError(
            error_response={"Error": {"Code": "ValidationException"}},
            operation_name="GetItem"
        )
        mock_table.get_item.side_effect = error
        
        messages = chat_history.messages
        
        assert messages == []

    @patch('genai_core.langchain.chat_message_history.datetime')
    def test_add_message_human(self, mock_datetime, chat_history, mock_table):
        """Test adding a human message."""
        mock_datetime.now.return_value.isoformat.return_value = "2024-01-01T12:00:00"
        
        # Mock existing messages
        mock_table.get_item.return_value = {"Item": {"History": []}}
        
        human_message = HumanMessage(content="Hello, AI!")
        chat_history.add_message(human_message)
        
        # Verify put_item was called with correct structure
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args[1]["Item"]
        
        assert call_args["SessionId"] == "test-session-123"
        assert call_args["UserId"] == "test-user-456"
        assert call_args["StartTime"] == "2024-01-01T12:00:00"
        assert len(call_args["History"]) == 1
        assert call_args["History"][0]["type"] == "human"
        assert call_args["History"][0]["data"]["content"] == "Hello, AI!"

    @patch('genai_core.langchain.chat_message_history.datetime')
    def test_add_message_ai(self, mock_datetime, chat_history, mock_table):
        """Test adding an AI message."""
        mock_datetime.now.return_value.isoformat.return_value = "2024-01-01T12:00:00"
        
        # Mock existing messages
        mock_table.get_item.return_value = {"Item": {"History": []}}
        
        ai_message = AIMessage(content="Hello, human!")
        chat_history.add_message(ai_message)
        
        # Verify put_item was called with correct structure
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args[1]["Item"]
        
        assert call_args["History"][0]["type"] == "ai"
        assert call_args["History"][0]["data"]["content"] == "Hello, human!"

    @patch('genai_core.langchain.chat_message_history.datetime')
    def test_add_message_ai_chunk(self, mock_datetime, chat_history, mock_table):
        """Test adding an AI message chunk (streaming scenario)."""
        mock_datetime.now.return_value.isoformat.return_value = "2024-01-01T12:00:00"
        
        # Mock existing messages
        mock_table.get_item.return_value = {"Item": {"History": []}}
        
        # Create AI message chunk with text content
        ai_chunk = AIMessageChunk(content=[{"text": "Hello, "}, {"text": "world!"}])
        chat_history.add_message(ai_chunk)
        
        # Verify put_item was called with concatenated text
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args[1]["Item"]
        
        assert call_args["History"][0]["type"] == "ai"
        assert call_args["History"][0]["data"]["content"] == "Hello, world!"

    def test_add_message_with_client_error(self, chat_history, mock_table):
        """Test adding a message when DynamoDB put_item fails."""
        # Mock existing messages
        mock_table.get_item.return_value = {"Item": {"History": []}}
        
        # Mock ClientError on put_item
        error = ClientError(
            error_response={"Error": {"Code": "ValidationException"}},
            operation_name="PutItem"
        )
        mock_table.put_item.side_effect = error
        
        human_message = HumanMessage(content="Test message")
        
        # Should not raise exception, just log it
        chat_history.add_message(human_message)
        
        mock_table.put_item.assert_called_once()

    @patch('genai_core.langchain.chat_message_history.datetime')
    def test_add_metadata(self, mock_datetime, chat_history, mock_table):
        """Test adding metadata to the last message."""
        mock_datetime.now.return_value.isoformat.return_value = "2024-01-01T12:00:00"
        
        # Mock existing messages
        existing_history = [
            {
                "type": "human",
                "data": {"content": "Hello", "additional_kwargs": {}}
            }
        ]
        mock_table.get_item.return_value = {"Item": {"History": existing_history}}
        
        metadata = {"source": "web", "confidence": 0.95}
        chat_history.add_metadata(metadata)
        
        # Verify put_item was called with metadata added to last message
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args[1]["Item"]
        
        last_message = call_args["History"][0]
        assert last_message["data"]["additional_kwargs"]["source"] == "web"
        assert last_message["data"]["additional_kwargs"]["confidence"] == Decimal('0.95')

    def test_add_metadata_no_messages(self, chat_history, mock_table):
        """Test adding metadata when no messages exist."""
        # Mock no existing messages
        mock_table.get_item.return_value = {"Item": {"History": []}}
        
        metadata = {"source": "web"}
        chat_history.add_metadata(metadata)
        
        # Should not call put_item when no messages exist
        mock_table.put_item.assert_not_called()

    def test_add_metadata_with_exception(self, chat_history, mock_table):
        """Test adding metadata when put_item raises an exception."""
        # Mock existing messages
        existing_history = [
            {
                "type": "human",
                "data": {"content": "Hello", "additional_kwargs": {}}
            }
        ]
        mock_table.get_item.return_value = {"Item": {"History": existing_history}}
        
        # Mock exception on put_item
        mock_table.put_item.side_effect = Exception("DynamoDB error")
        
        metadata = {"source": "web"}
        
        # Should not raise exception, just log it
        chat_history.add_metadata(metadata)
        
        mock_table.put_item.assert_called_once()

    def test_clear(self, chat_history, mock_table):
        """Test clearing chat history."""
        chat_history.clear()
        
        mock_table.delete_item.assert_called_once_with(
            Key={"SessionId": "test-session-123", "UserId": "test-user-456"}
        )

    def test_clear_with_client_error(self, chat_history, mock_table):
        """Test clearing chat history when delete_item fails."""
        error = ClientError(
            error_response={"Error": {"Code": "ValidationException"}},
            operation_name="DeleteItem"
        )
        mock_table.delete_item.side_effect = error
        
        # Should not raise exception, just log it
        chat_history.clear()
        
        mock_table.delete_item.assert_called_once()

    @patch('genai_core.langchain.chat_message_history.datetime')
    def test_add_multiple_messages(self, mock_datetime, chat_history, mock_table):
        """Test adding multiple messages in sequence."""
        mock_datetime.now.return_value.isoformat.return_value = "2024-01-01T12:00:00"
        
        # Start with empty history
        mock_table.get_item.return_value = {"Item": {"History": []}}
        
        # Add first message
        human_message = HumanMessage(content="Hello")
        chat_history.add_message(human_message)
        
        # Mock updated history for second message
        updated_history = [
            {
                "type": "human",
                "data": {"content": "Hello", "additional_kwargs": {}}
            }
        ]
        mock_table.get_item.return_value = {"Item": {"History": updated_history}}
        
        # Add second message
        ai_message = AIMessage(content="Hi there!")
        chat_history.add_message(ai_message)
        
        # Verify both put_item calls
        assert mock_table.put_item.call_count == 2
        
        # Check the second call has both messages
        second_call_args = mock_table.put_item.call_args_list[1][1]["Item"]
        assert len(second_call_args["History"]) == 2
        assert second_call_args["History"][0]["data"]["content"] == "Hello"
        assert second_call_args["History"][1]["data"]["content"] == "Hi there!"