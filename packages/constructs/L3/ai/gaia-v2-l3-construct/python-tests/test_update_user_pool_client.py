# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for update user pool client Lambda function.
Tests Cognito user pool client configuration updates.
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError

# Import the module under test
import sys
import os

from update_user_pool_client import lambda_handler, handle_create_update


class TestLambdaHandler:
    """Test class for lambda_handler function"""

    def setup_method(self):
        """Setup test fixtures"""
        self.user_pool_id = "us-east-1_abc123"
        self.client_id = "client-123456"
        self.cloudfront_domains = ["d123.cloudfront.net", "d456.cloudfront.net"]
        self.oauth_callback_urls = ["https://example.com/callback"]
        self.oauth_logout_urls = ["https://example.com/logout"]
        
        self.base_event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'UserPoolId': self.user_pool_id,
                'ClientId': self.client_id,
                'CloudfrontDomains': self.cloudfront_domains,
                'OAuthCallbackUrls': self.oauth_callback_urls,
                'OAuthLogoutUrls': self.oauth_logout_urls
            }
        }

    @patch('update_user_pool_client.handle_create_update')
    def test_lambda_handler_create_request(self, mock_handle):
        """Test lambda handler for Create request"""
        mock_handle.return_value = {'Status': 'SUCCESS'}
        
        result = lambda_handler(self.base_event, {})
        
        assert result['Status'] == 'SUCCESS'
        mock_handle.assert_called_once_with(self.base_event, {})

    @patch('update_user_pool_client.handle_create_update')
    def test_lambda_handler_update_request(self, mock_handle):
        """Test lambda handler for Update request"""
        event = self.base_event.copy()
        event['RequestType'] = 'Update'
        mock_handle.return_value = {'Status': 'SUCCESS'}
        
        result = lambda_handler(event, {})
        
        assert result['Status'] == 'SUCCESS'
        mock_handle.assert_called_once()

    def test_lambda_handler_delete_request(self):
        """Test lambda handler for Delete request"""
        event = self.base_event.copy()
        event['RequestType'] = 'Delete'
        
        result = lambda_handler(event, {})
        
        # Delete should return SUCCESS with no-op physical resource ID
        assert result['Status'] == 'SUCCESS'
        assert 'PhysicalResourceId' in result


class TestHandleCreateUpdate:
    """Test class for handle_create_update function"""

    def setup_method(self):
        """Setup test fixtures"""
        self.user_pool_id = "us-east-1_abc123"
        self.client_id = "client-123456"
        self.cloudfront_domains = ["d123.cloudfront.net", "d456.cloudfront.net"]
        self.oauth_callback_urls = ["https://example.com/callback"]
        self.oauth_logout_urls = ["https://example.com/logout"]
        
        self.base_event = {
            'ResourceProperties': {
                'UserPoolId': self.user_pool_id,
                'ClientId': self.client_id,
                'CloudfrontDomains': self.cloudfront_domains,
                'OAuthCallbackUrls': self.oauth_callback_urls,
                'OAuthLogoutUrls': self.oauth_logout_urls
            }
        }
        
        self.mock_current_config = {
            'ClientId': self.client_id,
            'UserPoolId': self.user_pool_id,
            'ClientName': 'TestClient',
            'RefreshTokenValidity': 30,
            'AccessTokenValidity': 60,
            'IdTokenValidity': 60,
            'CreationDate': '2024-01-01T00:00:00Z',
            'LastModifiedDate': '2024-01-01T00:00:00Z',
            'CallbackURLs': ['https://old.example.com'],
            'LogoutURLs': ['https://old.example.com/logout']
        }

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_success(self, mock_cognito):
        """Test successful user pool client update"""
        mock_cognito.describe_user_pool_client.return_value = {
            'UserPoolClient': self.mock_current_config
        }
        mock_cognito.update_user_pool_client.return_value = {}
        
        result = handle_create_update(self.base_event, {})
        
        assert result['Status'] == 'SUCCESS'
        assert 'PhysicalResourceId' in result
        
        # Verify describe was called
        mock_cognito.describe_user_pool_client.assert_called_once_with(
            UserPoolId=self.user_pool_id,
            ClientId=self.client_id
        )
        
        # Verify update was called
        mock_cognito.update_user_pool_client.assert_called_once()
        update_call = mock_cognito.update_user_pool_client.call_args[1]
        
        assert update_call['UserPoolId'] == self.user_pool_id
        assert update_call['ClientId'] == self.client_id

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_callback_urls(self, mock_cognito):
        """Test that callback URLs are correctly merged"""
        mock_cognito.describe_user_pool_client.return_value = {
            'UserPoolClient': self.mock_current_config
        }
        mock_cognito.update_user_pool_client.return_value = {}
        
        handle_create_update(self.base_event, {})
        
        update_call = mock_cognito.update_user_pool_client.call_args[1]
        callback_urls = update_call['CallbackURLs']
        
        # Should include HTTPS versions of CloudFront domains + OAuth callback URLs
        assert 'https://d123.cloudfront.net' in callback_urls
        assert 'https://d456.cloudfront.net' in callback_urls
        assert 'https://example.com/callback' in callback_urls
        assert len(callback_urls) == 3

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_logout_urls(self, mock_cognito):
        """Test that logout URLs are correctly merged"""
        mock_cognito.describe_user_pool_client.return_value = {
            'UserPoolClient': self.mock_current_config
        }
        mock_cognito.update_user_pool_client.return_value = {}
        
        handle_create_update(self.base_event, {})
        
        update_call = mock_cognito.update_user_pool_client.call_args[1]
        logout_urls = update_call['LogoutURLs']
        
        # Should include HTTPS versions of CloudFront domains + OAuth logout URLs
        assert 'https://d123.cloudfront.net' in logout_urls
        assert 'https://d456.cloudfront.net' in logout_urls
        assert 'https://example.com/logout' in logout_urls
        assert len(logout_urls) == 3

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_preserves_config(self, mock_cognito):
        """Test that existing configuration is preserved"""
        mock_cognito.describe_user_pool_client.return_value = {
            'UserPoolClient': self.mock_current_config
        }
        mock_cognito.update_user_pool_client.return_value = {}
        
        handle_create_update(self.base_event, {})
        
        update_call = mock_cognito.update_user_pool_client.call_args[1]
        
        # These should be preserved from current config
        assert update_call['ClientName'] == 'TestClient'
        assert update_call['RefreshTokenValidity'] == 30
        assert update_call['AccessTokenValidity'] == 60
        
        # These should NOT be included (filtered out)
        assert 'CreationDate' not in update_call
        assert 'LastModifiedDate' not in update_call

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_missing_user_pool_id(self, mock_cognito):
        """Test error handling when UserPoolId is missing"""
        event = {'ResourceProperties': {'ClientId': self.client_id}}
        
        with pytest.raises(Exception, match="Unable to parse userPoolId from event"):
            handle_create_update(event, {})

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_missing_client_id(self, mock_cognito):
        """Test error handling when ClientId is missing"""
        event = {'ResourceProperties': {'UserPoolId': self.user_pool_id}}
        
        with pytest.raises(Exception, match="Unable to parse clientId from event"):
            handle_create_update(event, {})

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_empty_cloudfront_domains(self, mock_cognito):
        """Test handling empty CloudFront domains list"""
        mock_cognito.describe_user_pool_client.return_value = {
            'UserPoolClient': self.mock_current_config
        }
        mock_cognito.update_user_pool_client.return_value = {}
        
        event = self.base_event.copy()
        event['ResourceProperties']['CloudfrontDomains'] = []
        
        handle_create_update(event, {})
        
        update_call = mock_cognito.update_user_pool_client.call_args[1]
        
        # Should only have OAuth URLs, no CloudFront domains
        assert len(update_call['CallbackURLs']) == 1
        assert update_call['CallbackURLs'][0] == 'https://example.com/callback'

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_empty_oauth_urls(self, mock_cognito):
        """Test handling empty OAuth URLs"""
        mock_cognito.describe_user_pool_client.return_value = {
            'UserPoolClient': self.mock_current_config
        }
        mock_cognito.update_user_pool_client.return_value = {}
        
        event = self.base_event.copy()
        event['ResourceProperties']['OAuthCallbackUrls'] = []
        event['ResourceProperties']['OAuthLogoutUrls'] = []
        
        handle_create_update(event, {})
        
        update_call = mock_cognito.update_user_pool_client.call_args[1]
        
        # Should only have CloudFront domains
        assert len(update_call['CallbackURLs']) == 2
        assert 'https://d123.cloudfront.net' in update_call['CallbackURLs']

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_physical_resource_id(self, mock_cognito):
        """Test PhysicalResourceId format"""
        mock_cognito.describe_user_pool_client.return_value = {
            'UserPoolClient': self.mock_current_config
        }
        mock_cognito.update_user_pool_client.return_value = {}
        
        result = handle_create_update(self.base_event, {})
        
        # PhysicalResourceId should include all relevant identifiers
        physical_id = result['PhysicalResourceId']
        assert self.user_pool_id in physical_id
        assert self.client_id in physical_id
        assert str(self.cloudfront_domains) in physical_id


class TestUpdateUserPoolClientEdgeCases:
    """Test edge cases and error scenarios"""

    def setup_method(self):
        """Setup test fixtures"""
        self.base_event = {
            'ResourceProperties': {
                'UserPoolId': 'pool-123',
                'ClientId': 'client-456',
                'CloudfrontDomains': ['d1.cloudfront.net'],
                'OAuthCallbackUrls': ['https://app.com/callback'],
                'OAuthLogoutUrls': ['https://app.com/logout']
            }
        }
        
        self.mock_config = {
            'ClientId': 'client-456',
            'UserPoolId': 'pool-123',
            'ClientName': 'Test'
        }

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_cognito_error(self, mock_cognito):
        """Test handling Cognito API errors"""
        mock_cognito.describe_user_pool_client.side_effect = ClientError(
            {'Error': {'Code': 'ResourceNotFoundException', 'Message': 'User pool not found'}},
            'DescribeUserPoolClient'
        )
        
        with pytest.raises(ClientError):
            handle_create_update(self.base_event, {})

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_with_special_characters_in_urls(self, mock_cognito):
        """Test handling URLs with special characters"""
        mock_cognito.describe_user_pool_client.return_value = {
            'UserPoolClient': self.mock_config
        }
        mock_cognito.update_user_pool_client.return_value = {}
        
        event = self.base_event.copy()
        event['ResourceProperties']['OAuthCallbackUrls'] = [
            'https://example.com/callback?param=value&other=123'
        ]
        
        result = handle_create_update(event, {})
        
        assert result['Status'] == 'SUCCESS'

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_multiple_cloudfront_domains(self, mock_cognito):
        """Test handling multiple CloudFront domains"""
        mock_cognito.describe_user_pool_client.return_value = {
            'UserPoolClient': self.mock_config
        }
        mock_cognito.update_user_pool_client.return_value = {}
        
        event = self.base_event.copy()
        event['ResourceProperties']['CloudfrontDomains'] = [
            'd1.cloudfront.net',
            'd2.cloudfront.net',
            'd3.cloudfront.net',
            'd4.cloudfront.net'
        ]
        
        handle_create_update(event, {})
        
        update_call = mock_cognito.update_user_pool_client.call_args[1]
        
        # Should have 4 CloudFront domains + 1 OAuth callback URL
        assert len(update_call['CallbackURLs']) == 5
        assert all(url.startswith('https://') for url in update_call['CallbackURLs'])

    @patch('update_user_pool_client.cognito_client')
    def test_handle_create_update_filters_excluded_fields(self, mock_cognito):
        """Test that excluded fields are properly filtered"""
        full_config = {
            'ClientId': 'client-456',
            'UserPoolId': 'pool-123',
            'ClientName': 'Test',
            'CreationDate': '2024-01-01',
            'LastModifiedDate': '2024-01-02',
            'CallbackURLs': ['old-url'],
            'LogoutURLs': ['old-logout']
        }
        
        mock_cognito.describe_user_pool_client.return_value = {
            'UserPoolClient': full_config
        }
        mock_cognito.update_user_pool_client.return_value = {}
        
        handle_create_update(self.base_event, {})
        
        update_call = mock_cognito.update_user_pool_client.call_args[1]
        
        # These should be filtered out
        assert 'CreationDate' not in update_call
        assert 'LastModifiedDate' not in update_call
        # But ClientName should be preserved
        assert 'ClientName' in update_call


if __name__ == '__main__':
    pytest.main([__file__])