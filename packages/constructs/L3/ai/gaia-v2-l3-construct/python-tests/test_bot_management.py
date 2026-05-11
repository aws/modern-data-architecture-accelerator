"""
Unit tests for bot management API routes.
Tests service interruption activation, deactivation, and status checking functionality.
"""

import json
import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock

import sys
import os

# Set required environment variables BEFORE importing the module
os.environ["SERVICE_INTERRUPTION_TABLE_NAME"] = "test-interruption-table"
os.environ["ADMIN_GROUP"] = "test-admin-group"
os.environ["AWS_REGION"] = "us-east-1"


from routes.bot_management import (
    sanitize_input,
    validate_service_type,
    check_admin_access,
    activate_service_interruption,
    deactivate_service_interruption,
    get_interruption_status,
    activate_interruption,
    deactivate_interruption,
    get_all_interruptions,
    get_service_interruption,
    get_service_types,
    health_check,
    ValidationError,
    BotManagementError,
    VALID_SERVICE_TYPES,
    MAX_MESSAGE_LENGTH,
    MAX_REASON_LENGTH,
    MAX_DURATION_MINUTES,
    router
)


class TestInputValidation:
    """Test input validation and sanitization functions"""

    def test_sanitize_input_strips_whitespace(self):
        """Test that sanitize_input strips leading/trailing whitespace"""
        result = sanitize_input("  hello world  ")
        assert result == "hello world"

    def test_sanitize_input_removes_control_characters(self):
        """Test that sanitize_input removes control characters"""
        result = sanitize_input("hello\x00world\x1f")
        assert result == "helloworld"

    def test_sanitize_input_truncates_to_max_length(self):
        """Test that sanitize_input truncates to max_length"""
        long_input = "x" * 100
        result = sanitize_input(long_input, max_length=50)
        assert len(result) == 50

    def test_sanitize_input_raises_on_non_string(self):
        """Test that sanitize_input raises ValidationError for non-string input"""
        with pytest.raises(ValidationError, match="Input must be a string"):
            sanitize_input(123)

    def test_validate_service_type_valid_types(self):
        """Test validate_service_type accepts all valid service types"""
        for service_type in VALID_SERVICE_TYPES:
            result = validate_service_type(service_type)
            assert result == service_type

    def test_validate_service_type_case_insensitive(self):
        """Test validate_service_type is case insensitive"""
        result = validate_service_type("GLOBAL")
        assert result == "global"

    def test_validate_service_type_strips_whitespace(self):
        """Test validate_service_type strips whitespace"""
        result = validate_service_type("  global  ")
        assert result == "global"

    def test_validate_service_type_invalid(self):
        """Test validate_service_type raises for invalid types"""
        with pytest.raises(ValidationError, match="service_type must be one of"):
            validate_service_type("invalid-service")

    def test_validate_service_type_empty_string(self):
        """Test validate_service_type raises for empty string"""
        with pytest.raises(ValidationError, match="service_type must be a non-empty string"):
            validate_service_type("")

    def test_validate_service_type_non_string(self):
        """Test validate_service_type raises for non-string input"""
        with pytest.raises(ValidationError, match="service_type must be a non-empty string"):
            validate_service_type(None)


class TestAdminAccess:
    """Test admin access control"""

    def test_check_admin_access_no_admin_group_configured(self):
        """Test check_admin_access when ADMIN_GROUP is not configured"""
        mock_router = Mock()
        
        with patch.dict(os.environ, {"ADMIN_GROUP": ""}, clear=False):
            # Need to reload to pick up env change
            from aws_lambda_powertools.event_handler.exceptions import BadRequestError
            with pytest.raises(BadRequestError, match="ADMIN_GROUP not configured"):
                check_admin_access(mock_router)

    def test_check_admin_access_no_table_configured(self):
        """Test check_admin_access when SERVICE_INTERRUPTION_TABLE_NAME is not configured"""
        mock_router = Mock()
        
        with patch('routes.bot_management.SERVICE_INTERRUPTION_TABLE_NAME', None):
            from aws_lambda_powertools.event_handler.exceptions import BadRequestError
            with pytest.raises(BadRequestError, match="Service interruption table not configured"):
                check_admin_access(mock_router)

    @patch('routes.bot_management.is_admin')
    @patch('routes.bot_management.get_user_id')
    def test_check_admin_access_non_admin_user(self, mock_get_user_id, mock_is_admin):
        """Test check_admin_access denies non-admin users"""
        mock_router = Mock()
        mock_is_admin.return_value = False
        mock_get_user_id.return_value = "test-user-123"
        
        from aws_lambda_powertools.event_handler.exceptions import UnauthorizedError
        with pytest.raises(UnauthorizedError, match="Admin privileges required"):
            check_admin_access(mock_router)

    @patch('routes.bot_management.is_admin')
    def test_check_admin_access_admin_user(self, mock_is_admin):
        """Test check_admin_access allows admin users"""
        mock_router = Mock()
        mock_is_admin.return_value = True
        
        result = check_admin_access(mock_router)
        assert result is True


class TestActivateServiceInterruption:
    """Test service interruption activation"""

    @patch('routes.bot_management.interruption_table')
    @patch('routes.bot_management.datetime')
    def test_activate_interruption_success(self, mock_datetime, mock_table):
        """Test successful service interruption activation"""
        mock_timestamp = datetime(2023, 7, 11, 17, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_timestamp
        mock_datetime.timezone = timezone
        mock_table.put_item.return_value = {}
        
        result = activate_service_interruption(
            service_type="global",
            message="System maintenance in progress",
            reason="Scheduled maintenance",
            activated_by="admin-user"
        )
        
        assert result['success'] is True
        assert result['service_type'] == "global"
        assert result['interruption_message'] == "System maintenance in progress"
        assert result['activated_by'] == "admin-user"
        mock_table.put_item.assert_called_once()

    @patch('routes.bot_management.interruption_table')
    @patch('routes.bot_management.datetime')
    def test_activate_interruption_with_duration(self, mock_datetime, mock_table):
        """Test service interruption activation with auto-deactivation duration"""
        mock_timestamp = datetime(2023, 7, 11, 17, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_timestamp
        mock_datetime.timezone = timezone
        mock_table.put_item.return_value = {}
        
        result = activate_service_interruption(
            service_type="bedrock-rag",
            message="RAG service maintenance",
            duration_minutes=60
        )
        
        assert result['success'] is True
        assert result['duration_minutes'] == 60
        assert 'auto_deactivate_at' in result

    @patch('routes.bot_management.interruption_table')
    def test_activate_interruption_database_error(self, mock_table):
        """Test service interruption activation handles database errors"""
        from botocore.exceptions import ClientError
        mock_table.put_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalError', 'Message': 'Test error'}},
            'PutItem'
        )
        
        with pytest.raises(BotManagementError, match="database error"):
            activate_service_interruption(
                service_type="global",
                message="Test message"
            )


class TestDeactivateServiceInterruption:
    """Test service interruption deactivation"""

    @patch('routes.bot_management.interruption_table')
    @patch('routes.bot_management.datetime')
    def test_deactivate_interruption_success(self, mock_datetime, mock_table):
        """Test successful service interruption deactivation"""
        mock_timestamp = datetime(2023, 7, 11, 17, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_timestamp
        mock_datetime.timezone = timezone
        
        mock_table.get_item.return_value = {
            'Item': {'id': 'global', 'isActive': True}
        }
        mock_table.update_item.return_value = {}
        
        result = deactivate_service_interruption("global")
        
        assert result['success'] is True
        assert result['service_type'] == "global"
        mock_table.update_item.assert_called_once()

    @patch('routes.bot_management.interruption_table')
    def test_deactivate_interruption_not_found(self, mock_table):
        """Test deactivation when no interruption exists"""
        mock_table.get_item.return_value = {}
        
        result = deactivate_service_interruption("global")
        
        assert result['success'] is False
        assert "No interruption found" in result['message']

    @patch('routes.bot_management.interruption_table')
    def test_deactivate_interruption_already_inactive(self, mock_table):
        """Test deactivation when interruption is already inactive"""
        mock_table.get_item.return_value = {
            'Item': {'id': 'global', 'isActive': False}
        }
        
        result = deactivate_service_interruption("global")
        
        assert result['success'] is False
        assert "already inactive" in result['message']

    @patch('routes.bot_management.interruption_table')
    def test_deactivate_interruption_database_error(self, mock_table):
        """Test deactivation handles database errors"""
        from botocore.exceptions import ClientError
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalError', 'Message': 'Test error'}},
            'GetItem'
        )
        
        with pytest.raises(BotManagementError, match="database error"):
            deactivate_service_interruption("global")


class TestGetInterruptionStatus:
    """Test interruption status retrieval"""

    @patch('routes.bot_management.interruption_table')
    def test_get_status_specific_service_active(self, mock_table):
        """Test getting status for a specific active service"""
        mock_table.get_item.return_value = {
            'Item': {
                'id': 'global',
                'isActive': True,
                'message': 'Maintenance in progress',
                'scope': 'global',
                'activatedAt': '2023-07-11T17:30:00+00:00',
                'activatedBy': 'admin'
            }
        }
        
        result = get_interruption_status("global")
        
        assert result['success'] is True
        assert result['is_active'] is True
        assert result['message'] == 'Maintenance in progress'

    @patch('routes.bot_management.interruption_table')
    def test_get_status_specific_service_not_found(self, mock_table):
        """Test getting status for a service with no interruption"""
        mock_table.get_item.return_value = {}
        
        result = get_interruption_status("global")
        
        assert result['success'] is True
        assert result['is_active'] is False
        assert result['message'] == 'No interruption configured'

    @patch('routes.bot_management.interruption_table')
    def test_get_status_all_services(self, mock_table):
        """Test getting status for all services"""
        mock_table.scan.return_value = {
            'Items': [
                {'id': 'global', 'isActive': True, 'message': 'Global maintenance'},
                {'id': 'bedrock-rag', 'isActive': False, 'message': 'RAG maintenance'}
            ]
        }
        
        result = get_interruption_status()
        
        assert result['success'] is True
        assert result['total_count'] == 2
        assert result['active_count'] == 1
        assert len(result['interruptions']) == 2

    @patch('routes.bot_management.interruption_table')
    def test_get_status_database_error(self, mock_table):
        """Test status retrieval handles database errors"""
        from botocore.exceptions import ClientError
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalError', 'Message': 'Test error'}},
            'GetItem'
        )
        
        with pytest.raises(BotManagementError, match="database error"):
            get_interruption_status("global")


class TestRouteEndpoints:
    """Test API route endpoints"""

    def setup_method(self):
        """Setup test fixtures"""
        self.valid_activation_data = {
            "service_type": "global",
            "message": "System maintenance in progress",
            "reason": "Scheduled maintenance",
            "duration_minutes": 60
        }

    @patch('routes.bot_management.check_admin_access')
    @patch('routes.bot_management.get_user_id')
    @patch('routes.bot_management.activate_service_interruption')
    def test_activate_interruption_endpoint_success(self, mock_activate, mock_get_user_id, mock_check_admin):
        """Test activate_interruption endpoint success"""
        mock_check_admin.return_value = True
        mock_get_user_id.return_value = "admin-user-123"
        mock_activate.return_value = {
            'success': True,
            'service_type': 'global',
            'message': 'Service interruption activated'
        }
        
        router.current_event = {
            'body': json.dumps(self.valid_activation_data)
        }
        
        result = activate_interruption()
        
        assert result['success'] is True
        mock_activate.assert_called_once()

    @patch('routes.bot_management.check_admin_access')
    def test_activate_interruption_endpoint_missing_service_type(self, mock_check_admin):
        """Test activate_interruption endpoint with missing service_type"""
        mock_check_admin.return_value = True
        
        router.current_event = {
            'body': json.dumps({"message": "Test message"})
        }
        
        from aws_lambda_powertools.event_handler.exceptions import BadRequestError
        with pytest.raises(BadRequestError, match="service_type is required"):
            activate_interruption()

    @patch('routes.bot_management.check_admin_access')
    def test_activate_interruption_endpoint_missing_message(self, mock_check_admin):
        """Test activate_interruption endpoint with missing message"""
        mock_check_admin.return_value = True
        
        router.current_event = {
            'body': json.dumps({"service_type": "global"})
        }
        
        from aws_lambda_powertools.event_handler.exceptions import BadRequestError
        with pytest.raises(BadRequestError, match="message is required"):
            activate_interruption()

    @patch('routes.bot_management.check_admin_access')
    def test_activate_interruption_endpoint_invalid_json(self, mock_check_admin):
        """Test activate_interruption endpoint with invalid JSON"""
        mock_check_admin.return_value = True
        
        router.current_event = {
            'body': 'invalid json'
        }
        
        from aws_lambda_powertools.event_handler.exceptions import BadRequestError
        with pytest.raises(BadRequestError, match="Invalid JSON"):
            activate_interruption()

    @patch('routes.bot_management.check_admin_access')
    def test_activate_interruption_endpoint_invalid_duration(self, mock_check_admin):
        """Test activate_interruption endpoint with invalid duration"""
        mock_check_admin.return_value = True
        
        invalid_data = self.valid_activation_data.copy()
        invalid_data['duration_minutes'] = -1
        
        router.current_event = {
            'body': json.dumps(invalid_data)
        }
        
        from aws_lambda_powertools.event_handler.exceptions import BadRequestError
        with pytest.raises(BadRequestError, match="duration_minutes must be between"):
            activate_interruption()

    @patch('routes.bot_management.check_admin_access')
    @patch('routes.bot_management.deactivate_service_interruption')
    def test_deactivate_interruption_endpoint_success(self, mock_deactivate, mock_check_admin):
        """Test deactivate_interruption endpoint success"""
        mock_check_admin.return_value = True
        mock_deactivate.return_value = {
            'success': True,
            'service_type': 'global',
            'message': 'Service interruption deactivated'
        }
        
        result = deactivate_interruption("global")
        
        assert result['success'] is True
        mock_deactivate.assert_called_once_with("global")

    @patch('routes.bot_management.check_admin_access')
    def test_deactivate_interruption_endpoint_invalid_service_type(self, mock_check_admin):
        """Test deactivate_interruption endpoint with invalid service type"""
        mock_check_admin.return_value = True
        
        from aws_lambda_powertools.event_handler.exceptions import BadRequestError
        with pytest.raises(BadRequestError, match="service_type must be one of"):
            deactivate_interruption("invalid-service")

    @patch('routes.bot_management.check_admin_access')
    @patch('routes.bot_management.get_interruption_status')
    def test_get_all_interruptions_endpoint_success(self, mock_get_status, mock_check_admin):
        """Test get_all_interruptions endpoint success"""
        mock_check_admin.return_value = True
        mock_get_status.return_value = {
            'success': True,
            'interruptions': [],
            'total_count': 0,
            'active_count': 0
        }
        
        result = get_all_interruptions()
        
        assert result['success'] is True
        mock_get_status.assert_called_once_with()

    @patch('routes.bot_management.check_admin_access')
    @patch('routes.bot_management.get_interruption_status')
    def test_get_service_interruption_endpoint_success(self, mock_get_status, mock_check_admin):
        """Test get_service_interruption endpoint success"""
        mock_check_admin.return_value = True
        mock_get_status.return_value = {
            'success': True,
            'service_type': 'global',
            'is_active': False
        }
        
        result = get_service_interruption("global")
        
        assert result['success'] is True
        mock_get_status.assert_called_once_with("global")

    @patch('routes.bot_management.check_admin_access')
    def test_get_service_types_endpoint(self, mock_check_admin):
        """Test get_service_types endpoint returns valid service types"""
        mock_check_admin.return_value = True
        
        result = get_service_types()
        
        assert 'service_types' in result
        assert 'descriptions' in result
        assert set(result['service_types']) == VALID_SERVICE_TYPES

    @patch('routes.bot_management.check_admin_access')
    @patch('routes.bot_management.interruption_table')
    def test_health_check_endpoint_healthy(self, mock_table, mock_check_admin):
        """Test health_check endpoint when service is healthy"""
        mock_check_admin.return_value = True
        mock_table.scan.return_value = {'Items': []}
        
        result = health_check()
        
        assert result['status'] == 'healthy'
        assert result['service'] == 'bot-management'

    @patch('routes.bot_management.check_admin_access')
    @patch('routes.bot_management.interruption_table')
    def test_health_check_endpoint_unhealthy(self, mock_table, mock_check_admin):
        """Test health_check endpoint when service is unhealthy"""
        mock_check_admin.return_value = True
        mock_table.scan.side_effect = Exception("Connection failed")
        
        result = health_check()
        
        assert result['status'] == 'unhealthy'
        assert 'error' in result


class TestEdgeCases:
    """Test edge cases and error scenarios"""

    def test_valid_service_types_constant(self):
        """Test VALID_SERVICE_TYPES contains expected values"""
        expected = {'global', 'bedrock-rag', 'bedrock-invoke-model', 'bedrock-strands-agents'}
        assert VALID_SERVICE_TYPES == expected

    def test_max_constants(self):
        """Test max constants have reasonable values"""
        assert MAX_MESSAGE_LENGTH == 500
        assert MAX_REASON_LENGTH == 200
        assert MAX_DURATION_MINUTES == 10080  # 7 days

    def test_sanitize_input_empty_after_strip(self):
        """Test sanitize_input with input that becomes empty after stripping"""
        result = sanitize_input("   ")
        assert result == ""

    @patch('routes.bot_management.check_admin_access')
    @patch('routes.bot_management.get_user_id')
    @patch('routes.bot_management.activate_service_interruption')
    def test_activate_with_empty_message_after_sanitize(self, mock_activate, mock_get_user_id, mock_check_admin):
        """Test activation fails when message is empty after sanitization"""
        mock_check_admin.return_value = True
        mock_get_user_id.return_value = "admin-user"
        
        router.current_event = {
            'body': json.dumps({
                "service_type": "global",
                "message": "   "  # Empty after strip
            })
        }
        
        from aws_lambda_powertools.event_handler.exceptions import BadRequestError
        with pytest.raises(BadRequestError, match="message cannot be empty"):
            activate_interruption()


if __name__ == '__main__':
    pytest.main([__file__])
