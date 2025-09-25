"""
Unit tests for lifecycle Lambda function.
"""
import pytest
import os
import sys
from unittest.mock import patch, MagicMock, Mock
import boto3
from botocore.exceptions import ClientError

# Import the module under test
import lifecycle


class TestLifecycle:
    """Test cases for lifecycle module."""
    
    @patch('lifecycle.time.sleep')
    @patch('lifecycle.sagemaker_client')
    def test_lambda_handler_create_success(self, mock_sagemaker_client, mock_sleep, aws_credentials, lambda_context, create_event, env_vars):
        """Test successful lifecycle config creation."""
        mock_sleep.return_value = None
        mock_sagemaker_client.create_studio_lifecycle_config.return_value = {
            'StudioLifecycleConfigArn': 'arn:aws:sagemaker:us-east-1:123456789012:studio-lifecycle-config/test-lifecycle-config-c09ce2d552'
        }
        
        response = lifecycle.lambda_handler(create_event, lambda_context)
        
        assert response['Status'] == 'SUCCESS'
        assert 'test-lifecycle-config-' in response['PhysicalResourceId']
        assert 'StudioLifecycleConfigArn' in response['Data']
        mock_sleep.assert_called_once_with(30)
        mock_sagemaker_client.create_studio_lifecycle_config.assert_called_once()
    
    @patch('lifecycle.time.sleep')
    @patch('lifecycle.sagemaker_client')
    def test_lambda_handler_update_success(self, mock_sagemaker_client, mock_sleep, aws_credentials, lambda_context, update_event, env_vars):
        """Test successful lifecycle config update."""
        mock_sleep.return_value = None
        mock_sagemaker_client.delete_studio_lifecycle_config.return_value = {}
        mock_sagemaker_client.create_studio_lifecycle_config.return_value = {
            'StudioLifecycleConfigArn': 'arn:aws:sagemaker:us-east-1:123456789012:studio-lifecycle-config/test-lifecycle-config-updated'
        }
        
        response = lifecycle.lambda_handler(update_event, lambda_context)
        
        assert response['Status'] == 'SUCCESS'
        assert 'test-lifecycle-config-' in response['PhysicalResourceId']
        assert 'StudioLifecycleConfigArn' in response['Data']
        # Should sleep twice: once for delete, once for create
        assert mock_sleep.call_count == 2
        mock_sagemaker_client.delete_studio_lifecycle_config.assert_called_once()
        mock_sagemaker_client.create_studio_lifecycle_config.assert_called_once()
    
    @patch('lifecycle.time.sleep')
    @patch('lifecycle.sagemaker_client')
    def test_lambda_handler_delete_success(self, mock_sagemaker_client, mock_sleep, aws_credentials, lambda_context, delete_event, env_vars):
        """Test successful lifecycle config deletion."""
        mock_sleep.return_value = None
        mock_sagemaker_client.delete_studio_lifecycle_config.return_value = {}
        
        response = lifecycle.lambda_handler(delete_event, lambda_context)
        
        assert response['Status'] == 'SUCCESS'
        mock_sleep.assert_called_once_with(30)
        mock_sagemaker_client.delete_studio_lifecycle_config.assert_called_once_with(
            StudioLifecycleConfigName='test-lifecycle-config-abcd123456'
        )
    
    @patch('lifecycle.sagemaker_client')
    def test_handle_create_success(self, mock_sagemaker_client, aws_credentials, lambda_context, create_event, env_vars):
        """Test successful handle_create function."""
        mock_sagemaker_client.create_studio_lifecycle_config.return_value = {
            'StudioLifecycleConfigArn': 'arn:aws:sagemaker:us-east-1:123456789012:studio-lifecycle-config/test-lifecycle-config-c09ce2d552'
        }
        
        response = lifecycle.handle_create(create_event, lambda_context)
        
        assert response['Status'] == 'SUCCESS'
        assert 'test-lifecycle-config-' in response['PhysicalResourceId']
        assert 'StudioLifecycleConfigArn' in response['Data']
        mock_sagemaker_client.create_studio_lifecycle_config.assert_called_once()
    
    def test_handle_create_missing_lifecycle_config_name(self, lambda_context):
        """Test handle_create with missing lifecycle config name."""
        event = {
            'ResourceProperties': {
                'lifecycleConfigContent': '#!/bin/bash\necho "test"',
                'lifecycleConfigAppType': 'JupyterServer'
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            lifecycle.handle_create(event, lambda_context)
        
        assert "Unable to parse lifecycleConfigName from event" in str(exc_info.value)
    
    def test_handle_create_missing_lifecycle_config_content(self, lambda_context):
        """Test handle_create with missing lifecycle config content."""
        event = {
            'ResourceProperties': {
                'lifecycleConfigName': 'test-config',
                'lifecycleConfigAppType': 'JupyterServer'
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            lifecycle.handle_create(event, lambda_context)
        
        assert "Unable to parse lifecycleConfigContent from event" in str(exc_info.value)
    
    def test_handle_create_missing_lifecycle_config_app_type(self, lambda_context):
        """Test handle_create with missing lifecycle config app type."""
        event = {
            'ResourceProperties': {
                'lifecycleConfigName': 'test-config',
                'lifecycleConfigContent': '#!/bin/bash\necho "test"'
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            lifecycle.handle_create(event, lambda_context)
        
        assert "Unable to parse lifecycleConfigAppType from event" in str(exc_info.value)
    
    @patch('lifecycle.sagemaker_client')
    def test_handle_create_sagemaker_error(self, mock_sagemaker_client, lambda_context, create_event):
        """Test handle_create with SageMaker error."""
        mock_sagemaker_client.create_studio_lifecycle_config.side_effect = Exception("SageMaker error")
        
        with pytest.raises(Exception) as exc_info:
            lifecycle.handle_create(create_event, lambda_context)
        
        assert "SageMaker error" in str(exc_info.value)
    
    @patch('lifecycle.sagemaker_client')
    def test_handle_delete_success(self, mock_sagemaker_client, aws_credentials, lambda_context, delete_event, env_vars):
        """Test successful handle_delete function."""
        mock_sagemaker_client.delete_studio_lifecycle_config.return_value = {}
        
        response = lifecycle.handle_delete(delete_event, lambda_context)
        
        assert response['Status'] == 'SUCCESS'
        mock_sagemaker_client.delete_studio_lifecycle_config.assert_called_once_with(
            StudioLifecycleConfigName='test-lifecycle-config-abcd123456'
        )
    
    def test_handle_delete_missing_physical_resource_id(self, lambda_context):
        """Test handle_delete with missing PhysicalResourceId."""
        event = {}
        
        with pytest.raises(Exception) as exc_info:
            lifecycle.handle_delete(event, lambda_context)
        
        assert "Unable to parse lifecycleConfigName from event" in str(exc_info.value)
    
    @patch('lifecycle.sagemaker_client')
    def test_handle_delete_resource_in_use(self, mock_sagemaker_client, lambda_context, delete_event):
        """Test handle_delete with ResourceInUse error."""
        error_response = {'Error': {'Code': 'ResourceInUse'}}
        mock_sagemaker_client.delete_studio_lifecycle_config.side_effect = ClientError(error_response, 'DeleteStudioLifecycleConfig')
        
        # Should not raise exception, just log warning
        response = lifecycle.handle_delete(delete_event, lambda_context)
        assert response['Status'] == 'SUCCESS'
    
    @patch('lifecycle.sagemaker_client')
    def test_handle_delete_resource_not_found(self, mock_sagemaker_client, lambda_context, delete_event):
        """Test handle_delete with ResourceNotFound error."""
        error_response = {'Error': {'Code': 'ResourceNotFound'}}
        mock_sagemaker_client.delete_studio_lifecycle_config.side_effect = ClientError(error_response, 'DeleteStudioLifecycleConfig')
        
        # Should not raise exception, just log warning
        response = lifecycle.handle_delete(delete_event, lambda_context)
        assert response['Status'] == 'SUCCESS'
    
    @patch('lifecycle.sagemaker_client')
    def test_handle_delete_other_error(self, mock_sagemaker_client, lambda_context, delete_event):
        """Test handle_delete with other ClientError."""
        error_response = {'Error': {'Code': 'ValidationException'}}
        mock_sagemaker_client.delete_studio_lifecycle_config.side_effect = ClientError(error_response, 'DeleteStudioLifecycleConfig')
        
        # Should raise the exception
        with pytest.raises(ClientError):
            lifecycle.handle_delete(delete_event, lambda_context)
    
    @patch('lifecycle.sagemaker_client')
    def test_lifecycle_config_name_with_hash(self, mock_sagemaker_client, aws_credentials, lambda_context, create_event, env_vars):
        """Test that lifecycle config name includes content hash."""
        mock_sagemaker_client.create_studio_lifecycle_config.return_value = {
            'StudioLifecycleConfigArn': 'arn:aws:sagemaker:us-east-1:123456789012:studio-lifecycle-config/test-lifecycle-config-c09ce2d552'
        }
        
        response = lifecycle.handle_create(create_event, lambda_context)
        
        # The PhysicalResourceId should contain the original name plus a hash
        physical_id = response['PhysicalResourceId']
        assert physical_id.startswith('test-lifecycle-config-')
        assert len(physical_id) > len('test-lifecycle-config-')
        # Hash should be 10 characters
        hash_part = physical_id.replace('test-lifecycle-config-', '')
        assert len(hash_part) == 10