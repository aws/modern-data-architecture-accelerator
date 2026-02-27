"""
Unit tests for check_user_profiles Lambda function.
"""
import pytest
from unittest.mock import patch, MagicMock

import user_profile_checker
import check_user_profiles


class TestUserProfileChecker:
    """Test cases for user_profile_checker module."""

    def test_check_user_profile_exists(self, mock_datazone_client):
        """Test when user profile exists."""
        mock_datazone_client.get_domain.return_value = {
            'singleSignOn': {'userAssignment': 'MANUAL'}
        }
        mock_datazone_client.get_user_profile.return_value = {
            'id': 'profile-123'
        }

        result = user_profile_checker.check_user_profile(
            'dzd_test123',
            'arn:aws:iam::123456789012:user/testuser',
            mock_datazone_client
        )

        assert result == 'profile-123'
        mock_datazone_client.get_domain.assert_called_once_with(identifier='dzd_test123')
        mock_datazone_client.get_user_profile.assert_called_once_with(
            domainIdentifier='dzd_test123',
            userIdentifier='arn:aws:iam::123456789012:user/testuser'
        )

    def test_check_user_profile_not_found_automatic_mode(self, mock_datazone_client):
        """Test when user profile doesn't exist but domain is in AUTOMATIC mode."""
        mock_datazone_client.get_domain.return_value = {
            'singleSignOn': {'userAssignment': 'AUTOMATIC'}
        }
        mock_datazone_client.get_user_profile.side_effect = (
            mock_datazone_client.exceptions.ResourceNotFoundException('Profile not found')
        )

        result = user_profile_checker.check_user_profile(
            'dzd_test123',
            'arn:aws:iam::123456789012:user/testuser',
            mock_datazone_client
        )

        assert result is None

    def test_check_user_profile_not_found_manual_mode(self, mock_datazone_client):
        """Test when user profile doesn't exist and domain is in MANUAL mode."""
        mock_datazone_client.get_domain.return_value = {
            'singleSignOn': {'userAssignment': 'MANUAL'}
        }
        mock_datazone_client.get_user_profile.side_effect = (
            mock_datazone_client.exceptions.ResourceNotFoundException('Profile not found')
        )

        with pytest.raises(ValueError) as exc_info:
            user_profile_checker.check_user_profile(
                'dzd_test123',
                'arn:aws:iam::123456789012:user/testuser',
                mock_datazone_client
            )

        assert 'User profile does not exist' in str(exc_info.value)
        assert 'MANUAL' in str(exc_info.value)

    def test_check_user_profile_missing_sso_config(self, mock_datazone_client):
        """Test when domain response has no singleSignOn config."""
        mock_datazone_client.get_domain.return_value = {}
        mock_datazone_client.get_user_profile.side_effect = (
            mock_datazone_client.exceptions.ResourceNotFoundException('Profile not found')
        )

        with pytest.raises(ValueError) as exc_info:
            user_profile_checker.check_user_profile(
                'dzd_test123',
                'arn:aws:iam::123456789012:user/testuser',
                mock_datazone_client
            )

        assert 'UNKNOWN' in str(exc_info.value)


class TestLambdaHandler:
    """Test cases for lambda_handler function."""

    @patch('check_user_profiles.check_user_profile')
    @patch('check_user_profiles.datazone_client')
    def test_lambda_handler_create_success(
        self, mock_client, mock_check_profile, lambda_context, create_event
    ):
        """Test successful Create request."""
        mock_check_profile.return_value = 'profile-123'

        response = check_user_profiles.lambda_handler(create_event, lambda_context)

        assert response['Data']['id'] == 'profile-123'
        mock_check_profile.assert_called_once_with(
            'dzd_test123',
            'arn:aws:iam::123456789012:user/testuser',
            mock_client
        )

    @patch('check_user_profiles.check_user_profile')
    @patch('check_user_profiles.datazone_client')
    def test_lambda_handler_update_success(
        self, mock_client, mock_check_profile, lambda_context, update_event
    ):
        """Test successful Update request."""
        mock_check_profile.return_value = 'profile-456'

        response = check_user_profiles.lambda_handler(update_event, lambda_context)

        assert response['Data']['id'] == 'profile-456'
        mock_check_profile.assert_called_once()

    @patch('check_user_profiles.check_user_profile')
    @patch('check_user_profiles.datazone_client')
    def test_lambda_handler_delete_no_action(
        self, mock_client, mock_check_profile, lambda_context, delete_event
    ):
        """Test Delete request returns None (no action needed)."""
        response = check_user_profiles.lambda_handler(delete_event, lambda_context)

        assert response is None
        mock_check_profile.assert_not_called()
