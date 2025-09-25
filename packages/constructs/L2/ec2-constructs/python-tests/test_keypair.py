"""
Unit tests for keypair Lambda function.
"""
import pytest
import os
import sys
from unittest.mock import patch, MagicMock, Mock
from moto import mock_aws
import boto3

# Import the module under test
import keypair


class TestKeypair:
    """Test cases for keypair module."""
    
    @mock_aws
    @patch('keypair.time.sleep')
    def test_lambda_handler_create_success(self, mock_sleep, aws_credentials, lambda_context, create_event, env_vars):
        """Test successful keypair creation."""
        mock_sleep.return_value = None
        
        # Create EC2 client for testing
        ec2 = boto3.client('ec2', region_name='us-east-1')
        
        # Patch the ec2 client in the module to use our mocked client
        with patch.object(keypair, 'ec2', ec2):
            response = keypair.lambda_handler(create_event, lambda_context)
            
            assert response['Status'] == '200'
            assert response['PhysicalResourceId'] == 'test-keypair'
            assert 'key_pair_id' in response['Data']
            assert 'key_material' in response['Data']
            mock_sleep.assert_called_once_with(30)
    
    @patch('keypair.time.sleep')
    def test_lambda_handler_non_create_request(self, mock_sleep, lambda_context, env_vars):
        """Test non-create request types."""
        mock_sleep.return_value = None
        event = {
            'RequestType': 'Update',
            'ResourceProperties': {
                'keypairName': 'test-keypair'
            }
        }
        
        response = keypair.lambda_handler(event, lambda_context)
        
        assert response is None
        mock_sleep.assert_called_once_with(30)
    
    @mock_aws
    def test_handle_create_success(self, aws_credentials, lambda_context, create_event, env_vars):
        """Test successful handle_create function."""
        # Create EC2 client for testing
        ec2 = boto3.client('ec2', region_name='us-east-1')
        
        # Patch the ec2 client in the module to use our mocked client
        with patch.object(keypair, 'ec2', ec2):
            response = keypair.handle_create(create_event, lambda_context)
            
            assert response['Status'] == '200'
            assert response['PhysicalResourceId'] == 'test-keypair'
            assert 'key_pair_id' in response['Data']
            assert 'key_material' in response['Data']
    
    def test_handle_create_missing_keypair_name(self, lambda_context):
        """Test handle_create with missing keypair name."""
        event = {
            'ResourceProperties': {}
        }
        
        with pytest.raises(Exception) as exc_info:
            keypair.handle_create(event, lambda_context)
        
        assert "Missing parameters in request" in str(exc_info.value)
    
    def test_handle_create_none_keypair_name(self, lambda_context):
        """Test handle_create with None keypair name."""
        event = {
            'ResourceProperties': {
                'keypairName': None
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            keypair.handle_create(event, lambda_context)
        
        assert "Missing parameters in request" in str(exc_info.value)
    
    @patch('keypair.ec2')
    def test_handle_create_ec2_error(self, mock_ec2_client, lambda_context, create_event):
        """Test handle_create with EC2 error."""
        mock_ec2_client.create_key_pair.side_effect = Exception("EC2 error")
        
        with pytest.raises(Exception) as exc_info:
            keypair.handle_create(create_event, lambda_context)
        
        assert "EC2 error" in str(exc_info.value)