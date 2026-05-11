"""
Unit tests for sessions API routes.
Tests session retrieval, deletion, and admin functionality.
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock

# Import the module under test
import sys
import os

# Set required environment variables BEFORE importing the module
os.environ["SESSIONS_TABLE_NAME"] = "test-sessions-table"
os.environ["AWS_REGION"] = "us-east-1"


from routes.sessions import (
    get_session_for_user,
    parse_session_history,
    extract_session_title,
    list_sessions_by_user_id,
    delete_session_for_user,
    delete_user_sessions_for_user_id,
    get_sessions,
    get_session,
    delete_user_sessions,
    delete_session,
    get_user_session,
    admin_get_sessions,
    get_user_sessions,
    SessionNotFoundError,
    SessionAccessError,
    DEFAULT_SESSION_TITLE,
    router
)


class TestHelperFunctions:
    """Test helper functions for session management"""

    def setup_method(self):
        """Setup test fixtures"""
        self.mock_user_id = "test-user-123"
        self.mock_session_id = "session-456"
        
        self.mock_session_item = {
            "PK": self.mock_user_id,
            "SK": f"CONV#{self.mock_session_id}",
            "DateModified": 1689100200,
            "MessageCount": 5,
            "History": json.dumps([
                {
                    "id": "msg-1",
                    "role": "user",
                    "data": {
                        "content": "What is AWS Lambda?",
                        "parts": [],
                        "additional_kwargs": {}
                    }
                },
                {
                    "id": "msg-2",
                    "role": "assistant",
                    "data": {
                        "content": "AWS Lambda is a serverless compute service.",
                        "parts": [{"text": "AWS Lambda is a serverless compute service.", "citationSpans": []}],
                        "additional_kwargs": {"modelId": "claude-3-sonnet", "responseTimeMs": 1500}
                    }
                }
            ])
        }

    @patch('routes.sessions.table')
    def test_get_session_for_user_success(self, mock_table):
        """Test successful session retrieval"""
        mock_table.get_item.return_value = {"Item": self.mock_session_item}
        
        result = get_session_for_user(self.mock_user_id, self.mock_session_id)
        
        assert result is not None
        assert result["PK"] == self.mock_user_id
        assert result["SK"] == f"CONV#{self.mock_session_id}"
        
        mock_table.get_item.assert_called_once_with(
            Key={"PK": self.mock_user_id, "SK": f"CONV#{self.mock_session_id}"}
        )

    @patch('routes.sessions.table')
    def test_get_session_for_user_not_found(self, mock_table):
        """Test session retrieval when session doesn't exist"""
        mock_table.get_item.return_value = {}
        
        result = get_session_for_user(self.mock_user_id, self.mock_session_id)
        
        assert result is None

    @patch('routes.sessions.table')
    def test_get_session_for_user_resource_not_found(self, mock_table):
        """Test session retrieval when table doesn't exist"""
        from botocore.exceptions import ClientError
        
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'ResourceNotFoundException', 'Message': 'Table not found'}},
            'GetItem'
        )
        
        result = get_session_for_user(self.mock_user_id, self.mock_session_id)
        
        assert result is None

    @patch('routes.sessions.table')
    def test_get_session_for_user_dynamodb_error(self, mock_table):
        """Test session retrieval with DynamoDB error"""
        from botocore.exceptions import ClientError
        
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Test error'}},
            'GetItem'
        )
        
        with pytest.raises(SessionAccessError, match="Failed to retrieve session"):
            get_session_for_user(self.mock_user_id, self.mock_session_id)

    def test_parse_session_history_success(self):
        """Test successful history parsing"""
        history_json = json.dumps([
            {"id": "msg-1", "role": "user", "data": {"content": "Hello"}}
        ])
        
        result = parse_session_history(history_json)
        
        assert len(result) == 1
        assert result[0]["id"] == "msg-1"
        assert result[0]["role"] == "user"

    def test_parse_session_history_empty(self):
        """Test parsing empty history"""
        result = parse_session_history(None)
        assert result == []
        
        result = parse_session_history("")
        assert result == []

    def test_parse_session_history_invalid_json(self):
        """Test parsing invalid JSON"""
        result = parse_session_history("not valid json")
        assert result == []

    def test_parse_session_history_not_list(self):
        """Test parsing non-list JSON"""
        result = parse_session_history(json.dumps({"key": "value"}))
        assert result == []

    def test_extract_session_title_success(self):
        """Test successful title extraction"""
        history = [
            {"id": "msg-1", "role": "user", "data": {"content": "What is AWS Lambda?"}}
        ]
        
        result = extract_session_title(history)
        
        assert result == "What is AWS Lambda?"

    def test_extract_session_title_empty_history(self):
        """Test title extraction with empty history"""
        result = extract_session_title([])
        assert result == DEFAULT_SESSION_TITLE
        
        result = extract_session_title(None)
        assert result == DEFAULT_SESSION_TITLE

    def test_extract_session_title_no_content(self):
        """Test title extraction when content is missing"""
        history = [{"id": "msg-1", "role": "user", "data": {}}]
        
        result = extract_session_title(history)
        
        assert result == DEFAULT_SESSION_TITLE

    def test_extract_session_title_malformed_data(self):
        """Test title extraction with malformed data"""
        history = [{"id": "msg-1"}]  # Missing data field
        
        result = extract_session_title(history)
        
        assert result == DEFAULT_SESSION_TITLE

    @patch('routes.sessions.table')
    def test_list_sessions_by_user_id_success(self, mock_table):
        """Test successful session listing"""
        mock_table.query.return_value = {
            "Items": [self.mock_session_item],
            "LastEvaluatedKey": None
        }
        
        result = list_sessions_by_user_id(self.mock_user_id)
        
        assert len(result) == 1
        assert result[0]["PK"] == self.mock_user_id

    @patch('routes.sessions.table')
    def test_list_sessions_by_user_id_pagination(self, mock_table):
        """Test session listing with pagination"""
        mock_table.query.side_effect = [
            {
                "Items": [{"PK": self.mock_user_id, "SK": "CONV#session-1"}],
                "LastEvaluatedKey": {"PK": self.mock_user_id, "SK": "CONV#session-1"}
            },
            {
                "Items": [{"PK": self.mock_user_id, "SK": "CONV#session-2"}]
            }
        ]
        
        result = list_sessions_by_user_id(self.mock_user_id)
        
        assert len(result) == 2
        assert mock_table.query.call_count == 2

    @patch('routes.sessions.table')
    def test_list_sessions_by_user_id_empty(self, mock_table):
        """Test session listing when no sessions exist"""
        mock_table.query.return_value = {"Items": []}
        
        result = list_sessions_by_user_id(self.mock_user_id)
        
        assert result == []

    @patch('routes.sessions.table')
    def test_list_sessions_by_user_id_dynamodb_error(self, mock_table):
        """Test session listing with DynamoDB error"""
        from botocore.exceptions import ClientError
        
        mock_table.query.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Test error'}},
            'Query'
        )
        
        with pytest.raises(SessionAccessError, match="Failed to list sessions"):
            list_sessions_by_user_id(self.mock_user_id)

    @patch('routes.sessions.table')
    def test_delete_session_for_user_success(self, mock_table):
        """Test successful session deletion"""
        mock_table.delete_item.return_value = {}
        
        result = delete_session_for_user(self.mock_user_id, self.mock_session_id)
        
        assert result["id"] == self.mock_session_id
        assert result["deleted"] is True
        
        mock_table.delete_item.assert_called_once_with(
            Key={"PK": self.mock_user_id, "SK": f"CONV#{self.mock_session_id}"}
        )

    @patch('routes.sessions.table')
    def test_delete_session_for_user_not_found(self, mock_table):
        """Test session deletion when session doesn't exist"""
        from botocore.exceptions import ClientError
        
        mock_table.delete_item.side_effect = ClientError(
            {'Error': {'Code': 'ResourceNotFoundException', 'Message': 'Not found'}},
            'DeleteItem'
        )
        
        result = delete_session_for_user(self.mock_user_id, self.mock_session_id)
        
        assert result["id"] == self.mock_session_id
        assert result["deleted"] is False

    @patch('routes.sessions.table')
    def test_delete_session_for_user_dynamodb_error(self, mock_table):
        """Test session deletion with DynamoDB error"""
        from botocore.exceptions import ClientError
        
        mock_table.delete_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Test error'}},
            'DeleteItem'
        )
        
        result = delete_session_for_user(self.mock_user_id, self.mock_session_id)
        
        assert result["id"] == self.mock_session_id
        assert result["deleted"] is False

    @patch('routes.sessions.list_sessions_by_user_id')
    @patch('routes.sessions.delete_session_for_user')
    def test_delete_user_sessions_for_user_id_success(self, mock_delete, mock_list):
        """Test deleting all sessions for a user"""
        mock_list.return_value = [
            {"SK": "CONV#session-1"},
            {"SK": "CONV#session-2"}
        ]
        mock_delete.side_effect = [
            {"id": "session-1", "deleted": True},
            {"id": "session-2", "deleted": True}
        ]
        
        result = delete_user_sessions_for_user_id(self.mock_user_id)
        
        assert len(result) == 2
        assert all(r["deleted"] for r in result)


class TestUserEndpoints:
    """Test user-facing session endpoints"""

    def setup_method(self):
        """Setup test fixtures"""
        self.mock_user_id = "test-user-123"
        self.mock_session_id = "session-456"

    @patch('routes.sessions.get_user_id')
    @patch('routes.sessions.list_sessions_by_user_id')
    def test_get_sessions_success(self, mock_list, mock_get_user_id):
        """Test successful session list retrieval"""
        mock_get_user_id.return_value = self.mock_user_id
        mock_list.return_value = [
            {
                "PK": self.mock_user_id,
                "SK": f"CONV#{self.mock_session_id}",
                "DateModified": 1689100200,
                "History": json.dumps([
                    {"id": "msg-1", "role": "user", "data": {"content": "Hello world"}}
                ])
            }
        ]
        
        result = get_sessions()
        
        assert len(result) == 1
        assert result[0]["id"] == self.mock_session_id
        assert result[0]["title"] == "Hello world"
        assert result[0]["dateModified"] == 1689100200

    @patch('routes.sessions.get_user_id')
    def test_get_sessions_no_auth(self, mock_get_user_id):
        """Test session list without authentication"""
        mock_get_user_id.return_value = None
        
        result = get_sessions()
        
        assert result.status_code == 401
        assert "User not found" in result.body

    @patch('routes.sessions.get_user_id')
    @patch('routes.sessions.list_sessions_by_user_id')
    def test_get_sessions_access_error(self, mock_list, mock_get_user_id):
        """Test session list with access error"""
        mock_get_user_id.return_value = self.mock_user_id
        mock_list.side_effect = SessionAccessError("Failed to retrieve sessions")
        
        result = get_sessions()
        
        assert result.status_code == 500
        assert "Failed to retrieve sessions" in result.body

    @patch('routes.sessions.get_user_id')
    @patch('routes.sessions.get_session_for_user')
    def test_get_session_success(self, mock_get_session, mock_get_user_id):
        """Test successful single session retrieval"""
        mock_get_user_id.return_value = self.mock_user_id
        mock_get_session.return_value = {
            "PK": self.mock_user_id,
            "SK": f"CONV#{self.mock_session_id}",
            "DateModified": 1689100200,
            "History": json.dumps([
                {
                    "id": "msg-1",
                    "role": "user",
                    "data": {
                        "content": "What is Lambda?",
                        "parts": [],
                        "additional_kwargs": {}
                    }
                },
                {
                    "id": "msg-2",
                    "role": "assistant",
                    "data": {
                        "content": "Lambda is serverless.",
                        "parts": [{"text": "Lambda is serverless.", "citationSpans": []}],
                        "additional_kwargs": {"modelId": "claude-3", "responseTimeMs": 1000}
                    }
                }
            ])
        }
        
        result = get_session(self.mock_session_id)
        
        assert result["id"] == self.mock_session_id
        assert result["title"] == "What is Lambda?"
        assert result["userId"] == self.mock_user_id
        assert len(result["history"]) == 2
        assert result["history"][1]["metadata"]["modelId"] == "claude-3"

    @patch('routes.sessions.get_user_id')
    def test_get_session_no_auth(self, mock_get_user_id):
        """Test single session retrieval without authentication"""
        mock_get_user_id.return_value = None
        
        result = get_session(self.mock_session_id)
        
        assert result.status_code == 401
        assert "User not found" in result.body

    @patch('routes.sessions.get_user_id')
    @patch('routes.sessions.get_session_for_user')
    def test_get_session_not_found(self, mock_get_session, mock_get_user_id):
        """Test single session retrieval when session doesn't exist"""
        mock_get_user_id.return_value = self.mock_user_id
        mock_get_session.return_value = None
        
        result = get_session(self.mock_session_id)
        
        # Returns None for new sessions (UI behavior)
        assert result is None

    @patch('routes.sessions.get_user_id')
    @patch('routes.sessions.get_session_for_user')
    def test_get_session_access_error(self, mock_get_session, mock_get_user_id):
        """Test single session retrieval with access error"""
        mock_get_user_id.return_value = self.mock_user_id
        mock_get_session.side_effect = SessionAccessError("Failed to retrieve session")
        
        result = get_session(self.mock_session_id)
        
        assert result.status_code == 500
        assert "Failed to retrieve session" in result.body

    @patch('routes.sessions.get_user_id')
    @patch('routes.sessions.delete_user_sessions_for_user_id')
    def test_delete_user_sessions_success(self, mock_delete, mock_get_user_id):
        """Test successful deletion of all user sessions"""
        mock_get_user_id.return_value = self.mock_user_id
        mock_delete.return_value = [
            {"id": "session-1", "deleted": True},
            {"id": "session-2", "deleted": True}
        ]
        
        result = delete_user_sessions()
        
        assert len(result) == 2
        assert all(r["deleted"] for r in result)

    @patch('routes.sessions.get_user_id')
    def test_delete_user_sessions_no_auth(self, mock_get_user_id):
        """Test deletion of all sessions without authentication"""
        mock_get_user_id.return_value = None
        
        result = delete_user_sessions()
        
        assert result.status_code == 401
        assert "User not found" in result.body

    @patch('routes.sessions.get_user_id')
    @patch('routes.sessions.delete_session_for_user')
    def test_delete_session_success(self, mock_delete, mock_get_user_id):
        """Test successful single session deletion"""
        mock_get_user_id.return_value = self.mock_user_id
        mock_delete.return_value = {"id": self.mock_session_id, "deleted": True}
        
        result = delete_session(self.mock_session_id)
        
        assert result["id"] == self.mock_session_id
        assert result["deleted"] is True

    @patch('routes.sessions.get_user_id')
    def test_delete_session_no_auth(self, mock_get_user_id):
        """Test single session deletion without authentication"""
        mock_get_user_id.return_value = None
        
        result = delete_session(self.mock_session_id)
        
        assert result.status_code == 401
        assert "User not found" in result.body


class TestAdminEndpoints:
    """Test admin session endpoints"""

    def setup_method(self):
        """Setup test fixtures"""
        self.mock_user_id = "test-user-123"
        self.mock_session_id = "session-456"
        os.environ["ADMIN_GROUP"] = "admin"

    def teardown_method(self):
        """Cleanup after tests"""
        if "ADMIN_GROUP" in os.environ:
            del os.environ["ADMIN_GROUP"]

    @patch('routes.sessions.is_admin')
    @patch('routes.sessions.get_session_for_user')
    def test_get_user_session_success(self, mock_get_session, mock_is_admin):
        """Test successful admin session retrieval"""
        mock_is_admin.return_value = True
        mock_get_session.return_value = {
            "PK": self.mock_user_id,
            "SK": f"CONV#{self.mock_session_id}",
            "DateModified": 1689100200,
            "History": json.dumps([
                {"id": "msg-1", "role": "user", "data": {"content": "Test question"}}
            ])
        }
        
        result = get_user_session(self.mock_user_id, self.mock_session_id)
        
        assert result["id"] == self.mock_session_id
        assert result["userId"] == self.mock_user_id
        assert result["title"] == "Test question"

    @patch('routes.sessions.is_admin')
    def test_get_user_session_not_admin(self, mock_is_admin):
        """Test admin session retrieval by non-admin"""
        mock_is_admin.return_value = False
        
        result = get_user_session(self.mock_user_id, self.mock_session_id)
        
        assert result.status_code == 403
        assert "Admin privileges required" in result.body

    def test_get_user_session_admin_not_configured(self):
        """Test admin session retrieval when ADMIN_GROUP not configured"""
        del os.environ["ADMIN_GROUP"]
        
        result = get_user_session(self.mock_user_id, self.mock_session_id)
        
        assert result.status_code == 501
        assert "ADMIN_GROUP not configured" in result.body

    @patch('routes.sessions.is_admin')
    @patch('routes.sessions.get_session_for_user')
    def test_get_user_session_not_found(self, mock_get_session, mock_is_admin):
        """Test admin session retrieval when session doesn't exist"""
        mock_is_admin.return_value = True
        mock_get_session.return_value = None
        
        result = get_user_session(self.mock_user_id, self.mock_session_id)
        
        assert result.status_code == 404
        assert "Session not found" in result.body

    @patch('routes.sessions.is_admin')
    @patch('routes.sessions.get_session_for_user')
    def test_get_user_session_access_error(self, mock_get_session, mock_is_admin):
        """Test admin session retrieval with access error"""
        mock_is_admin.return_value = True
        mock_get_session.side_effect = SessionAccessError("Failed to retrieve session")
        
        result = get_user_session(self.mock_user_id, self.mock_session_id)
        
        assert result.status_code == 500
        assert "Failed to retrieve session" in result.body


    @patch('routes.sessions.is_admin')
    @patch('routes.sessions.table')
    def test_admin_get_sessions_success(self, mock_table, mock_is_admin):
        """Test successful admin sessions listing"""
        mock_is_admin.return_value = True
        mock_table.query.return_value = {
            "Items": [
                {
                    "PK": self.mock_user_id,
                    "SK": f"CONV#{self.mock_session_id}",
                    "DateModified": 1689100200,
                    "MessageCount": 5
                }
            ]
        }
        
        router.current_event = {
            "queryStringParameters": {}
        }
        
        result = admin_get_sessions()
        
        assert "sessions" in result
        assert len(result["sessions"]) == 1
        assert result["sessions"][0]["user_id"] == self.mock_user_id
        assert result["sessions"][0]["session_id"] == self.mock_session_id

    @patch('routes.sessions.is_admin')
    def test_admin_get_sessions_not_admin(self, mock_is_admin):
        """Test admin sessions listing by non-admin"""
        mock_is_admin.return_value = False
        
        router.current_event = {
            "queryStringParameters": {}
        }
        
        result = admin_get_sessions()
        
        assert result.status_code == 403
        assert "Admin privileges required" in result.body

    def test_admin_get_sessions_admin_not_configured(self):
        """Test admin sessions listing when ADMIN_GROUP not configured"""
        del os.environ["ADMIN_GROUP"]
        
        router.current_event = {
            "queryStringParameters": {}
        }
        
        result = admin_get_sessions()
        
        assert result.status_code == 501
        assert "ADMIN_GROUP not configured" in result.body

    @patch('routes.sessions.is_admin')
    @patch('routes.sessions.table')
    def test_admin_get_sessions_with_date_range(self, mock_table, mock_is_admin):
        """Test admin sessions listing with date range filter"""
        mock_is_admin.return_value = True
        mock_table.query.return_value = {"Items": []}
        
        router.current_event = {
            "queryStringParameters": {
                "start_date": "2023-07-01",
                "end_date": "2023-07-31"
            }
        }
        
        result = admin_get_sessions()
        
        assert "sessions" in result
        # Verify query was called with date range
        call_kwargs = mock_table.query.call_args[1]
        assert ":start_date" in call_kwargs["ExpressionAttributeValues"]
        assert ":end_date" in call_kwargs["ExpressionAttributeValues"]

    @patch('routes.sessions.is_admin')
    def test_admin_get_sessions_invalid_date_format(self, mock_is_admin):
        """Test admin sessions listing with invalid date format"""
        mock_is_admin.return_value = True
        
        router.current_event = {
            "queryStringParameters": {
                "start_date": "invalid-date",
                "end_date": "2023-07-31"
            }
        }
        
        result = admin_get_sessions()
        
        assert result.status_code == 400
        assert "Invalid date format" in result.body

    @patch('routes.sessions.is_admin')
    @patch('routes.sessions.table')
    def test_admin_get_sessions_with_pagination(self, mock_table, mock_is_admin):
        """Test admin sessions listing with pagination"""
        mock_is_admin.return_value = True
        mock_table.query.return_value = {
            "Items": [{"PK": "user-1", "SK": "CONV#session-1", "DateModified": 1689100200}],
            "LastEvaluatedKey": {"PK": "user-1", "SK": "CONV#session-1", "GSI1PK": "SESSION", "DateModified": 1689100200}
        }
        
        router.current_event = {
            "queryStringParameters": {"limit": "10"}
        }
        
        result = admin_get_sessions()
        
        assert "sessions" in result
        assert "next_token" in result

    @patch('routes.sessions.is_admin')
    def test_admin_get_sessions_invalid_next_token(self, mock_is_admin):
        """Test admin sessions listing with invalid pagination token"""
        mock_is_admin.return_value = True
        
        router.current_event = {
            "queryStringParameters": {
                "next_token": "invalid-token"
            }
        }
        
        result = admin_get_sessions()
        
        assert result.status_code == 400
        assert "Invalid next_token" in result.body

    @patch('routes.sessions.is_admin')
    @patch('routes.sessions.table')
    def test_admin_get_sessions_dynamodb_error(self, mock_table, mock_is_admin):
        """Test admin sessions listing with DynamoDB error"""
        from botocore.exceptions import ClientError
        
        mock_is_admin.return_value = True
        mock_table.query.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Test error'}},
            'Query'
        )
        
        router.current_event = {
            "queryStringParameters": {}
        }
        
        result = admin_get_sessions()
        
        assert result.status_code == 500
        assert "Failed to retrieve sessions" in result.body

    @patch('routes.sessions.is_admin')
    @patch('routes.sessions.list_sessions_by_user_id')
    def test_get_user_sessions_success(self, mock_list, mock_is_admin):
        """Test successful admin user sessions listing"""
        mock_is_admin.return_value = True
        mock_list.return_value = [
            {
                "PK": self.mock_user_id,
                "SK": f"CONV#{self.mock_session_id}",
                "DateModified": 1689100200,
                "History": json.dumps([
                    {"id": "msg-1", "role": "user", "data": {"content": "Test"}}
                ])
            }
        ]
        
        result = get_user_sessions(self.mock_user_id)
        
        assert len(result) == 1
        assert result[0]["id"] == self.mock_session_id
        assert result[0]["userId"] == self.mock_user_id

    @patch('routes.sessions.is_admin')
    def test_get_user_sessions_not_admin(self, mock_is_admin):
        """Test admin user sessions listing by non-admin"""
        mock_is_admin.return_value = False
        
        result = get_user_sessions(self.mock_user_id)
        
        assert result.status_code == 403
        assert "Admin privileges required" in result.body

    def test_get_user_sessions_admin_not_configured(self):
        """Test admin user sessions listing when ADMIN_GROUP not configured"""
        del os.environ["ADMIN_GROUP"]
        
        result = get_user_sessions(self.mock_user_id)
        
        assert result.status_code == 501
        assert "ADMIN_GROUP not configured" in result.body

    @patch('routes.sessions.is_admin')
    @patch('routes.sessions.list_sessions_by_user_id')
    def test_get_user_sessions_empty(self, mock_list, mock_is_admin):
        """Test admin user sessions listing when no sessions exist"""
        mock_is_admin.return_value = True
        mock_list.return_value = []
        
        result = get_user_sessions(self.mock_user_id)
        
        assert result == []

    @patch('routes.sessions.is_admin')
    @patch('routes.sessions.list_sessions_by_user_id')
    def test_get_user_sessions_access_error(self, mock_list, mock_is_admin):
        """Test admin user sessions listing with access error"""
        mock_is_admin.return_value = True
        mock_list.side_effect = SessionAccessError("Failed to retrieve sessions")
        
        result = get_user_sessions(self.mock_user_id)
        
        assert result.status_code == 500
        assert "Failed to retrieve sessions" in result.body


class TestEdgeCases:
    """Test edge cases and error scenarios"""

    def setup_method(self):
        """Setup test fixtures"""
        self.mock_user_id = "test-user-123"

    def test_parse_session_history_with_complex_data(self):
        """Test parsing history with complex nested data"""
        history_json = json.dumps([
            {
                "id": "msg-1",
                "role": "assistant",
                "data": {
                    "content": "Here's the answer",
                    "parts": [
                        {
                            "text": "Here's the answer",
                            "citationSpans": [
                                {"start": 0, "end": 5, "sourceIndex": 0}
                            ]
                        }
                    ],
                    "additional_kwargs": {
                        "modelId": "claude-3-sonnet",
                        "responseTimeMs": 2500,
                        "sources": [{"title": "Doc 1", "url": "https://example.com"}]
                    }
                }
            }
        ])
        
        result = parse_session_history(history_json)
        
        assert len(result) == 1
        assert result[0]["data"]["parts"][0]["citationSpans"][0]["sourceIndex"] == 0
        assert result[0]["data"]["additional_kwargs"]["sources"][0]["title"] == "Doc 1"

    def test_extract_session_title_with_empty_content(self):
        """Test title extraction when content is empty string"""
        history = [{"id": "msg-1", "role": "user", "data": {"content": ""}}]
        
        result = extract_session_title(history)
        
        assert result == DEFAULT_SESSION_TITLE

    def test_extract_session_title_with_none_content(self):
        """Test title extraction when content is None"""
        history = [{"id": "msg-1", "role": "user", "data": {"content": None}}]
        
        result = extract_session_title(history)
        
        assert result == DEFAULT_SESSION_TITLE

    @patch('routes.sessions.table')
    def test_list_sessions_resource_not_found(self, mock_table):
        """Test session listing when table doesn't exist"""
        from botocore.exceptions import ClientError
        
        mock_table.query.side_effect = ClientError(
            {'Error': {'Code': 'ResourceNotFoundException', 'Message': 'Table not found'}},
            'Query'
        )
        
        result = list_sessions_by_user_id(self.mock_user_id)
        
        assert result == []


if __name__ == '__main__':
    pytest.main([__file__])
