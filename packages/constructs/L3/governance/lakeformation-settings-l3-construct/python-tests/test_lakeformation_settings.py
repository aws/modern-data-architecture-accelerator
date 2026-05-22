"""Tests for LakeFormation Settings Lambda function."""
import pytest
from unittest.mock import patch, MagicMock
import lakeformation_settings


@patch('lakeformation_settings.lf_client')
def test_lambda_handler_create(mock_client, aws_credentials, lambda_context):
    event = {
        'RequestType': 'Create',
        'ResourceProperties': {
            'account': 'test-account',
            'dataLakeSettings': {
                'DataLakeAdmins': [{'DataLakePrincipalIdentifier': 'arn:aws:iam::123456789012:role/TestRole'}],
            }
        }
    }
    mock_client.put_data_lake_settings.return_value = {}

    result = lakeformation_settings.lambda_handler(event, lambda_context)

    mock_client.put_data_lake_settings.assert_called_once_with(
        DataLakeSettings=event['ResourceProperties']['dataLakeSettings']
    )
    assert result['Status'] == 'SUCCESS'
    assert result['PhysicalResourceId'] == 'test-account'


@patch('lakeformation_settings.lf_client')
def test_lambda_handler_update(mock_client, aws_credentials, lambda_context):
    event = {
        'RequestType': 'Update',
        'ResourceProperties': {
            'account': 'test-account',
            'dataLakeSettings': {
                'DataLakeAdmins': [],
            }
        }
    }
    mock_client.put_data_lake_settings.return_value = {}

    result = lakeformation_settings.lambda_handler(event, lambda_context)

    mock_client.put_data_lake_settings.assert_called_once_with(
        DataLakeSettings=event['ResourceProperties']['dataLakeSettings']
    )
    assert result['Status'] == 'SUCCESS'


@patch('lakeformation_settings.lf_client')
def test_lambda_handler_delete(mock_client, aws_credentials, lambda_context):
    event = {
        'RequestType': 'Delete',
        'ResourceProperties': {
            'account': 'test-account',
            'dataLakeSettings': {}
        }
    }

    result = lakeformation_settings.lambda_handler(event, lambda_context)

    mock_client.put_data_lake_settings.assert_not_called()
    assert result['Status'] == 'SUCCESS'
