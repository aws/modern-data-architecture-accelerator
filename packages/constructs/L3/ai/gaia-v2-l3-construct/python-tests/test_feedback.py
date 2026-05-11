"""
Unit tests for feedback API routes.
Tests feedback submission, history retrieval, and pagination functionality.
"""

import json
import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock

# Import the module under test
import sys
import os

# Set required environment variables BEFORE importing the module
os.environ["FEEDBACK_REASONS"] = "accuracy,unhelpful,app_issue,other"
os.environ["FEEDBACK_TABLE_NAME"] = "test-feedback-table"
os.environ["AWS_REGION"] = "us-east-1"


from routes.feedback import (
    submit_feedback,
    get_feedback_history,
    save_feedback,
    get_user_feedback_history,
    get_user_id,
    ValidationError,
    FeedbackError,
    router
)


class TestFeedbackRoutes:
    """Test class for feedback API routes"""

    def setup_method(self):
        """Setup test fixtures"""
        self.mock_user_id = "test-user-123"
        self.mock_session_id = "session-456"
        self.mock_message_id = "message-789"
        self.mock_feedback_id = "feedback-abc"
        
        self.valid_feedback_data = {
            "session_id": self.mock_session_id,
            "message_id": self.mock_message_id,
            "rating": "thumbs_up",
            "reason": "accuracy",
            "text_feedback": "This response was helpful!",
            "response_time_ms": 1500,
            "model_used": "claude-3-sonnet:1"  # Must match pattern ^[a-zA-Z0-9_.-]+:[0-9]+$
        }
        
        # Patch environment variable for feedback reasons
        os.environ["FEEDBACK_REASONS"] = "accuracy,unhelpful,app_issue,other"

    @patch('routes.feedback.feedback_table')
    @patch('routes.feedback.uuid.uuid4')
    @patch('routes.feedback.datetime')
    def test_save_feedback_success(self, mock_datetime, mock_uuid, mock_table):
        """Test successful feedback saving"""
        # Setup mocks
        mock_uuid.return_value = MagicMock()
        mock_uuid.return_value.__str__ = Mock(return_value=self.mock_feedback_id)
        
        mock_timestamp = datetime(2023, 7, 11, 17, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_timestamp
        mock_datetime.timezone = timezone
        
        mock_table.put_item.return_value = {}
        
        # Execute
        result = save_feedback(self.mock_user_id, self.valid_feedback_data)
        
        # Verify
        assert result['feedback_id'] == self.mock_feedback_id
        assert result['user_id'] == self.mock_user_id
        assert result['rating'] == 'thumbs_up'
        assert 'created_at' in result
        
        # Verify DynamoDB put_item was called
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args[1]['Item']
        
        assert call_args['PK'] == 'FEEDBACK'
        assert 'SK' in call_args  # SK is the ISO timestamp
        assert call_args['rating'] == 'thumbs_up'
        assert call_args['text_feedback'] == 'This response was helpful!'
        assert call_args['model_used'] == 'claude-3-sonnet:1'
        assert call_args['response_time_ms'] == 1500

    def test_validate_feedback_data_missing_required_fields(self):
        """Test feedback validation with missing required fields"""
        incomplete_data = {
            "session_id": self.mock_session_id,
            # Missing message_id, rating, and reason
        }
        
        with pytest.raises(ValidationError, match="message_id is required"):
            from routes.feedback import validate_feedback_data
            validate_feedback_data(incomplete_data)

    def test_validate_feedback_data_invalid_rating(self):
        """Test feedback validation with invalid rating"""
        invalid_data = self.valid_feedback_data.copy()
        invalid_data['rating'] = 'invalid_rating'
        
        with pytest.raises(ValidationError, match="rating must be one of"):
            from routes.feedback import validate_feedback_data
            validate_feedback_data(invalid_data)

    def test_validate_feedback_data_invalid_reason(self):
        """Test feedback validation with invalid reason for thumbs_down"""
        invalid_data = self.valid_feedback_data.copy()
        invalid_data['rating'] = 'thumbs_down'  # reason is only validated for thumbs_down
        invalid_data['reason'] = 'invalid_reason'
        del invalid_data['model_used']  # Remove model_used to test reason validation
        
        with pytest.raises(ValidationError, match="reason must be one of"):
            from routes.feedback import validate_feedback_data
            validate_feedback_data(invalid_data)

    @patch('routes.feedback.feedback_table')
    def test_get_user_feedback_history_success(self, mock_table):
        """Test successful feedback history retrieval"""
        mock_items = [
            {
                'feedback_id': 'feedback-1',
                'user_id': self.mock_user_id,
                'session_id': 'session-1',
                'message_id': 'message-1',
                'rating': 'thumbs_up',
                'reason': 'accuracy',
                'text_feedback': 'Great!',
                'model_used': 'claude-3-sonnet',
                'response_time_ms': 1500,
                'created_at': '2023-07-11T17:30:00.123456+00:00'
            }
        ]
        
        mock_table.query.return_value = {
            'Items': mock_items
        }
        
        result = get_user_feedback_history(self.mock_user_id, 50)
        
        assert len(result['items']) == 1
        assert 'next_token' not in result
        
        item = result['items'][0]
        assert item['feedback_id'] == 'feedback-1'
        assert item['rating'] == 'thumbs_up'
        assert item['reason'] == 'accuracy'
        assert item['created_at'] == '2023-07-11T17:30:00.123456+00:00'

    @patch('routes.feedback.feedback_table')
    def test_get_user_feedback_history_with_pagination(self, mock_table):
        """Test feedback history retrieval with pagination"""
        mock_items = [{'feedback_id': 'feedback-1'}]
        mock_last_key = {
            'PK': f'USER#{self.mock_user_id}',
            'SK': 'FEEDBACK#2023-07-11T17:30:00.123456+00:00#feedback-1'
        }
        
        mock_table.query.return_value = {
            'Items': mock_items,
            'LastEvaluatedKey': mock_last_key
        }
        
        result = get_user_feedback_history(self.mock_user_id, 50)
        
        assert 'next_token' in result
        assert result['next_token'] == mock_last_key['SK']

    @patch('routes.feedback.feedback_table')
    def test_get_user_feedback_history_with_next_token(self, mock_table):
        """Test feedback history retrieval using next_token"""
        next_token = 'FEEDBACK#2023-07-11T17:30:00.123456+00:00#feedback-1'
        
        mock_table.query.return_value = {
            'Items': [],
        }
        
        result = get_user_feedback_history(self.mock_user_id, 50, next_token)
        
        # Verify query was called with ExclusiveStartKey
        mock_table.query.assert_called_once()
        call_kwargs = mock_table.query.call_args[1]
        assert 'ExclusiveStartKey' in call_kwargs
        assert call_kwargs['ExclusiveStartKey']['PK'] == 'FEEDBACK'
        assert call_kwargs['ExclusiveStartKey']['SK'] == next_token

    def test_get_user_id_success(self):
        """Test successful user ID extraction from router context"""
        mock_router = Mock()
        mock_router.current_event = {
            'requestContext': {
                'authorizer': {
                    'claims': {
                        'sub': self.mock_user_id
                    }
                }
            }
        }
        
        result = get_user_id(mock_router)
        assert result == self.mock_user_id

    def test_get_user_id_missing_context(self):
        """Test user ID extraction with missing context"""
        mock_router = Mock()
        mock_router.current_event = {}
        
        result = get_user_id(mock_router)
        assert result is None

    @patch('routes.feedback.get_user_id')
    @patch('routes.feedback.save_feedback')
    def test_submit_feedback_endpoint_success(self, mock_save_feedback, mock_get_user_id):
        """Test submit_feedback endpoint success"""
        mock_get_user_id.return_value = self.mock_user_id
        mock_save_feedback.return_value = {
            'feedback_id': self.mock_feedback_id,
            'user_id': self.mock_user_id,
            'rating': 'thumbs_up',
            'created_at': '2023-07-11T17:30:00.123456+00:00'
        }
        
        # Mock router event
        router.current_event = {
            'body': json.dumps(self.valid_feedback_data)
        }
        
        result = submit_feedback()
        
        assert result['feedback_id'] == self.mock_feedback_id
        assert result['rating'] == 'thumbs_up'

    @patch('routes.feedback.get_user_id')
    def test_submit_feedback_endpoint_no_auth(self, mock_get_user_id):
        """Test submit_feedback endpoint without authentication"""
        mock_get_user_id.return_value = None
        
        router.current_event = {
            'body': json.dumps(self.valid_feedback_data)
        }
        
        with pytest.raises(Exception, match="User not found"):
            submit_feedback()

    @patch('routes.feedback.get_user_id')
    def test_submit_feedback_endpoint_invalid_json(self, mock_get_user_id):
        """Test submit_feedback endpoint with invalid JSON"""
        mock_get_user_id.return_value = self.mock_user_id
        
        router.current_event = {
            'body': 'invalid json'
        }
        
        from aws_lambda_powertools.event_handler.exceptions import BadRequestError
        with pytest.raises(BadRequestError):
            submit_feedback()

    @patch('routes.feedback.get_user_id')
    @patch('routes.feedback.get_user_feedback_history')
    def test_get_feedback_history_endpoint_success(self, mock_get_history, mock_get_user_id):
        """Test get_feedback_history endpoint success"""
        mock_get_user_id.return_value = self.mock_user_id
        mock_get_history.return_value = {
            'items': [{'feedback_id': 'test'}]
        }
        
        router.current_event = {
            'queryStringParameters': {'limit': '25'}
        }
        
        result = get_feedback_history()
        
        assert 'feedback' in result
        assert len(result['feedback']) == 1
        
        # Verify history function was called with correct parameters
        mock_get_history.assert_called_once_with(self.mock_user_id, 25, None)

    @patch('routes.feedback.get_user_id')
    @patch('routes.feedback.get_user_feedback_history')
    def test_get_feedback_history_endpoint_with_pagination(self, mock_get_history, mock_get_user_id):
        """Test get_feedback_history endpoint with pagination parameters"""
        mock_get_user_id.return_value = self.mock_user_id
        mock_get_history.return_value = {
            'items': [],
            'next_token': 'test_token'
        }
        
        router.current_event = {
            'queryStringParameters': {
                'limit': '10',
                'next_token': 'pagination_token'
            }
        }
        
        result = get_feedback_history()
        
        assert 'next_token' in result
        assert result['next_token'] == 'test_token'
        
        # Verify history function was called with pagination parameters
        mock_get_history.assert_called_once_with(self.mock_user_id, 10, 'pagination_token')

    @patch('routes.feedback.get_user_id')
    def test_get_feedback_history_endpoint_no_auth(self, mock_get_user_id):
        """Test get_feedback_history endpoint without authentication"""
        mock_get_user_id.return_value = None
        
        # The endpoint returns a 401 Response, not an exception
        result = get_feedback_history()
        assert result.status_code == 401
        assert "User not found" in result.body


class TestGetFeedbackInDateRange:
    """Test get_feedback_in_date_range function"""

    def setup_method(self):
        """Setup test fixtures"""
        os.environ["FEEDBACK_REASONS"] = "accuracy,unhelpful,app_issue,other"

    @patch('routes.feedback.feedback_table')
    def test_get_feedback_in_date_range_success(self, mock_table):
        """Test successful feedback retrieval in date range"""
        from routes.feedback import get_feedback_in_date_range
        
        mock_items = [
            {
                'feedback_id': 'feedback-1',
                'user_id': 'user-123',
                'session_id': 'session-1',
                'message_id': 'message-1',
                'rating': 'thumbs_up',
                'reason': 'accuracy',
                'text_feedback': 'Great!',
                'created_at': '2023-07-11T17:30:00+00:00',
                'model_used': 'claude-3',
                'response_time_ms': 1500
            }
        ]
        
        mock_table.query.return_value = {
            'Items': mock_items
        }
        
        result = get_feedback_in_date_range('2023-07-01', '2023-07-31')
        
        assert len(result['items']) == 1
        assert result['items'][0]['feedback_id'] == 'feedback-1'
        assert 'date_range' in result

    def test_get_feedback_in_date_range_invalid_date_format(self):
        """Test that invalid date format raises ValidationError"""
        from routes.feedback import get_feedback_in_date_range
        
        with pytest.raises(ValidationError, match="Invalid date format"):
            get_feedback_in_date_range('not-a-date', '2023-07-31')

    def test_get_feedback_in_date_range_invalid_end_date(self):
        """Test that invalid end date format raises ValidationError"""
        from routes.feedback import get_feedback_in_date_range
        
        with pytest.raises(ValidationError, match="Invalid date format"):
            get_feedback_in_date_range('2023-07-01', 'invalid')

    @patch('routes.feedback.feedback_table')
    def test_get_feedback_in_date_range_dynamodb_error(self, mock_table):
        """Test that DynamoDB errors raise FeedbackError"""
        from routes.feedback import get_feedback_in_date_range
        from botocore.exceptions import ClientError
        
        mock_table.query.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Test error'}},
            'Query'
        )
        
        with pytest.raises(FeedbackError) as exc_info:
            get_feedback_in_date_range('2023-07-01', '2023-07-31')
        
        assert exc_info.value.error_code == "DATABASE_ERROR"

    @patch('routes.feedback.feedback_table')
    def test_get_feedback_in_date_range_unexpected_error(self, mock_table):
        """Test that unexpected errors raise FeedbackError with INTERNAL_ERROR"""
        from routes.feedback import get_feedback_in_date_range
        
        mock_table.query.side_effect = RuntimeError("Unexpected error")
        
        with pytest.raises(FeedbackError) as exc_info:
            get_feedback_in_date_range('2023-07-01', '2023-07-31')
        
        assert exc_info.value.error_code == "INTERNAL_ERROR"

    @patch('routes.feedback.feedback_table')
    def test_get_feedback_in_date_range_with_pagination(self, mock_table):
        """Test feedback retrieval with pagination token"""
        from routes.feedback import get_feedback_in_date_range
        
        mock_table.query.return_value = {
            'Items': [],
            'LastEvaluatedKey': {'PK': 'FEEDBACK', 'SK': '2023-07-15T12:00:00+00:00'}
        }
        
        result = get_feedback_in_date_range('2023-07-01', '2023-07-31')
        
        assert 'next_token' in result
        assert result['next_token'] == '2023-07-15T12:00:00+00:00'


class TestAdminGetFeedback:
    """Test admin_get_feedback endpoint"""

    def setup_method(self):
        """Setup test fixtures"""
        os.environ["FEEDBACK_REASONS"] = "accuracy,unhelpful,app_issue,other"
        os.environ["ADMIN_GROUP"] = "admin"

    @patch('routes.feedback.is_admin')
    @patch('routes.feedback.get_feedback_in_date_range')
    def test_admin_get_feedback_success(self, mock_get_range, mock_is_admin):
        """Test successful admin feedback retrieval"""
        from routes.feedback import admin_get_feedback
        
        mock_is_admin.return_value = True
        mock_get_range.return_value = {
            'items': [{'feedback_id': 'test-1'}],
            'date_range': {'start_date': '2023-07-01', 'end_date': '2023-07-31'}
        }
        
        router.current_event = {
            'queryStringParameters': {
                'start_date': '2023-07-01',
                'end_date': '2023-07-31'
            }
        }
        
        result = admin_get_feedback()
        
        assert 'feedback' in result
        assert len(result['feedback']) == 1

    @patch('routes.feedback.is_admin')
    def test_admin_get_feedback_not_admin(self, mock_is_admin):
        """Test admin endpoint returns 403 for non-admin users"""
        from routes.feedback import admin_get_feedback
        
        mock_is_admin.return_value = False
        
        router.current_event = {
            'queryStringParameters': {
                'start_date': '2023-07-01',
                'end_date': '2023-07-31'
            }
        }
        
        result = admin_get_feedback()
        
        assert result.status_code == 403
        assert "Admin privileges required" in result.body

    @patch('routes.feedback.is_admin')
    def test_admin_get_feedback_missing_dates(self, mock_is_admin):
        """Test admin endpoint returns 400 when dates are missing"""
        from routes.feedback import admin_get_feedback
        
        mock_is_admin.return_value = True
        
        router.current_event = {
            'queryStringParameters': {}
        }
        
        result = admin_get_feedback()
        
        assert result.status_code == 400
        assert "start_date and end_date parameters are required" in result.body

    @patch('routes.feedback.is_admin')
    @patch('routes.feedback.get_feedback_in_date_range')
    def test_admin_get_feedback_validation_error(self, mock_get_range, mock_is_admin):
        """Test admin endpoint returns 400 for validation errors"""
        from routes.feedback import admin_get_feedback
        
        mock_is_admin.return_value = True
        mock_get_range.side_effect = ValidationError("Invalid date format. Use YYYY-MM-DD")
        
        router.current_event = {
            'queryStringParameters': {
                'start_date': 'invalid',
                'end_date': '2023-07-31'
            }
        }
        
        result = admin_get_feedback()
        
        assert result.status_code == 400
        assert "Invalid date format" in result.body

    @patch('routes.feedback.is_admin')
    @patch('routes.feedback.get_feedback_in_date_range')
    def test_admin_get_feedback_database_error(self, mock_get_range, mock_is_admin):
        """Test admin endpoint returns 503 for database errors"""
        from routes.feedback import admin_get_feedback
        
        mock_is_admin.return_value = True
        mock_get_range.side_effect = FeedbackError("Database error", "DATABASE_ERROR")
        
        router.current_event = {
            'queryStringParameters': {
                'start_date': '2023-07-01',
                'end_date': '2023-07-31'
            }
        }
        
        result = admin_get_feedback()
        
        assert result.status_code == 503
        assert "Service temporarily unavailable" in result.body

    @patch('routes.feedback.is_admin')
    @patch('routes.feedback.get_feedback_in_date_range')
    def test_admin_get_feedback_internal_error(self, mock_get_range, mock_is_admin):
        """Test admin endpoint returns 500 for internal errors"""
        from routes.feedback import admin_get_feedback
        
        mock_is_admin.return_value = True
        mock_get_range.side_effect = FeedbackError("Internal error", "INTERNAL_ERROR")
        
        router.current_event = {
            'queryStringParameters': {
                'start_date': '2023-07-01',
                'end_date': '2023-07-31'
            }
        }
        
        result = admin_get_feedback()
        
        assert result.status_code == 500
        assert "Internal server error" in result.body


class TestEdgeCases:
    """Test edge cases and error scenarios"""

    def setup_method(self):
        """Setup test fixtures"""
        # Patch environment variable for feedback reasons
        os.environ["FEEDBACK_REASONS"] = "accuracy,unhelpful,app_issue,other"

    def test_validate_feedback_data_long_text_truncation(self):
        """Test text feedback truncation for long inputs"""
        long_text = "x" * 1500  # Exceeds 1000 character limit
        
        feedback_data = {
            "session_id": "session-123",
            "message_id": "message-456",
            "rating": "thumbs_up",
            "reason": "accuracy",
            "text_feedback": long_text
        }
        
        from routes.feedback import validate_feedback_data
        
        # This should not raise an exception, but truncate the text
        validated = validate_feedback_data(feedback_data)
        assert len(validated['text_feedback']) == 1000

    def test_validate_feedback_data_alphanumeric_model_name(self):
        """Test model name validation for alphanumeric pattern"""
        feedback_data = {
            "session_id": "session-123",
            "message_id": "message-456",
            "rating": "thumbs_up",
            "reason": "accuracy",
            "model_used": "model-name!@#"  # Invalid characters
        }
        
        with pytest.raises(ValidationError, match="Input does not match required pattern"):
            from routes.feedback import validate_feedback_data
            validate_feedback_data(feedback_data)

    def test_validate_feedback_data_unknown_model(self):
        """Test that 'unknown' model value is accepted without pattern validation.
        
        Some backend responses (e.g. non-model-based data sources) don't have
        a model involved and return 'unknown' as the model_used value.
        This should bypass the regex pattern check and be accepted as-is.
        """
        feedback_data = {
            "session_id": "session-123",
            "message_id": "message-456",
            "rating": "thumbs_up",
            "model_used": "unknown"
        }
        
        from routes.feedback import validate_feedback_data
        validated = validate_feedback_data(feedback_data)
        assert validated['model_used'] == 'unknown'

    @patch('routes.feedback.feedback_table')
    def test_invalid_pagination_token_handling(self, mock_table):
        """Test handling of invalid pagination tokens"""
        invalid_token = "not-a-valid-feedback-token"
        
        mock_table.query.return_value = {
            'Items': []
        }
        
        # Should continue without error even with invalid token
        result = get_user_feedback_history("user-123", 50, invalid_token)
        
        assert len(result['items']) == 0


if __name__ == '__main__':
    pytest.main([__file__])
