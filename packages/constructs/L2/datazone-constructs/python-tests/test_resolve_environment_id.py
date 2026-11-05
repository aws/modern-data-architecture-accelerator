"""
Unit tests for resolve_environment_id Lambda function.
"""
import pytest
from unittest.mock import patch
from botocore.exceptions import ClientError

import resolve_environment_id


def access_denied_error(operation_name='ListEnvironments'):
    return ClientError(
        {'Error': {'Code': 'AccessDeniedException', 'Message': 'denied'}}, operation_name
    )


class TestHelperFunctions:
    """Test cases for helper functions."""

    def test_get_required_param_success(self):
        """Test get_required_param with valid param."""
        config = {'domainId': 'dzd_123'}
        result = resolve_environment_id.get_required_param(config, 'domainId')
        assert result == 'dzd_123'

    def test_get_required_param_missing(self):
        """Test get_required_param raises on missing param."""
        config = {}
        with pytest.raises(ValueError) as exc_info:
            resolve_environment_id.get_required_param(config, 'domainId')
        assert "Unable to parse domainId" in str(exc_info.value)


class TestResolveEnvironmentId:
    """Test cases for resolve_environment_id function."""

    @patch.object(resolve_environment_id, 'datazone_client')
    @patch.object(resolve_environment_id, 'time')
    def test_resolved_immediately(self, mock_time, mock_dz):
        """Test when the environment is found on the first lookup."""
        mock_dz.list_environments.return_value = {
            'items': [{'id': 'env-123'}]
        }

        result = resolve_environment_id.resolve_environment_id('dzd_123', 'proj_456', 'Tooling')

        assert result == 'env-123'
        mock_time.sleep.assert_not_called()
        mock_dz.list_environments.assert_called_once_with(
            domainIdentifier='dzd_123', projectIdentifier='proj_456', name='Tooling'
        )

    @patch.object(resolve_environment_id, 'datazone_client')
    @patch.object(resolve_environment_id, 'time')
    def test_resolved_across_pages(self, mock_time, mock_dz):
        """Test that the target environment on a later page is still found."""
        mock_dz.list_environments.side_effect = [
            {'items': [], 'nextToken': 'token-1'},
            {'items': [{'id': 'env-123'}]},
        ]

        result = resolve_environment_id.resolve_environment_id('dzd_123', 'proj_456', 'Tooling')

        assert result == 'env-123'
        mock_time.sleep.assert_not_called()
        assert mock_dz.list_environments.call_args_list[1].kwargs['nextToken'] == 'token-1'

    @patch.object(resolve_environment_id, 'datazone_client')
    @patch.object(resolve_environment_id, 'time')
    def test_resolved_after_polling(self, mock_time, mock_dz):
        """Test polling until the environment appears."""
        mock_dz.list_environments.side_effect = [
            {'items': []},
            {'items': []},
            {'items': [{'id': 'env-123'}]},
        ]

        result = resolve_environment_id.resolve_environment_id('dzd_123', 'proj_456', 'Tooling')

        assert result == 'env-123'
        assert mock_time.sleep.call_count == 2

    @patch.object(resolve_environment_id, 'datazone_client')
    @patch.object(resolve_environment_id, 'time')
    def test_not_found_returns_none_without_raising(self, mock_time, mock_dz):
        """Test that exhausting attempts returns None instead of raising."""
        mock_dz.list_environments.return_value = {'items': []}

        result = resolve_environment_id.resolve_environment_id(
            'dzd_123', 'proj_456', 'Tooling', max_attempts=3
        )

        assert result == resolve_environment_id.UNRESOLVED_PLACEHOLDER
        # No sleep after the final attempt - nothing left to wait for.
        assert mock_time.sleep.call_count == 2

    @patch.object(resolve_environment_id, 'datazone_client')
    @patch.object(resolve_environment_id, 'time')
    def test_multiple_matches_returns_none_without_raising(self, mock_time, mock_dz):
        """Test that more than one match is treated as ambiguous, not retried."""
        mock_dz.list_environments.return_value = {
            'items': [{'id': 'env-123'}, {'id': 'env-456'}]
        }

        result = resolve_environment_id.resolve_environment_id('dzd_123', 'proj_456', 'Tooling')

        assert result == resolve_environment_id.UNRESOLVED_PLACEHOLDER
        mock_dz.list_environments.assert_called_once()
        mock_time.sleep.assert_not_called()

    @patch.object(resolve_environment_id, 'datazone_client')
    @patch.object(resolve_environment_id, 'time')
    def test_api_error_returns_none_without_raising(self, mock_time, mock_dz):
        """Test that a DataZone API error returns None instead of raising."""
        mock_dz.list_environments.side_effect = Exception("boom")

        result = resolve_environment_id.resolve_environment_id('dzd_123', 'proj_456', 'Tooling')

        assert result == resolve_environment_id.UNRESOLVED_PLACEHOLDER
        mock_time.sleep.assert_not_called()

    @patch.object(resolve_environment_id, 'datazone_client')
    @patch.object(resolve_environment_id, 'time')
    def test_access_denied_retries_then_resolves(self, mock_time, mock_dz):
        """Test that AccessDeniedException is retried, not treated as terminal."""
        mock_dz.list_environments.side_effect = [
            access_denied_error(),
            {'items': [{'id': 'env-123'}]},
        ]

        result = resolve_environment_id.resolve_environment_id('dzd_123', 'proj_456', 'Tooling')

        assert result == 'env-123'
        assert mock_time.sleep.call_count == 1

    @patch.object(resolve_environment_id, 'datazone_client')
    @patch.object(resolve_environment_id, 'time')
    def test_access_denied_exhausts_without_raising(self, mock_time, mock_dz):
        """Test that AccessDeniedException on every attempt still returns None."""
        mock_dz.list_environments.side_effect = access_denied_error()

        result = resolve_environment_id.resolve_environment_id(
            'dzd_123', 'proj_456', 'Tooling', max_attempts=3
        )

        assert result == resolve_environment_id.UNRESOLVED_PLACEHOLDER
        assert mock_time.sleep.call_count == 2

    @patch.object(resolve_environment_id, 'datazone_client')
    @patch.object(resolve_environment_id, 'time')
    def test_other_client_error_returns_none_without_retrying(self, mock_time, mock_dz):
        """Test that a non-AccessDenied ClientError is treated as terminal, not retried."""
        mock_dz.list_environments.side_effect = ClientError(
            {'Error': {'Code': 'ThrottlingException', 'Message': 'slow down'}}, 'ListEnvironments'
        )

        result = resolve_environment_id.resolve_environment_id('dzd_123', 'proj_456', 'Tooling')

        assert result == resolve_environment_id.UNRESOLVED_PLACEHOLDER
        mock_dz.list_environments.assert_called_once()
        mock_time.sleep.assert_not_called()


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
                'envConfigName': 'Tooling',
            }
        }

    @patch.object(resolve_environment_id, 'time')
    @patch.object(resolve_environment_id, 'datazone_client')
    def test_create_resolves_and_returns_environment_id(self, mock_dz, mock_time, create_event, lambda_context):
        """Test successful Create request returns the resolved ID."""
        mock_time.sleep.return_value = None
        mock_dz.list_environments.return_value = {'items': [{'id': 'env-123'}]}

        response = resolve_environment_id.lambda_handler(create_event, lambda_context)

        assert response['Status'] == '200'
        assert response['Data']['environmentId'] == 'env-123'

    @patch.object(resolve_environment_id, 'time')
    @patch.object(resolve_environment_id, 'datazone_client')
    def test_update_resolves_and_returns_environment_id(self, mock_dz, mock_time, create_event, lambda_context):
        """Test successful Update request also resolves and returns the ID."""
        create_event['RequestType'] = 'Update'
        mock_time.sleep.return_value = None
        mock_dz.list_environments.return_value = {'items': [{'id': 'env-123'}]}

        response = resolve_environment_id.lambda_handler(create_event, lambda_context)

        assert response['Status'] == '200'
        assert response['Data']['environmentId'] == 'env-123'

    @patch.object(resolve_environment_id, 'time')
    @patch.object(resolve_environment_id, 'datazone_client')
    def test_unresolved_environment_returns_placeholder(self, mock_dz, mock_time, create_event, lambda_context):
        """Test that an environment which can't be resolved returns the placeholder, not empty/raising."""
        mock_dz.list_environments.return_value = {'items': []}

        response = resolve_environment_id.lambda_handler(create_event, lambda_context)

        assert response['Status'] == '200'
        assert response['Data']['environmentId'] == resolve_environment_id.UNRESOLVED_PLACEHOLDER

    def test_delete_returns_none(self, lambda_context):
        """Test Delete request returns None."""
        event = {
            'RequestType': 'Delete',
            'ResourceProperties': {'domainId': 'dzd_123'}
        }

        response = resolve_environment_id.lambda_handler(event, lambda_context)

        assert response is None

    def test_missing_required_param(self, lambda_context):
        """Test error when required param is missing."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {'domainId': 'dzd_123'}
        }

        with pytest.raises(ValueError) as exc_info:
            resolve_environment_id.lambda_handler(event, lambda_context)

        assert "Unable to parse projectId" in str(exc_info.value)
