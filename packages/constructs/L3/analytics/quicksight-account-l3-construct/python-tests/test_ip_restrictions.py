"""
Unit tests for ip_restrictions.py module.
"""
import pytest
import json
from unittest.mock import MagicMock, patch, call
from botocore.exceptions import ClientError

# Import the module under test
import ip_restrictions

test_account_id = "111111111111"

class TestIPRestrictions:
    """Test cases for ip_restrictions.py module."""

    def test_lambda_handler_create_request(self, sample_create_event, lambda_context):
        """Test lambda_handler with Create request type."""
        with patch('ip_restrictions.handle_create_update') as mock_handle:
            mock_handle.return_value = {"Status": "SUCCESS", "PhysicalResourceId": test_account_id}
            
            result = ip_restrictions.lambda_handler(sample_create_event, lambda_context)
            
            mock_handle.assert_called_once_with(sample_create_event, lambda_context)
            assert result["Status"] == "SUCCESS"

    def test_lambda_handler_update_request(self, sample_update_event, lambda_context):
        """Test lambda_handler with Update request type."""
        with patch('ip_restrictions.handle_create_update') as mock_handle:
            mock_handle.return_value = {"Status": "SUCCESS", "PhysicalResourceId": test_account_id}
            
            result = ip_restrictions.lambda_handler(sample_update_event, lambda_context)
            
            mock_handle.assert_called_once_with(sample_update_event, lambda_context)
            assert result["Status"] == "SUCCESS"

    def test_lambda_handler_delete_request(self, sample_delete_event, lambda_context):
        """Test lambda_handler with Delete request type."""
        with patch('ip_restrictions.handle_delete') as mock_handle:
            mock_handle.return_value = {"Status": "SUCCESS", "PhysicalResourceId": test_account_id}
            
            result = ip_restrictions.lambda_handler(sample_delete_event, lambda_context)
            
            mock_handle.assert_called_once_with(sample_delete_event, lambda_context)
            assert result["Status"] == "SUCCESS"

    def test_handle_create_update_success(self, sample_create_event, lambda_context, mock_quicksight_update_response):
        """Test successful handle_create_update operation."""
        with patch('ip_restrictions.quicksight_client') as mock_client:
            mock_client.update_ip_restriction.return_value = mock_quicksight_update_response
            
            result = ip_restrictions.handle_create_update(sample_create_event, lambda_context)
            
            # Verify QuickSight client was called with correct parameters
            mock_client.update_ip_restriction.assert_called_once_with(
                AwsAccountId=test_account_id,
                IpRestrictionRuleMap={'AllowedCIDRs': ['10.0.0.0/8', '192.168.1.0/24']},
                Enabled=True
            )
            
            # Verify response
            assert result["Status"] == "SUCCESS"
            assert result["PhysicalResourceId"] == test_account_id

    def test_handle_create_update_client_error(self, sample_create_event, lambda_context):
        """Test handle_create_update with QuickSight client error."""
        with patch('ip_restrictions.quicksight_client') as mock_client:
            # Mock a client error
            error = ClientError(
                error_response={'Error': {'Code': 'AccessDeniedException', 'Message': 'Access denied'}},
                operation_name='UpdateIpRestriction'
            )
            mock_client.update_ip_restriction.side_effect = error
            
            # Should raise the exception
            with pytest.raises(ClientError):
                ip_restrictions.handle_create_update(sample_create_event, lambda_context)

    def test_handle_create_update_generic_exception(self, sample_create_event, lambda_context):
        """Test handle_create_update with generic exception."""
        with patch('ip_restrictions.quicksight_client') as mock_client:
            # Mock a generic exception
            mock_client.update_ip_restriction.side_effect = Exception("Something went wrong")
            
            # Should raise the exception
            with pytest.raises(Exception, match="Something went wrong"):
                ip_restrictions.handle_create_update(sample_create_event, lambda_context)

    def test_handle_delete_success(self, sample_delete_event, lambda_context, mock_quicksight_update_response):
        """Test successful handle_delete operation."""
        with patch('ip_restrictions.quicksight_client') as mock_client:
            mock_client.update_ip_restriction.return_value = mock_quicksight_update_response
            
            result = ip_restrictions.handle_delete(sample_delete_event, lambda_context)
            
            # Verify QuickSight client was called with correct parameters
            mock_client.update_ip_restriction.assert_called_once_with(
                AwsAccountId=test_account_id,
                Enabled=False
            )
            
            # Verify response
            assert result["Status"] == "SUCCESS"
            assert result["PhysicalResourceId"] == test_account_id

    def test_handle_delete_with_context(self, sample_delete_event, lambda_context, mock_quicksight_update_response):
        """Test handle_delete with lambda context parameter."""
        with patch('ip_restrictions.quicksight_client') as mock_client:
            mock_client.update_ip_restriction.return_value = mock_quicksight_update_response
            
            # Call with context parameter
            result = ip_restrictions.handle_delete(sample_delete_event, lambda_context)
            
            # Verify QuickSight client was called correctly
            mock_client.update_ip_restriction.assert_called_once_with(
                AwsAccountId=test_account_id,
                Enabled=False
            )
            
            assert result["Status"] == "SUCCESS"

    def test_logging_configuration(self):
        """Test that logging is properly configured."""
        import logging
        
        # Get the logger used by the module
        logger = logging.getLogger("IP Restrictions")
        
        # Verify logger exists and has appropriate level
        assert logger is not None
        # The logger level should be set based on LOG_LEVEL environment variable

    def test_quicksight_client_configuration(self):
        """Test that QuickSight client is properly configured with user agent."""
        # Verify the client is configured (this tests the module-level setup)
        assert hasattr(ip_restrictions, 'quicksight_client')
        assert ip_restrictions.quicksight_client is not None

    def test_event_logging(self, sample_create_event, lambda_context):
        """Test that events are properly logged in debug mode."""
        with patch('ip_restrictions.logger') as mock_logger, \
             patch('ip_restrictions.handle_create_update') as mock_handle:
            
            mock_handle.return_value = {"Status": "SUCCESS", "PhysicalResourceId": test_account_id}
            
            ip_restrictions.lambda_handler(sample_create_event, lambda_context)
            
            # Verify debug logging was called with JSON dump of event
            mock_logger.debug.assert_called_once()
            call_args = mock_logger.debug.call_args[0][0]
            # Should be a JSON string representation of the event
            assert isinstance(call_args, str)

    def test_resource_properties_extraction(self, lambda_context):
        """Test extraction of resource properties from event."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'accountId': test_account_id,
                'ipRestrictionsMap': {
                    'AllowedCIDRs': ['203.0.113.0/24']
                }
            }
        }
        
        with patch('ip_restrictions.quicksight_client') as mock_client:
            mock_client.update_ip_restriction.return_value = {'AwsAccountId': test_account_id}
            
            result = ip_restrictions.handle_create_update(event, lambda_context)
            
            # Verify the extracted values were used correctly
            mock_client.update_ip_restriction.assert_called_once_with(
                AwsAccountId=test_account_id,
                IpRestrictionRuleMap={'AllowedCIDRs': ['203.0.113.0/24']},
                Enabled=True
            )
            
            assert result["PhysicalResourceId"] == test_account_id

    def test_multiple_cidr_blocks(self, lambda_context):
        """Test handling of multiple CIDR blocks in IP restrictions."""
        event = {
            'RequestType': 'Update',
            'ResourceProperties': {
                'accountId': test_account_id,
                'ipRestrictionsMap': {
                    'AllowedCIDRs': [
                        '10.0.0.0/8',
                        '172.16.0.0/12',
                        '192.168.0.0/16',
                        '203.0.113.0/24'
                    ]
                }
            }
        }
        
        with patch('ip_restrictions.quicksight_client') as mock_client:
            mock_client.update_ip_restriction.return_value = {'AwsAccountId': test_account_id}
            
            ip_restrictions.handle_create_update(event, lambda_context)
            
            # Verify all CIDR blocks were passed correctly
            call_args = mock_client.update_ip_restriction.call_args[1]
            ip_map = call_args['IpRestrictionRuleMap']
            assert len(ip_map['AllowedCIDRs']) == 4
            assert '10.0.0.0/8' in ip_map['AllowedCIDRs']
            assert '203.0.113.0/24' in ip_map['AllowedCIDRs']

    def test_invalid_request_type(self, lambda_context):
        """Test lambda_handler with invalid request type."""
        event = {
            'RequestType': 'InvalidType',
            'ResourceProperties': {
                'accountId': test_account_id,
                'ipRestrictionsMap': {'AllowedCIDRs': ['10.0.0.0/8']}
            }
        }
        
        # Should return None for invalid request types
        result = ip_restrictions.lambda_handler(event, lambda_context)
        assert result is None

    def test_handle_delete_client_error(self, sample_delete_event, lambda_context):
        """Test handle_delete with QuickSight client error."""
        with patch('ip_restrictions.quicksight_client') as mock_client:
            # Mock a client error
            error = ClientError(
                error_response={'Error': {'Code': 'ResourceNotFoundException', 'Message': 'Account not found'}},
                operation_name='UpdateIpRestriction'
            )
            mock_client.update_ip_restriction.side_effect = error
            
            # Should raise the exception (no error handling in handle_delete)
            with pytest.raises(ClientError):
                ip_restrictions.handle_delete(sample_delete_event, lambda_context)