"""Tests for DataZone Get User Profile Lambda function."""
import pytest
from unittest.mock import patch
import get_user_profile


class TestGetUserProfile:
    """Test cases for get_user_profile Lambda function."""

    @patch('get_user_profile.datazone_client')
    @patch('get_user_profile.time.sleep')
    def test_lambda_handler_create_success(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler successfully retrieves user profile on Create."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'domainIdentifier': 'test-domain-123',
                'arn': 'arn:aws:iam::123456789012:role/TestRole'
            }
        }
        
        mock_client.search_user_profiles.return_value = {
            'items': [
                {'id': 'user-profile-id-123', 'arn': 'arn:aws:iam::123456789012:role/TestRole'}
            ]
        }
        
        result = get_user_profile.lambda_handler(event, lambda_context)
        
        mock_client.search_user_profiles.assert_called_once_with(
            domainIdentifier='test-domain-123',
            userType='DATAZONE_IAM_USER',
            searchText='arn:aws:iam::123456789012:role/TestRole'
        )
        assert result['Status'] == '200'
        assert result['Data']['id'] == 'user-profile-id-123'

    @patch('get_user_profile.datazone_client')
    @patch('get_user_profile.time.sleep')
    def test_lambda_handler_update_success(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler successfully retrieves user profile on Update."""
        event = {
            'RequestType': 'Update',
            'ResourceProperties': {
                'domainIdentifier': 'test-domain-123',
                'arn': 'arn:aws:iam::123456789012:role/TestRole'
            }
        }
        
        mock_client.search_user_profiles.return_value = {
            'items': [
                {'id': 'user-profile-id-456'}
            ]
        }
        
        result = get_user_profile.lambda_handler(event, lambda_context)
        
        assert result['Status'] == '200'
        assert result['Data']['id'] == 'user-profile-id-456'

    @patch('get_user_profile.datazone_client')
    @patch('get_user_profile.time.sleep')
    def test_lambda_handler_no_user_profiles_found(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler when no user profiles are found."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'domainIdentifier': 'test-domain-123',
                'arn': 'arn:aws:iam::123456789012:role/NonExistentRole'
            }
        }
        
        mock_client.search_user_profiles.return_value = {'items': []}
        
        with pytest.raises(Exception, match="Unexected number of user profiles found"):
            get_user_profile.lambda_handler(event, lambda_context)

    @patch('get_user_profile.datazone_client')
    @patch('get_user_profile.time.sleep')
    def test_lambda_handler_multiple_user_profiles_found(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler when multiple user profiles are found."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'domainIdentifier': 'test-domain-123',
                'arn': 'arn:aws:iam::123456789012:role/DuplicateRole'
            }
        }
        
        mock_client.search_user_profiles.return_value = {
            'items': [
                {'id': 'user-profile-id-1'},
                {'id': 'user-profile-id-2'}
            ]
        }
        
        with pytest.raises(Exception, match="Unexected number of user profiles found"):
            get_user_profile.lambda_handler(event, lambda_context)

    @patch('get_user_profile.time.sleep')
    def test_lambda_handler_missing_domain_identifier(self, mock_sleep, aws_credentials, lambda_context):
        """Test lambda handler with missing domainIdentifier."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'arn': 'arn:aws:iam::123456789012:role/TestRole'
            }
        }
        
        with pytest.raises(Exception, match="Unable to parse domainIdentifier from event"):
            get_user_profile.lambda_handler(event, lambda_context)

    @patch('get_user_profile.time.sleep')
    def test_lambda_handler_delete_request(self, mock_sleep, aws_credentials, lambda_context):
        """Test lambda handler with Delete request (should return None)."""
        event = {
            'RequestType': 'Delete',
            'ResourceProperties': {
                'domainIdentifier': 'test-domain-123',
                'arn': 'arn:aws:iam::123456789012:role/TestRole'
            }
        }
        
        result = get_user_profile.lambda_handler(event, lambda_context)
        
        assert result is None
