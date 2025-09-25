"""
Unit tests for volume_check Lambda function.
"""
import pytest
import os
import sys
from unittest.mock import patch, MagicMock, Mock
from moto import mock_aws
import boto3

# Add the source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'lambda', 'volume_check')
sys.path.insert(0, src_path)

# Import the module under test
import volume_check


class TestVolumeCheck:
    """Test cases for volume_check module."""
    
    @pytest.fixture
    def create_event(self):
        """CloudFormation Create event for volume check testing."""
        return {
            "RequestType": "Create",
            "ResponseURL": "https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test",
            "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "TestVolumeCheck",
            "ResourceType": "Custom::VolumeCheck",
            "ResourceProperties": {
                "instanceId": "i-1234567890abcdef0",
                "kmsKeyArn": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
            }
        }
    
    @pytest.fixture
    def mock_instance_response(self):
        """Mock EC2 describe_instances response."""
        return {
            'Reservations': [{
                'Instances': [{
                    'InstanceId': 'i-1234567890abcdef0',
                    'BlockDeviceMappings': [
                        {
                            'DeviceName': '/dev/sda1',
                            'Ebs': {
                                'VolumeId': 'vol-1234567890abcdef0'
                            }
                        },
                        {
                            'DeviceName': '/dev/sdf',
                            'Ebs': {
                                'VolumeId': 'vol-0987654321fedcba0'
                            }
                        }
                    ]
                }]
            }]
        }
    
    @pytest.fixture
    def mock_volumes_response_encrypted(self):
        """Mock EC2 describe_volumes response with properly encrypted volumes."""
        return {
            'Volumes': [
                {
                    'VolumeId': 'vol-1234567890abcdef0',
                    'Encrypted': True,
                    'KmsKeyId': 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
                },
                {
                    'VolumeId': 'vol-0987654321fedcba0',
                    'Encrypted': True,
                    'KmsKeyId': 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
                }
            ]
        }
    
    @pytest.fixture
    def mock_volumes_response_unencrypted(self):
        """Mock EC2 describe_volumes response with unencrypted volumes."""
        return {
            'Volumes': [
                {
                    'VolumeId': 'vol-1234567890abcdef0',
                    'Encrypted': False
                },
                {
                    'VolumeId': 'vol-0987654321fedcba0',
                    'Encrypted': False
                }
            ]
        }
    
    @pytest.fixture
    def mock_volumes_response_wrong_key(self):
        """Mock EC2 describe_volumes response with wrong KMS key."""
        return {
            'Volumes': [
                {
                    'VolumeId': 'vol-1234567890abcdef0',
                    'Encrypted': True,
                    'KmsKeyId': 'arn:aws:kms:us-east-1:123456789012:key/wrong-key-id'
                },
                {
                    'VolumeId': 'vol-0987654321fedcba0',
                    'Encrypted': True,
                    'KmsKeyId': 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
                }
            ]
        }
    
    @patch('volume_check.time.sleep')
    def test_lambda_handler_create_success(self, mock_sleep, create_event, lambda_context, env_vars, 
                                         mock_instance_response, mock_volumes_response_encrypted):
        """Test successful volume check on Create request."""
        mock_sleep.return_value = None
        
        with patch.object(volume_check, 'ec2') as mock_ec2:
            mock_ec2.describe_instances.return_value = mock_instance_response
            mock_ec2.describe_volumes.return_value = mock_volumes_response_encrypted
            
            response = volume_check.lambda_handler(create_event, lambda_context)
            
            assert response['Status'] == '200'
            mock_sleep.assert_called_once_with(30)
            mock_ec2.describe_instances.assert_called_once_with(InstanceIds=['i-1234567890abcdef0'])
            mock_ec2.describe_volumes.assert_called_once_with(VolumeIds=['vol-1234567890abcdef0', 'vol-0987654321fedcba0'])
    
    @patch('volume_check.time.sleep')
    def test_lambda_handler_non_create_request(self, mock_sleep, lambda_context, env_vars):
        """Test non-create request types return None."""
        mock_sleep.return_value = None
        event = {
            'RequestType': 'Update',
            'ResourceProperties': {
                'instanceId': 'i-1234567890abcdef0',
                'kmsKeyArn': 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
            }
        }
        
        response = volume_check.lambda_handler(event, lambda_context)
        
        assert response is None
        mock_sleep.assert_called_once_with(30)
    
    def test_handle_create_success(self, create_event, lambda_context, 
                                 mock_instance_response, mock_volumes_response_encrypted):
        """Test successful handle_create function."""
        with patch.object(volume_check, 'ec2') as mock_ec2:
            mock_ec2.describe_instances.return_value = mock_instance_response
            mock_ec2.describe_volumes.return_value = mock_volumes_response_encrypted
            
            response = volume_check.handle_create(create_event, lambda_context)
            
            assert response['Status'] == '200'
            mock_ec2.describe_instances.assert_called_once_with(InstanceIds=['i-1234567890abcdef0'])
            mock_ec2.describe_volumes.assert_called_once_with(VolumeIds=['vol-1234567890abcdef0', 'vol-0987654321fedcba0'])
    
    def test_handle_create_missing_instance_id(self, lambda_context):
        """Test handle_create with missing instanceId parameter."""
        event = {
            'ResourceProperties': {
                'kmsKeyArn': 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            volume_check.handle_create(event, lambda_context)
        
        assert "Missing parameter 'instanceId'" in str(exc_info.value)
    
    def test_handle_create_missing_kms_key_arn(self, lambda_context):
        """Test handle_create with missing kmsKeyArn parameter."""
        event = {
            'ResourceProperties': {
                'instanceId': 'i-1234567890abcdef0'
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            volume_check.handle_create(event, lambda_context)
        
        assert "Missing parameter 'kmsKeyArn'" in str(exc_info.value)
    
    def test_handle_create_none_instance_id(self, lambda_context):
        """Test handle_create with None instanceId."""
        event = {
            'ResourceProperties': {
                'instanceId': None,
                'kmsKeyArn': 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            volume_check.handle_create(event, lambda_context)
        
        assert "Missing parameter 'instanceId'" in str(exc_info.value)
    
    def test_handle_create_none_kms_key_arn(self, lambda_context):
        """Test handle_create with None kmsKeyArn."""
        event = {
            'ResourceProperties': {
                'instanceId': 'i-1234567890abcdef0',
                'kmsKeyArn': None
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            volume_check.handle_create(event, lambda_context)
        
        assert "Missing parameter 'kmsKeyArn'" in str(exc_info.value)
    
    def test_handle_create_unencrypted_volumes(self, create_event, lambda_context,
                                             mock_instance_response, mock_volumes_response_unencrypted):
        """Test handle_create with unencrypted volumes raises exception."""
        with patch.object(volume_check, 'ec2') as mock_ec2:
            mock_ec2.describe_instances.return_value = mock_instance_response
            mock_ec2.describe_volumes.return_value = mock_volumes_response_unencrypted
            
            with pytest.raises(Exception) as exc_info:
                volume_check.handle_create(create_event, lambda_context)
            
            assert "Errors validating instance" in str(exc_info.value)
            assert "is not encrypted with the expected Key" in str(exc_info.value)
    
    def test_handle_create_wrong_kms_key(self, create_event, lambda_context,
                                       mock_instance_response, mock_volumes_response_wrong_key):
        """Test handle_create with wrong KMS key raises exception."""
        with patch.object(volume_check, 'ec2') as mock_ec2:
            mock_ec2.describe_instances.return_value = mock_instance_response
            mock_ec2.describe_volumes.return_value = mock_volumes_response_wrong_key
            
            with pytest.raises(Exception) as exc_info:
                volume_check.handle_create(create_event, lambda_context)
            
            assert "Errors validating instance" in str(exc_info.value)
            assert "is encrypted with Key" in str(exc_info.value)
            assert "not the expected Key" in str(exc_info.value)
    
    def test_handle_create_describe_instances_error(self, create_event, lambda_context):
        """Test handle_create with EC2 describe_instances error."""
        with patch.object(volume_check, 'ec2') as mock_ec2:
            mock_ec2.describe_instances.side_effect = Exception("EC2 describe_instances error")
            
            with pytest.raises(Exception) as exc_info:
                volume_check.handle_create(create_event, lambda_context)
            
            assert "EC2 describe_instances error" in str(exc_info.value)
    
    def test_handle_create_describe_volumes_error(self, create_event, lambda_context, mock_instance_response):
        """Test handle_create with EC2 describe_volumes error."""
        with patch.object(volume_check, 'ec2') as mock_ec2:
            mock_ec2.describe_instances.return_value = mock_instance_response
            mock_ec2.describe_volumes.side_effect = Exception("EC2 describe_volumes error")
            
            with pytest.raises(Exception) as exc_info:
                volume_check.handle_create(create_event, lambda_context)
            
            assert "EC2 describe_volumes error" in str(exc_info.value)
    
    def test_handle_create_mixed_volume_encryption_status(self, create_event, lambda_context, mock_instance_response):
        """Test handle_create with mixed volume encryption status."""
        mixed_volumes_response = {
            'Volumes': [
                {
                    'VolumeId': 'vol-1234567890abcdef0',
                    'Encrypted': True,
                    'KmsKeyId': 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
                },
                {
                    'VolumeId': 'vol-0987654321fedcba0',
                    'Encrypted': False
                }
            ]
        }
        
        with patch.object(volume_check, 'ec2') as mock_ec2:
            mock_ec2.describe_instances.return_value = mock_instance_response
            mock_ec2.describe_volumes.return_value = mixed_volumes_response
            
            with pytest.raises(Exception) as exc_info:
                volume_check.handle_create(create_event, lambda_context)
            
            error_message = str(exc_info.value)
            assert "Errors validating instance" in error_message
            assert "/dev/sdf (vol-0987654321fedcba0) is not encrypted" in error_message
    
    def test_handle_create_volume_encrypted_but_no_kms_key(self, create_event, lambda_context, mock_instance_response):
        """Test handle_create with encrypted volume but missing KMS key."""
        volumes_response_no_kms = {
            'Volumes': [
                {
                    'VolumeId': 'vol-1234567890abcdef0',
                    'Encrypted': True
                    # Missing KmsKeyId
                }
            ]
        }
        
        # Update instance response to have only one volume
        single_volume_instance_response = {
            'Reservations': [{
                'Instances': [{
                    'InstanceId': 'i-1234567890abcdef0',
                    'BlockDeviceMappings': [
                        {
                            'DeviceName': '/dev/sda1',
                            'Ebs': {
                                'VolumeId': 'vol-1234567890abcdef0'
                            }
                        }
                    ]
                }]
            }]
        }
        
        with patch.object(volume_check, 'ec2') as mock_ec2:
            mock_ec2.describe_instances.return_value = single_volume_instance_response
            mock_ec2.describe_volumes.return_value = volumes_response_no_kms
            
            with pytest.raises(Exception) as exc_info:
                volume_check.handle_create(create_event, lambda_context)
            
            assert "is not encrypted with the expected Key" in str(exc_info.value)