"""Minimal tests for DataZone Add Policy Grant Lambda function."""
import pytest
import sys
import os
from unittest.mock import patch, MagicMock

# Add source to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'lambda', 'add_policy_grant'))
import add_policy_grant


def test_recursive_bool_conversion():
    """Test boolean conversion utility."""
    assert add_policy_grant.recursive_bool_conversion("true") is True
    assert add_policy_grant.recursive_bool_conversion("false") is False
    assert add_policy_grant.recursive_bool_conversion("other") == "other"
    assert add_policy_grant.recursive_bool_conversion({"key": "TRUE"})["key"] is True


@patch('add_policy_grant.datazone_client')
@patch('add_policy_grant.time.sleep')
def test_lambda_handler_create(mock_sleep, mock_client):
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
    
    result = add_policy_grant.lambda_handler(event, MagicMock())
    
    mock_client.add_policy_grant.assert_called_once()
    assert result['Status'] == '200'


@patch('add_policy_grant.datazone_client')
@patch('add_policy_grant.time.sleep')
def test_lambda_handler_delete(mock_sleep, mock_client):
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
    
    result = add_policy_grant.lambda_handler(event, MagicMock())
    
    mock_client.remove_policy_grant.assert_called_once()
    assert result['Status'] == '200'
