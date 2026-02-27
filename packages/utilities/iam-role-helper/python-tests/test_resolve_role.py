"""
Unit tests for resolve_role Lambda function.
"""
import pytest
import os
import sys
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError

# Import will happen after mocking to avoid IAM calls at module load
import resolve_role


class TestResolveRole:
    """Test cases for resolve_role module."""

    @pytest.fixture(autouse=True)
    def reset_module_state(self):
        """Reset module-level state before each test."""
        resolve_role.role_id_map.clear()
        resolve_role.role_name_map.clear()
        resolve_role.role_arn_map.clear()
        resolve_role._roles_loaded = False
        yield

    @pytest.fixture
    def mock_role(self):
        """Sample IAM role for testing."""
        return {
            'RoleId': 'AROATEST123456789',
            'RoleName': 'test-role',
            'Arn': 'arn:aws:iam::123456789012:role/test-role',
            'Path': '/',
            'CreateDate': '2024-01-01T00:00:00Z'
        }

    @pytest.fixture
    def mock_sso_role(self):
        """Sample SSO role for testing."""
        return {
            'RoleId': 'AROASSO123456789',
            'RoleName': 'AWSReservedSSO_AdminAccess_abc123def456ghij',
            'Arn': 'arn:aws:iam::123456789012:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AdminAccess_abc123def456ghij',
            'Path': '/aws-reserved/sso.amazonaws.com/',
            'CreateDate': '2024-01-01T00:00:00Z'
        }

    # --- lambda_handler tests ---

    @patch.object(resolve_role, 'client')
    def test_lambda_handler_create_success(self, mock_client, lambda_context, create_event, mock_role, env_vars):
        """Test successful role resolution on Create."""
        mock_client.list_roles.return_value = {'Roles': [mock_role], 'IsTruncated': False}

        response = resolve_role.lambda_handler(create_event, lambda_context)

        assert response['Status'] == '200'
        assert response['PhysicalResourceId'] == mock_role['RoleId']
        assert response['Data']['arn'] == mock_role['Arn']
        assert response['Data']['name'] == mock_role['RoleName']
        assert response['Data']['id'] == mock_role['RoleId']

    @patch.object(resolve_role, 'client')
    def test_lambda_handler_update_success(self, mock_client, lambda_context, update_event, mock_role, env_vars):
        """Test successful role resolution on Update."""
        mock_client.list_roles.return_value = {'Roles': [mock_role], 'IsTruncated': False}

        response = resolve_role.lambda_handler(update_event, lambda_context)

        assert response['Status'] == '200'
        assert response['Data']['name'] == mock_role['RoleName']

    @patch.object(resolve_role, 'client')
    def test_lambda_handler_delete_returns_none(self, mock_client, lambda_context, delete_event, env_vars):
        """Test Delete request returns None."""
        response = resolve_role.lambda_handler(delete_event, lambda_context)
        assert response is None

    def test_lambda_handler_missing_role_ref(self, lambda_context, env_vars):
        """Test exception when roleRef is missing."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {}
        }

        with pytest.raises(ValueError) as exc_info:
            resolve_role.lambda_handler(event, lambda_context)

        assert "Missing roleRef in request" in str(exc_info.value)

    # --- resolve_role_ref tests ---

    @patch.object(resolve_role, 'client')
    def test_resolve_by_name(self, mock_client, mock_role, env_vars):
        """Test resolving role by name."""
        mock_client.list_roles.return_value = {'Roles': [mock_role], 'IsTruncated': False}

        result = resolve_role.resolve_role_ref({'name': 'test-role'})

        assert result['Data']['name'] == 'test-role'

    @patch.object(resolve_role, 'client')
    def test_resolve_by_arn(self, mock_client, mock_role, env_vars):
        """Test resolving role by ARN."""
        mock_client.list_roles.return_value = {'Roles': [mock_role], 'IsTruncated': False}

        result = resolve_role.resolve_role_ref({'arn': mock_role['Arn']})

        assert result['Data']['arn'] == mock_role['Arn']

    @patch.object(resolve_role, 'client')
    def test_resolve_by_id(self, mock_client, mock_role, env_vars):
        """Test resolving role by ID."""
        mock_client.list_roles.return_value = {'Roles': [mock_role], 'IsTruncated': False}

        result = resolve_role.resolve_role_ref({'id': mock_role['RoleId']})

        assert result['Data']['id'] == mock_role['RoleId']

    @patch.object(resolve_role, 'client')
    def test_resolve_sso_role(self, mock_client, mock_sso_role, env_vars):
        """Test resolving SSO role by permission set name."""
        mock_client.list_roles.return_value = {'Roles': [mock_sso_role], 'IsTruncated': False}

        result = resolve_role.resolve_role_ref({'name': 'AdminAccess', 'sso': True})

        assert result['Data']['name'] == mock_sso_role['RoleName']

    @patch.object(resolve_role, 'client')
    def test_resolve_sso_role_ambiguous(self, mock_client, env_vars):
        """Test exception when multiple SSO roles match."""
        sso_role_1 = {
            'RoleId': 'AROASSO1',
            'RoleName': 'AWSReservedSSO_AdminAccess_abc123def456ghij',
            'Arn': 'arn:aws:iam::123456789012:role/AWSReservedSSO_AdminAccess_abc123def456ghij'
        }
        sso_role_2 = {
            'RoleId': 'AROASSO2',
            'RoleName': 'AWSReservedSSO_AdminAccess_xyz789uvw012klmn',
            'Arn': 'arn:aws:iam::123456789012:role/AWSReservedSSO_AdminAccess_xyz789uvw012klmn'
        }
        mock_client.list_roles.return_value = {'Roles': [sso_role_1, sso_role_2], 'IsTruncated': False}

        with pytest.raises(ValueError) as exc_info:
            resolve_role.resolve_role_ref({'name': 'AdminAccess', 'sso': True})

        assert "Ambiguous role resolution" in str(exc_info.value)

    @patch.object(resolve_role, 'client')
    def test_resolve_missing_identifier(self, mock_client, env_vars):
        """Test exception when no identifier provided."""
        mock_client.list_roles.return_value = {'Roles': [], 'IsTruncated': False}

        with pytest.raises(ValueError) as exc_info:
            resolve_role.resolve_role_ref({})

        assert "Called without id, arn or name specified" in str(exc_info.value)

    @patch.object(resolve_role, 'client')
    def test_resolve_role_not_found(self, mock_client, env_vars):
        """Test exception when role not found."""
        mock_client.list_roles.return_value = {'Roles': [], 'IsTruncated': False}
        mock_client.get_role.side_effect = ClientError(
            {'Error': {'Code': 'NoSuchEntity', 'Message': 'Role not found'}},
            'GetRole'
        )

        with pytest.raises(ValueError) as exc_info:
            resolve_role.resolve_role_ref({'name': 'nonexistent-role'})

        assert "Failed to resolve role" in str(exc_info.value)

    # --- fetch_role_from_iam tests ---

    @patch.object(resolve_role, 'client')
    def test_fetch_role_by_name(self, mock_client, mock_role, env_vars):
        """Test fetching role directly from IAM by name."""
        mock_client.get_role.return_value = {'Role': mock_role}

        result = resolve_role.fetch_role_from_iam({'name': 'test-role'})

        assert result == mock_role
        mock_client.get_role.assert_called_once_with(RoleName='test-role')

    @patch.object(resolve_role, 'client')
    def test_fetch_role_by_arn(self, mock_client, mock_role, env_vars):
        """Test fetching role directly from IAM by ARN."""
        mock_client.get_role.return_value = {'Role': mock_role}

        result = resolve_role.fetch_role_from_iam({'arn': 'arn:aws:iam::123456789012:role/test-role'})

        assert result == mock_role
        mock_client.get_role.assert_called_once_with(RoleName='test-role')

    @patch.object(resolve_role, 'client')
    def test_fetch_role_by_id_refreshes_cache(self, mock_client, mock_role, env_vars):
        """Test fetching role by ID refreshes the cache."""
        mock_client.list_roles.return_value = {'Roles': [mock_role], 'IsTruncated': False}

        result = resolve_role.fetch_role_from_iam({'id': mock_role['RoleId']})

        assert result == mock_role
        mock_client.list_roles.assert_called()

    @patch.object(resolve_role, 'client')
    def test_fetch_role_not_found_returns_none(self, mock_client, env_vars):
        """Test fetch returns None when role doesn't exist."""
        mock_client.get_role.side_effect = ClientError(
            {'Error': {'Code': 'NoSuchEntity', 'Message': 'Role not found'}},
            'GetRole'
        )

        result = resolve_role.fetch_role_from_iam({'name': 'nonexistent-role'})

        assert result is None

    @patch.object(resolve_role, 'client')
    def test_fetch_role_other_error_raises(self, mock_client, env_vars):
        """Test fetch raises on non-NoSuchEntity errors."""
        mock_client.get_role.side_effect = ClientError(
            {'Error': {'Code': 'AccessDenied', 'Message': 'Access denied'}},
            'GetRole'
        )

        with pytest.raises(ClientError):
            resolve_role.fetch_role_from_iam({'name': 'test-role'})

    # --- Lazy loading tests ---

    @patch.object(resolve_role, 'client')
    def test_lazy_loading_only_calls_once(self, mock_client, mock_role, env_vars):
        """Test that roles are only loaded once."""
        mock_client.list_roles.return_value = {'Roles': [mock_role], 'IsTruncated': False}

        # First call should load roles
        resolve_role.resolve_role_ref({'name': 'test-role'})
        # Second call should use cache
        resolve_role.resolve_role_ref({'name': 'test-role'})

        # list_roles should only be called once
        assert mock_client.list_roles.call_count == 1

    # --- Pagination tests ---

    @patch.object(resolve_role, 'client')
    def test_get_roles_handles_pagination(self, mock_client, env_vars):
        """Test that get_roles handles paginated responses."""
        role1 = {'RoleId': 'AROA1', 'RoleName': 'role1', 'Arn': 'arn:aws:iam::123456789012:role/role1'}
        role2 = {'RoleId': 'AROA2', 'RoleName': 'role2', 'Arn': 'arn:aws:iam::123456789012:role/role2'}

        mock_client.list_roles.side_effect = [
            {'Roles': [role1], 'IsTruncated': True, 'Marker': 'marker1'},
            {'Roles': [role2], 'IsTruncated': False}
        ]

        resolve_role.get_roles()

        assert 'role1' in resolve_role.role_name_map
        assert 'role2' in resolve_role.role_name_map
        assert mock_client.list_roles.call_count == 2

    # --- Cache update tests ---

    @patch.object(resolve_role, 'client')
    def test_cache_updated_after_fetch(self, mock_client, mock_role, env_vars):
        """Test that cache is updated after fetching a role."""
        # Initial list returns empty
        mock_client.list_roles.return_value = {'Roles': [], 'IsTruncated': False}
        # But get_role finds it
        mock_client.get_role.return_value = {'Role': mock_role}

        resolve_role.resolve_role_ref({'name': 'test-role'})

        # Role should now be in cache
        assert mock_role['RoleName'] in resolve_role.role_name_map
        assert mock_role['RoleId'] in resolve_role.role_id_map
        assert mock_role['Arn'] in resolve_role.role_arn_map
