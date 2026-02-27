"""Tests for DataZone Get Blueprint Lambda function."""
import pytest
from unittest.mock import patch
import get_blueprint


class TestGetBlueprint:
    """Test cases for get_blueprint Lambda function."""

    @patch('get_blueprint.datazone_client')
    @patch('get_blueprint.time.sleep')
    def test_lambda_handler_success(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler successfully retrieves blueprint."""
        event = {
            'ResourceProperties': {
                'domainIdentifier': 'test-domain-123',
                'blueprintName': 'DefaultDataLake'
            }
        }
        
        mock_client.list_environment_blueprints.return_value = {
            'items': [
                {'id': 'blueprint-id-123', 'name': 'DefaultDataLake'}
            ]
        }
        
        result = get_blueprint.lambda_handler(event, lambda_context)
        
        mock_client.list_environment_blueprints.assert_called_once_with(
            domainIdentifier='test-domain-123',
            managed=True,
            name='DefaultDataLake'
        )
        assert result['Status'] == '200'
        assert result['Data']['id'] == 'blueprint-id-123'

    @patch('get_blueprint.datazone_client')
    @patch('get_blueprint.time.sleep')
    def test_lambda_handler_no_blueprints_found(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler when no blueprints are found."""
        event = {
            'ResourceProperties': {
                'domainIdentifier': 'test-domain-123',
                'blueprintName': 'NonExistentBlueprint'
            }
        }
        
        mock_client.list_environment_blueprints.return_value = {'items': []}
        
        with pytest.raises(Exception, match="Unable to find environment blueprint"):
            get_blueprint.lambda_handler(event, lambda_context)

    @patch('get_blueprint.datazone_client')
    @patch('get_blueprint.time.sleep')
    def test_lambda_handler_multiple_blueprints_found(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler when multiple blueprints are found."""
        event = {
            'ResourceProperties': {
                'domainIdentifier': 'test-domain-123',
                'blueprintName': 'DuplicateBlueprint'
            }
        }
        
        mock_client.list_environment_blueprints.return_value = {
            'items': [
                {'id': 'blueprint-id-1', 'name': 'DuplicateBlueprint'},
                {'id': 'blueprint-id-2', 'name': 'DuplicateBlueprint'}
            ]
        }
        
        with pytest.raises(Exception, match="Unable to find environment blueprint"):
            get_blueprint.lambda_handler(event, lambda_context)

    @patch('get_blueprint.time.sleep')
    def test_lambda_handler_missing_domain_identifier(self, mock_sleep, aws_credentials, lambda_context):
        """Test lambda handler with missing domainIdentifier."""
        event = {
            'ResourceProperties': {
                'blueprintName': 'DefaultDataLake'
            }
        }
        
        with pytest.raises(Exception, match="Unable to parse domainIdentifier from event"):
            get_blueprint.lambda_handler(event, lambda_context)

    @patch('get_blueprint.time.sleep')
    def test_lambda_handler_missing_blueprint_name(self, mock_sleep, aws_credentials, lambda_context):
        """Test lambda handler with missing blueprintName."""
        event = {
            'ResourceProperties': {
                'domainIdentifier': 'test-domain-123'
            }
        }
        
        with pytest.raises(Exception, match="Unable to parse blueprintName from event"):
            get_blueprint.lambda_handler(event, lambda_context)
