"""
Unit tests for monitor_env_deployment Lambda function.
"""
import pytest
from unittest.mock import patch, MagicMock

import monitor_env_deployment


class TestHelperFunctions:
    """Test cases for helper functions."""

    def test_get_required_param_success(self):
        """Test get_required_param with valid param."""
        config = {'domainId': 'dzd_123'}
        result = monitor_env_deployment.get_required_param(config, 'domainId')
        assert result == 'dzd_123'

    def test_get_required_param_missing(self):
        """Test get_required_param raises on missing param."""
        config = {}
        with pytest.raises(ValueError) as exc_info:
            monitor_env_deployment.get_required_param(config, 'domainId')
        assert "Unable to parse domainId" in str(exc_info.value)


class TestWaitForEnvironmentActive:
    """Test cases for wait_for_environment_active function."""

    @patch.object(monitor_env_deployment, 'datazone_client')
    @patch.object(monitor_env_deployment, 'time')
    def test_environment_active_immediately(self, mock_time, mock_dz):
        """Test when environment is already ACTIVE."""
        mock_dz.list_environments.return_value = {
            'items': [{'id': 'env-123', 'status': 'ACTIVE'}]
        }
        mock_dz.get_environment.return_value = {
            'id': 'env-123',
            'provisionedResources': []
        }

        result = monitor_env_deployment.wait_for_environment_active(
            'dzd_123', 'proj_456', 'test-env'
        )

        assert result['id'] == 'env-123'
        mock_time.sleep.assert_not_called()

    @patch.object(monitor_env_deployment, 'datazone_client')
    @patch.object(monitor_env_deployment, 'time')
    def test_environment_becomes_active(self, mock_time, mock_dz):
        """Test polling until environment becomes ACTIVE."""
        mock_dz.list_environments.side_effect = [
            {'items': [{'id': 'env-123', 'status': 'CREATING'}]},
            {'items': [{'id': 'env-123', 'status': 'CREATING'}]},
            {'items': [{'id': 'env-123', 'status': 'ACTIVE'}]}
        ]
        mock_dz.get_environment.return_value = {'id': 'env-123'}

        result = monitor_env_deployment.wait_for_environment_active(
            'dzd_123', 'proj_456', 'test-env'
        )

        assert result['id'] == 'env-123'
        assert mock_time.sleep.call_count == 2

    @patch.object(monitor_env_deployment, 'datazone_client')
    @patch.object(monitor_env_deployment, 'time')
    def test_environment_failed(self, mock_time, mock_dz):
        """Test exception when environment enters FAILED state."""
        mock_dz.list_environments.return_value = {
            'items': [{'id': 'env-123', 'status': 'CREATE_FAILED'}]
        }

        with pytest.raises(Exception) as exc_info:
            monitor_env_deployment.wait_for_environment_active(
                'dzd_123', 'proj_456', 'test-env'
            )

        assert "CREATE_FAILED" in str(exc_info.value)

    @patch.object(monitor_env_deployment, 'datazone_client')
    @patch.object(monitor_env_deployment, 'time')
    def test_environment_timeout(self, mock_time, mock_dz):
        """Test exception when max attempts exceeded."""
        mock_dz.list_environments.return_value = {
            'items': [{'id': 'env-123', 'status': 'CREATING'}]
        }

        with pytest.raises(Exception) as exc_info:
            monitor_env_deployment.wait_for_environment_active(
                'dzd_123', 'proj_456', 'test-env', max_attempts=3
            )

        assert "did not become ACTIVE" in str(exc_info.value)


class TestWaitForConnection:
    """Test cases for wait_for_connection function."""

    @patch.object(monitor_env_deployment, 'datazone_client')
    @patch.object(monitor_env_deployment, 'time')
    def test_connection_found_immediately(self, mock_time, mock_dz):
        """Test when connection exists immediately."""
        mock_dz.list_connections.return_value = {
            'items': [{'connectionId': 'conn-123'}]
        }

        result = monitor_env_deployment.wait_for_connection(
            'dzd_123', 'proj_456', 'env-789', 'test-connection'
        )

        assert result == 'conn-123'
        mock_time.sleep.assert_not_called()

    @patch.object(monitor_env_deployment, 'datazone_client')
    @patch.object(monitor_env_deployment, 'time')
    def test_connection_found_after_polling(self, mock_time, mock_dz):
        """Test polling until connection is found."""
        mock_dz.list_connections.side_effect = [
            {'items': []},
            {'items': []},
            {'items': [{'connectionId': 'conn-123'}]}
        ]

        result = monitor_env_deployment.wait_for_connection(
            'dzd_123', 'proj_456', 'env-789', 'test-connection'
        )

        assert result == 'conn-123'
        assert mock_time.sleep.call_count == 2

    @patch.object(monitor_env_deployment, 'datazone_client')
    @patch.object(monitor_env_deployment, 'time')
    def test_connection_timeout(self, mock_time, mock_dz):
        """Test exception when max attempts exceeded."""
        mock_dz.list_connections.return_value = {'items': []}

        with pytest.raises(Exception) as exc_info:
            monitor_env_deployment.wait_for_connection(
                'dzd_123', 'proj_456', 'env-789', 'test-connection',
                max_attempts=3
            )

        assert "not found within" in str(exc_info.value)


class TestLambdaHandler:
    """Test cases for lambda_handler."""

    @pytest.fixture
    def create_event(self):
        """CloudFormation Create event."""
        return {
            'RequestType': 'Create',
            'ResourceProperties': {
                'domainId': 'dzd_123',
                'projectId': 'proj_456',
                'envName': 'test-env',
                'connectionName': 'test-connection',
                'kmsPolicyArn': 'arn:aws:iam::123456789012:policy/KmsPolicy'
            }
        }

    @patch.object(monitor_env_deployment, 'time')
    @patch.object(monitor_env_deployment, 'iam_client')
    @patch.object(monitor_env_deployment, 'datazone_client')
    def test_create_success(
        self, mock_dz, mock_iam, mock_time, create_event, lambda_context
    ):
        """Test successful Create request."""
        mock_time.sleep.return_value = None
        mock_dz.list_environments.return_value = {
            'items': [{'id': 'env-123', 'status': 'ACTIVE'}]
        }
        mock_dz.get_environment.return_value = {
            'id': 'env-123',
            'provisionedResources': [
                {'name': 'userRoleArn', 'value': 'arn:aws:iam::123456789012:role/UserRole'}
            ]
        }
        mock_dz.list_connections.return_value = {
            'items': [{'connectionId': 'conn-456'}]
        }

        response = monitor_env_deployment.lambda_handler(create_event, lambda_context)

        assert response['Status'] == '200'
        assert response['Data']['environmentId'] == 'env-123'
        assert response['Data']['connectionId'] == 'conn-456'
        mock_iam.attach_role_policy.assert_called_once_with(
            RoleName='UserRole',
            PolicyArn='arn:aws:iam::123456789012:policy/KmsPolicy'
        )

    @patch.object(monitor_env_deployment, 'time')
    @patch.object(monitor_env_deployment, 'iam_client')
    @patch.object(monitor_env_deployment, 'datazone_client')
    def test_update_success(
        self, mock_dz, mock_iam, mock_time, create_event, lambda_context
    ):
        """Test successful Update request."""
        create_event['RequestType'] = 'Update'
        mock_time.sleep.return_value = None
        mock_dz.list_environments.return_value = {
            'items': [{'id': 'env-123', 'status': 'ACTIVE'}]
        }
        mock_dz.get_environment.return_value = {
            'id': 'env-123',
            'provisionedResources': []
        }
        mock_dz.list_connections.return_value = {
            'items': [{'connectionId': 'conn-456'}]
        }

        response = monitor_env_deployment.lambda_handler(create_event, lambda_context)

        assert response['Status'] == '200'
        # No userRoleArn, so attach_role_policy should not be called
        mock_iam.attach_role_policy.assert_not_called()

    @patch.object(monitor_env_deployment, 'time')
    def test_delete_returns_none(self, mock_time, lambda_context):
        """Test Delete request returns None."""
        event = {
            'RequestType': 'Delete',
            'ResourceProperties': {'domainId': 'dzd_123'}
        }
        mock_time.sleep.return_value = None

        response = monitor_env_deployment.lambda_handler(event, lambda_context)

        assert response is None

    @patch.object(monitor_env_deployment, 'time')
    def test_missing_required_param(self, mock_time, lambda_context):
        """Test error when required param is missing."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {'domainId': 'dzd_123'}
        }
        mock_time.sleep.return_value = None

        with pytest.raises(ValueError) as exc_info:
            monitor_env_deployment.lambda_handler(event, lambda_context)

        assert "Unable to parse projectId" in str(exc_info.value)
