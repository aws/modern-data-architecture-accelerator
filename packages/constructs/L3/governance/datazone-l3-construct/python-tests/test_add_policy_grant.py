"""Minimal tests for DataZone Add Policy Grant Lambda function."""
import pytest
from unittest.mock import patch, MagicMock
import add_policy_grant


def test_recursive_bool_conversion():
    """Test boolean conversion utility."""
    assert add_policy_grant.recursive_bool_conversion("true") is True
    assert add_policy_grant.recursive_bool_conversion("false") is False
    assert add_policy_grant.recursive_bool_conversion("other") == "other"
    assert add_policy_grant.recursive_bool_conversion({"key": "TRUE"})["key"] is True


@patch('add_policy_grant.datazone_client')
@patch('add_policy_grant.time.sleep')
def test_lambda_handler_create(mock_sleep, mock_client, aws_credentials, lambda_context):
    """Test lambda handler for Create request."""
    event = {
        'RequestType': 'Create',
        'ResourceProperties': {
            'domainIdentifier': 'test-domain',
            'entityIdentifier': 'test-entity',
            'entityType': 'DOMAIN',
            'policyType': 'DOMAIN_UNIT_POLICY',
            'principal': 'test-principal',
            'detail': {'permission': 'true'}
        }
    }
    
    result = add_policy_grant.lambda_handler(event, lambda_context)
    
    mock_client.add_policy_grant.assert_called_once_with(
        domainIdentifier='test-domain',
        entityIdentifier='test-entity',
        entityType='DOMAIN',
        policyType='DOMAIN_UNIT_POLICY',
        principal='test-principal',
        detail={'permission': True}
    )
    assert result['Status'] == '200'


@patch('add_policy_grant.datazone_client')
@patch('add_policy_grant.time.sleep')
def test_lambda_handler_delete(mock_sleep, mock_client, aws_credentials, lambda_context):
    """Test lambda handler for Delete request."""
    event = {
        'RequestType': 'Delete',
        'ResourceProperties': {
            'domainIdentifier': 'test-domain',
            'entityIdentifier': 'test-entity',
            'entityType': 'DOMAIN',
            'policyType': 'DOMAIN_UNIT_POLICY',
            'principal': 'test-principal',
            'detail': {'permission': 'true'}
        }
    }
    
    result = add_policy_grant.lambda_handler(event, lambda_context)
    
    mock_client.remove_policy_grant.assert_called_once_with(
        domainIdentifier='test-domain',
        entityIdentifier='test-entity',
        entityType='DOMAIN',
        policyType='DOMAIN_UNIT_POLICY',
        principal='test-principal',
        detail={'permission': True}
    )
    assert result['Status'] == '200'


@patch('add_policy_grant.datazone_client')
@patch('add_policy_grant.time.sleep')
def test_lambda_handler_update(mock_sleep, mock_client, aws_credentials, lambda_context):
    """Test lambda handler for Update request."""
    event = {
        'RequestType': 'Update',
        'ResourceProperties': {
            'domainIdentifier': 'test-domain',
            'entityIdentifier': 'test-entity',
            'entityType': 'DOMAIN',
            'policyType': 'DOMAIN_UNIT_POLICY',
            'principal': 'test-principal',
            'detail': {'permission': 'false'}
        }
    }
    
    result = add_policy_grant.lambda_handler(event, lambda_context)
    
    # Update should call both remove and add
    mock_client.remove_policy_grant.assert_called_once()
    mock_client.add_policy_grant.assert_called_once()
    assert result['Status'] == '200'


@patch('add_policy_grant.time.sleep')
def test_lambda_handler_missing_domain_identifier(mock_sleep, aws_credentials, lambda_context):
    """Test lambda handler with missing domainIdentifier."""
    event = {
        'RequestType': 'Create',
        'ResourceProperties': {
            'entityIdentifier': 'test-entity',
            'entityType': 'DOMAIN',
            'policyType': 'DOMAIN_UNIT_POLICY',
            'principal': 'test-principal',
            'detail': {'permission': 'true'}
        }
    }
    
    with pytest.raises(Exception, match="Unable to parse domainIdentifier from event"):
        add_policy_grant.lambda_handler(event, lambda_context)


@patch('add_policy_grant.time.sleep')
def test_lambda_handler_missing_entity_identifier(mock_sleep, aws_credentials, lambda_context):
    """Test lambda handler with missing entityIdentifier."""
    event = {
        'RequestType': 'Create',
        'ResourceProperties': {
            'domainIdentifier': 'test-domain',
            'entityType': 'DOMAIN',
            'policyType': 'DOMAIN_UNIT_POLICY',
            'principal': 'test-principal',
            'detail': {'permission': 'true'}
        }
    }
    
    with pytest.raises(Exception, match="Unable to parse entityIdentifier from event"):
        add_policy_grant.lambda_handler(event, lambda_context)