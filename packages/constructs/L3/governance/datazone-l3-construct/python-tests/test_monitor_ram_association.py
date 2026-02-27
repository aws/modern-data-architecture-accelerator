"""Tests for DataZone Monitor RAM Association Lambda function."""
import pytest
from unittest.mock import patch
import monitor_ram_association


class TestMonitorRamAssociation:
    """Test cases for monitor_ram_association Lambda function."""

    @patch('monitor_ram_association.ram_client')
    @patch('monitor_ram_association.time.sleep')
    def test_lambda_handler_create_already_associated(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler when RAM association is already complete."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'resourceShareArn': 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
                'associatedEntity': 'arn:aws:organizations::123456789012:account/o-abc123/987654321098'
            }
        }
        
        mock_client.get_resource_share_associations.return_value = {
            'resourceShareAssociations': [
                {
                    'status': 'ASSOCIATED',
                    'resourceShareArn': 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share'
                }
            ]
        }
        
        result = monitor_ram_association.lambda_handler(event, lambda_context)
        
        mock_client.get_resource_share_associations.assert_called_once_with(
            associationType='PRINCIPAL',
            resourceShareArns=['arn:aws:ram:us-east-1:123456789012:resource-share/test-share'],
            principal='arn:aws:organizations::123456789012:account/o-abc123/987654321098'
        )
        assert result['Status'] == '200'

    @patch('monitor_ram_association.ram_client')
    @patch('monitor_ram_association.time.sleep')
    def test_lambda_handler_update_already_associated(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler on Update when RAM association is already complete."""
        event = {
            'RequestType': 'Update',
            'ResourceProperties': {
                'resourceShareArn': 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
                'associatedEntity': 'arn:aws:organizations::123456789012:account/o-abc123/987654321098'
            }
        }
        
        mock_client.get_resource_share_associations.return_value = {
            'resourceShareAssociations': [
                {'status': 'ASSOCIATED'}
            ]
        }
        
        result = monitor_ram_association.lambda_handler(event, lambda_context)
        
        assert result['Status'] == '200'

    @patch('monitor_ram_association.ram_client')
    @patch('monitor_ram_association.time.sleep')
    def test_lambda_handler_waits_for_association(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler waits for RAM association to complete."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'resourceShareArn': 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
                'associatedEntity': 'arn:aws:organizations::123456789012:account/o-abc123/987654321098'
            }
        }
        
        # Simulate association in progress, then completed
        mock_client.get_resource_share_associations.side_effect = [
            {'resourceShareAssociations': [{'status': 'ASSOCIATING'}]},
            {'resourceShareAssociations': [{'status': 'ASSOCIATING'}]},
            {'resourceShareAssociations': [{'status': 'ASSOCIATED'}]}
        ]
        
        result = monitor_ram_association.lambda_handler(event, lambda_context)
        
        assert mock_client.get_resource_share_associations.call_count == 3
        assert result['Status'] == '200'

    @patch('monitor_ram_association.ram_client')
    @patch('monitor_ram_association.time.sleep')
    def test_lambda_handler_waits_for_no_associations(self, mock_sleep, mock_client, aws_credentials, lambda_context):
        """Test lambda handler waits when no associations exist initially."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'resourceShareArn': 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
                'associatedEntity': 'arn:aws:organizations::123456789012:account/o-abc123/987654321098'
            }
        }
        
        # Simulate no associations, then association appears
        mock_client.get_resource_share_associations.side_effect = [
            {'resourceShareAssociations': []},
            {'resourceShareAssociations': [{'status': 'ASSOCIATED'}]}
        ]
        
        result = monitor_ram_association.lambda_handler(event, lambda_context)
        
        assert mock_client.get_resource_share_associations.call_count == 2
        assert result['Status'] == '200'

    @patch('monitor_ram_association.time.sleep')
    def test_lambda_handler_missing_resource_share_arn(self, mock_sleep, aws_credentials, lambda_context):
        """Test lambda handler with missing resourceShareArn."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'associatedEntity': 'arn:aws:organizations::123456789012:account/o-abc123/987654321098'
            }
        }
        
        with pytest.raises(Exception, match="Unable to parse resourceShareArn from event"):
            monitor_ram_association.lambda_handler(event, lambda_context)

    @patch('monitor_ram_association.time.sleep')
    def test_lambda_handler_missing_associated_entity(self, mock_sleep, aws_credentials, lambda_context):
        """Test lambda handler with missing associatedEntity."""
        event = {
            'RequestType': 'Create',
            'ResourceProperties': {
                'resourceShareArn': 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share'
            }
        }
        
        with pytest.raises(Exception, match="Unable to parse associatedEntity from event"):
            monitor_ram_association.lambda_handler(event, lambda_context)

    @patch('monitor_ram_association.time.sleep')
    def test_lambda_handler_delete_request(self, mock_sleep, aws_credentials, lambda_context):
        """Test lambda handler with Delete request (should return None)."""
        event = {
            'RequestType': 'Delete',
            'ResourceProperties': {
                'resourceShareArn': 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
                'associatedEntity': 'arn:aws:organizations::123456789012:account/o-abc123/987654321098'
            }
        }
        
        result = monitor_ram_association.lambda_handler(event, lambda_context)
        
        assert result is None
