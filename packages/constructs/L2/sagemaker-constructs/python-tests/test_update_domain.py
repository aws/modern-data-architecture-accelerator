"""Tests for SageMaker Update Domain Lambda function."""
import pytest
from unittest.mock import patch, MagicMock
import update_domain


class TestUpdateDomain:
    """Test cases for update_domain Lambda function."""

    @patch('update_domain.sagemaker_client')
    @patch('update_domain.time.sleep')
    def test_lambda_handler_create_success(self, mock_sleep, mock_client, aws_credentials, lambda_context, env_vars):
        """Test lambda handler for Create request."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'DomainId': 'd-test123456',
                'DefaultUserSettings': {
                    'ExecutionRole': 'arn:aws:iam::123456789012:role/SageMakerRole'
                },
                'DomainSettingsForUpdate': {
                    'RStudioServerProDomainSettingsForUpdate': {
                        'DomainExecutionRoleArn': 'arn:aws:iam::123456789012:role/DomainRole'
                    }
                }
            }
        }
        
        mock_client.update_domain.return_value = {'DomainArn': 'arn:aws:sagemaker:us-east-1:123456789012:domain/d-test123456'}
        mock_client.describe_domain.return_value = {'Status': 'InService'}
        
        result = update_domain.lambda_handler(event, lambda_context)
        
        mock_client.update_domain.assert_called_once_with(
            DomainId='d-test123456',
            DefaultUserSettings={'ExecutionRole': 'arn:aws:iam::123456789012:role/SageMakerRole'},
            DomainSettingsForUpdate={'RStudioServerProDomainSettingsForUpdate': {'DomainExecutionRoleArn': 'arn:aws:iam::123456789012:role/DomainRole'}}
        )
        assert result['Status'] == 'SUCCESS'
        assert result['PhysicalResourceId'] == 'd-test123456'

    @patch('update_domain.sagemaker_client')
    @patch('update_domain.time.sleep')
    def test_lambda_handler_update_success(self, mock_sleep, mock_client, aws_credentials, lambda_context, env_vars):
        """Test lambda handler for Update request."""
        event = {
            'RequestType': 'Update',
            'ResourceProperties': {
                'DomainId': 'd-test123456',
                'DefaultUserSettings': {
                    'ExecutionRole': 'arn:aws:iam::123456789012:role/UpdatedRole'
                },
                'DomainSettingsForUpdate': {
                    'RStudioServerProDomainSettingsForUpdate': {
                        'DomainExecutionRoleArn': 'arn:aws:iam::123456789012:role/UpdatedDomainRole'
                    }
                }
            }
        }
        
        mock_client.update_domain.return_value = {'DomainArn': 'arn:aws:sagemaker:us-east-1:123456789012:domain/d-test123456'}
        mock_client.describe_domain.return_value = {'Status': 'InService'}
        
        result = update_domain.lambda_handler(event, lambda_context)
        
        assert result['Status'] == 'SUCCESS'
        assert result['PhysicalResourceId'] == 'd-test123456'

    @patch('update_domain.sagemaker_client')
    @patch('update_domain.time.sleep')
    def test_lambda_handler_waits_for_inservice(self, mock_sleep, mock_client, aws_credentials, lambda_context, env_vars):
        """Test lambda handler waits for domain to be InService."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'DomainId': 'd-test123456',
                'DefaultUserSettings': {'ExecutionRole': 'arn:aws:iam::123456789012:role/SageMakerRole'},
                'DomainSettingsForUpdate': {}
            }
        }
        
        mock_client.update_domain.return_value = {'DomainArn': 'arn:aws:sagemaker:us-east-1:123456789012:domain/d-test123456'}
        mock_client.describe_domain.side_effect = [
            {'Status': 'Updating'},
            {'Status': 'Updating'},
            {'Status': 'InService'}
        ]
        
        result = update_domain.lambda_handler(event, lambda_context)
        
        assert mock_client.describe_domain.call_count == 3
        assert result['Status'] == 'SUCCESS'

    @patch('update_domain.sagemaker_client')
    @patch('update_domain.time.sleep')
    def test_lambda_handler_update_failed(self, mock_sleep, mock_client, aws_credentials, lambda_context, env_vars):
        """Test lambda handler when update fails."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'DomainId': 'd-test123456',
                'DefaultUserSettings': {'ExecutionRole': 'arn:aws:iam::123456789012:role/SageMakerRole'},
                'DomainSettingsForUpdate': {}
            }
        }
        
        mock_client.update_domain.return_value = {'DomainArn': 'arn:aws:sagemaker:us-east-1:123456789012:domain/d-test123456'}
        mock_client.describe_domain.return_value = {
            'Status': 'Update_Failed',
            'FailureReason': 'Invalid configuration'
        }
        
        with pytest.raises(Exception, match='Invalid configuration'):
            update_domain.lambda_handler(event, lambda_context)

    @patch('update_domain.sagemaker_client')
    @patch('update_domain.time.sleep')
    def test_lambda_handler_timeout(self, mock_sleep, mock_client, aws_credentials, lambda_context, env_vars):
        """Test lambda handler timeout waiting for domain update."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'DomainId': 'd-test123456',
                'DefaultUserSettings': {'ExecutionRole': 'arn:aws:iam::123456789012:role/SageMakerRole'},
                'DomainSettingsForUpdate': {}
            }
        }
        
        mock_client.update_domain.return_value = {'DomainArn': 'arn:aws:sagemaker:us-east-1:123456789012:domain/d-test123456'}
        mock_client.describe_domain.return_value = {'Status': 'Updating'}
        
        with pytest.raises(Exception, match='Timed out waiting for domain to update'):
            update_domain.lambda_handler(event, lambda_context)

    @patch('update_domain.time.sleep')
    def test_lambda_handler_missing_domain_id(self, mock_sleep, aws_credentials, lambda_context, env_vars):
        """Test lambda handler with missing DomainId."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'DefaultUserSettings': {'ExecutionRole': 'arn:aws:iam::123456789012:role/SageMakerRole'},
                'DomainSettingsForUpdate': {}
            }
        }
        
        with pytest.raises(Exception, match='Unable to parse domainId from event'):
            update_domain.lambda_handler(event, lambda_context)

    @patch('update_domain.time.sleep')
    def test_lambda_handler_missing_default_user_settings(self, mock_sleep, aws_credentials, lambda_context, env_vars):
        """Test lambda handler with missing DefaultUserSettings."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'DomainId': 'd-test123456',
                'DomainSettingsForUpdate': {}
            }
        }
        
        with pytest.raises(Exception, match='Unable to parse defaultUserSettings from event'):
            update_domain.lambda_handler(event, lambda_context)

    @patch('update_domain.time.sleep')
    def test_lambda_handler_missing_domain_settings(self, mock_sleep, aws_credentials, lambda_context, env_vars):
        """Test lambda handler with missing DomainSettingsForUpdate."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'DomainId': 'd-test123456',
                'DefaultUserSettings': {'ExecutionRole': 'arn:aws:iam::123456789012:role/SageMakerRole'}
            }
        }
        
        with pytest.raises(Exception, match='Unable to parse domainSettingsForUpdate from event'):
            update_domain.lambda_handler(event, lambda_context)

    @patch('update_domain.time.sleep')
    def test_lambda_handler_delete_request(self, mock_sleep, aws_credentials, lambda_context, env_vars):
        """Test lambda handler with Delete request (should return None)."""
        event = {
            'RequestType': 'Delete',
            'ResourceProperties': {
                'DomainId': 'd-test123456',
                'DefaultUserSettings': {'ExecutionRole': 'arn:aws:iam::123456789012:role/SageMakerRole'},
                'DomainSettingsForUpdate': {}
            }
        }
        
        result = update_domain.lambda_handler(event, lambda_context)
        
        assert result is None
