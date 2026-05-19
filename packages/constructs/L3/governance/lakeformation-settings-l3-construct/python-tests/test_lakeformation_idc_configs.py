"""Tests for LakeFormation IDC Configs Lambda function."""
import pytest
from unittest.mock import patch, MagicMock
import lakeformation_idc_configs


@patch('lakeformation_idc_configs.lf_client')
def test_lambda_handler_create(mock_client, aws_credentials, lambda_context):
    event = {
        'RequestType': 'Create',
        'ResourceProperties': {
            'instanceArn': 'arn:aws:sso:::instance/test-instance',
            'shareRecipients': [{'DataLakePrincipalIdentifier': '123456789012'}],
        }
    }
    mock_client.create_lake_formation_identity_center_configuration.return_value = {
        'ApplicationArn': 'arn:aws:sso::123456789012:application/test-instance/apl-test'
    }

    result = lakeformation_idc_configs.lambda_handler(event, lambda_context)

    mock_client.create_lake_formation_identity_center_configuration.assert_called_once_with(
        InstanceArn='arn:aws:sso:::instance/test-instance',
        ShareRecipients=[{'DataLakePrincipalIdentifier': '123456789012'}]
    )
    assert result['Status'] == 'SUCCESS'
    assert result['PhysicalResourceId'] == 'arn:aws:sso::123456789012:application/test-instance/apl-test'


@patch('lakeformation_idc_configs.lf_client')
def test_lambda_handler_create_no_recipients(mock_client, aws_credentials, lambda_context):
    event = {
        'RequestType': 'Create',
        'ResourceProperties': {
            'instanceArn': 'arn:aws:sso:::instance/test-instance',
        }
    }
    mock_client.create_lake_formation_identity_center_configuration.return_value = {
        'ApplicationArn': 'arn:aws:sso::123456789012:application/test-instance/apl-test'
    }

    result = lakeformation_idc_configs.lambda_handler(event, lambda_context)

    mock_client.create_lake_formation_identity_center_configuration.assert_called_once_with(
        InstanceArn='arn:aws:sso:::instance/test-instance',
        ShareRecipients=[]
    )
    assert result['Status'] == 'SUCCESS'


@patch('lakeformation_idc_configs.lf_client')
def test_lambda_handler_update(mock_client, aws_credentials, lambda_context):
    event = {
        'RequestType': 'Update',
        'ResourceProperties': {
            'instanceArn': 'arn:aws:sso:::instance/test-instance',
            'shareRecipients': [{'DataLakePrincipalIdentifier': '111111111111'}],
        }
    }
    mock_client.update_lake_formation_identity_center_configuration.return_value = {}

    result = lakeformation_idc_configs.lambda_handler(event, lambda_context)

    mock_client.update_lake_formation_identity_center_configuration.assert_called_once_with(
        ShareRecipients=[{'DataLakePrincipalIdentifier': '111111111111'}]
    )
    assert result['Status'] == 'SUCCESS'


@patch('lakeformation_idc_configs.lf_client')
def test_lambda_handler_delete(mock_client, aws_credentials, lambda_context):
    event = {
        'RequestType': 'Delete',
        'ResourceProperties': {
            'instanceArn': 'arn:aws:sso:::instance/test-instance',
        }
    }
    mock_client.delete_lake_formation_identity_center_configuration.return_value = {}

    result = lakeformation_idc_configs.lambda_handler(event, lambda_context)

    mock_client.delete_lake_formation_identity_center_configuration.assert_called_once_with()
    assert result['Status'] == 'SUCCESS'
