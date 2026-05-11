"""
Chat history helper for DynamoDB operations.

IMPORTANT: DynamoDB attribute names used in this file must match the constants defined in:
- lib/chatbot-api/chat-history/chat-history.ts (CHAT_HISTORY_ATTRIBUTES)

Attribute names:
- PK: Partition key (user identifier)
- SK: Sort key (session identifier, e.g., CONV#<uuid>)
- GSI1PK: GSI partition key for cross-user queries
- DateModified: Timestamp of last modification (epoch seconds)
- MessageCount: Count of messages in the session
- History: Chat history JSON blob
- TTL: Time-to-live attribute (passed via ttl_column_name parameter)

Note on History size:
- Chat history is stored as a single JSON blob per session
- DynamoDB item size limit is 400KB
- This module checks size before write and raises ChatHistorySizeLimitError if exceeded
- For very long conversations, consider using chat_retention_in_minutes to auto-expire
- Users can also delete sessions via the REST API

Error Handling:
- ChatHistorySizeLimitError: Item exceeds 400KB limit (user should start new session)
- ChatHistoryStorageError: DynamoDB write failed (transient, response was delivered but not saved)
"""
import json
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Dict, Any, List, Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# DynamoDB item size limits (in bytes)
MAX_ITEM_SIZE_BYTES = 400 * 1024  # 400KB - DynamoDB hard limit
SIZE_WARNING_THRESHOLD_BYTES = 350 * 1024  # 350KB - warn before hitting limit


class ChatHistorySizeLimitError(Exception):
    """Raised when chat history exceeds DynamoDB's 400KB item size limit."""
    pass


class ChatHistoryStorageError(Exception):
    """Raised when chat history cannot be saved to DynamoDB (transient error)."""
    pass


@dataclass
class ChatMessage:
    """Data class for chat message updates to reduce parameter count."""
    user_id: str
    session_id: str
    content_id: str
    user_input: str
    ai_response: str
    model_id: str
    chat_history: List[Dict[str, Any]]
    parts: List[Dict[str, Any]]
    response_time_ms: Optional[int] = None


class ChatHistoryHelper:
    """Helper class for Chat History operations"""

    def __init__(self, table_name: str, chat_retention_in_minutes: int, ttl_column_name: str):
        self.table_name = table_name
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
        self.chat_retention_in_minutes = chat_retention_in_minutes
        self.ttl_column_name = ttl_column_name

    def get_chat_history(self, session_id: str, user_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve chat history from DynamoDB
        """
        response = self.table.get_item(
            Key={
                'PK': user_id,
                'SK': f"CONV#{session_id}",
            }
        )

        if 'Item' in response and 'History' in response['Item']:
            chat_history = json.loads(response['Item']['History'])
            return chat_history
        return []

    def store_chat_history(self, session_id: str, user_id: str, chat_history: List[Dict[str, Any]]):
        """
        Store chat history in DynamoDB.
        
        Raises:
            ChatHistorySizeLimitError: If the item size exceeds DynamoDB's 400KB limit.
            ChatHistoryStorageError: If DynamoDB write fails (transient error).
        """
        item = {
            'PK': user_id,
            'SK': f"CONV#{session_id}",
            'DateModified': int(time.time()),
            'History': json.dumps(chat_history),
            'MessageCount': len(chat_history),
            'GSI1PK': 'SESSION',
        }
        if self.chat_retention_in_minutes > 0:
            ttl = int(time.time()) + (self.chat_retention_in_minutes * 60)
            # noinspection PyTypeChecker
            item[self.ttl_column_name] = ttl
        
        # Check item size before write to provide clear error message
        item_size = len(json.dumps(item).encode('utf-8'))
        
        if item_size > MAX_ITEM_SIZE_BYTES:
            size_kb = item_size // 1024
            raise ChatHistorySizeLimitError(
                f"Session history exceeds DynamoDB's 400KB limit ({size_kb}KB). "
                "Please start a new session to continue."
            )
        
        if item_size > SIZE_WARNING_THRESHOLD_BYTES:
            size_kb = item_size // 1024
            logger.warning(
                f"Chat history approaching size limit: {size_kb}KB of 400KB. "
                f"Session: {session_id}, User: {user_id}"
            )
        
        try:
            self.table.put_item(Item=item)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            logger.error(
                f"DynamoDB error saving chat history: {error_code}. "
                f"Session: {session_id}, User: {user_id}"
            )
            raise ChatHistoryStorageError(
                f"Failed to save chat history due to database error ({error_code}). "
                "Your response was delivered but may not appear in history."
            )
        except Exception as e:
            logger.error(
                f"Unexpected error saving chat history: {type(e).__name__}. "
                f"Session: {session_id}, User: {user_id}"
            )
            raise ChatHistoryStorageError(
                "Failed to save chat history due to an unexpected error. "
                "Your response was delivered but may not appear in history."
            )

    def update_chat_history(self, message: ChatMessage) -> None:
        """
        Update chat history with new user and assistant messages.
        
        Args:
            message: ChatMessage dataclass containing all message details
        """
        # Generate unique message IDs
        user_message_id = str(uuid.uuid4())

        # Add human message
        message.chat_history.append({
            'role': 'user',
            'id': user_message_id,
            'data': {
                'content': message.user_input
            }
        })

        # Add AI message
        ai_message_data: Dict[str, Any] = {
            'role': 'assistant',
            'id': message.content_id,
            'data': {
                'content': message.ai_response,
                'parts': message.parts,
                'additional_kwargs': {
                    'modelId': message.model_id
                }
            }
        }

        # Add response time if provided
        if message.response_time_ms is not None:
            ai_message_data['data']['additional_kwargs']['responseTimeMs'] = message.response_time_ms

        message.chat_history.append(ai_message_data)
        self.store_chat_history(message.session_id, message.user_id, message.chat_history)
