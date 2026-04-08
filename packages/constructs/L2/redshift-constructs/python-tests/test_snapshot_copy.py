"""
Tests for the Redshift cross-region snapshot copy Custom Resource handler.
"""

import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def mock_redshift():
    with patch('snapshot_copy.boto3') as mock_boto3:
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        # Set up exception classes
        mock_client.exceptions.SnapshotCopyAlreadyDisabledFault = type(
            'SnapshotCopyAlreadyDisabledFault', (Exception,), {}
        )
        mock_client.exceptions.ClusterNotFoundFault = type(
            'ClusterNotFoundFault', (Exception,), {}
        )
        yield mock_client


@pytest.fixture
def make_event():
    def _make(request_type, cluster_id='test-cluster', destination_region='us-east-1'):
        return {
            'RequestType': request_type,
            'ResourceProperties': {
                'ClusterIdentifier': cluster_id,
                'DestinationRegion': destination_region,
            },
        }
    return _make


def _import_handler(mock_redshift):
    """Import handler after mocking boto3."""
    import importlib
    import snapshot_copy
    # Replace the module-level client with our mock
    snapshot_copy.redshift = mock_redshift
    importlib.reload(snapshot_copy)
    snapshot_copy.redshift = mock_redshift
    return snapshot_copy.lambda_handler


class TestCreate:
    def test_calls_enable_snapshot_copy(self, mock_redshift, make_event):
        handler = _import_handler(mock_redshift)
        event = make_event('Create')

        result = handler(event, None)

        mock_redshift.enable_snapshot_copy.assert_called_once_with(
            ClusterIdentifier='test-cluster',
            DestinationRegion='us-east-1',
        )
        assert result['PhysicalResourceId'] == 'test-cluster-snapshot-copy'

    def test_does_not_disable_on_create(self, mock_redshift, make_event):
        handler = _import_handler(mock_redshift)
        event = make_event('Create')

        handler(event, None)

        mock_redshift.disable_snapshot_copy.assert_not_called()


class TestUpdate:
    def test_disables_then_enables(self, mock_redshift, make_event):
        handler = _import_handler(mock_redshift)
        event = make_event('Update', destination_region='eu-west-2')

        handler(event, None)

        mock_redshift.disable_snapshot_copy.assert_called_once_with(
            ClusterIdentifier='test-cluster'
        )
        mock_redshift.enable_snapshot_copy.assert_called_once_with(
            ClusterIdentifier='test-cluster',
            DestinationRegion='eu-west-2',
        )

    def test_handles_already_disabled_on_update(self, mock_redshift, make_event):
        handler = _import_handler(mock_redshift)
        mock_redshift.disable_snapshot_copy.side_effect = (
            mock_redshift.exceptions.SnapshotCopyAlreadyDisabledFault('already disabled')
        )
        event = make_event('Update')

        result = handler(event, None)

        mock_redshift.enable_snapshot_copy.assert_called_once()
        assert result['PhysicalResourceId'] == 'test-cluster-snapshot-copy'


class TestDelete:
    def test_calls_disable_snapshot_copy(self, mock_redshift, make_event):
        handler = _import_handler(mock_redshift)
        event = make_event('Delete')

        result = handler(event, None)

        mock_redshift.disable_snapshot_copy.assert_called_once_with(
            ClusterIdentifier='test-cluster'
        )
        assert result['PhysicalResourceId'] == 'test-cluster-snapshot-copy'

    def test_handles_already_disabled(self, mock_redshift, make_event):
        handler = _import_handler(mock_redshift)
        mock_redshift.disable_snapshot_copy.side_effect = (
            mock_redshift.exceptions.SnapshotCopyAlreadyDisabledFault('already disabled')
        )
        event = make_event('Delete')

        result = handler(event, None)

        assert result['PhysicalResourceId'] == 'test-cluster-snapshot-copy'

    def test_handles_cluster_not_found(self, mock_redshift, make_event):
        handler = _import_handler(mock_redshift)
        mock_redshift.disable_snapshot_copy.side_effect = (
            mock_redshift.exceptions.ClusterNotFoundFault('not found')
        )
        event = make_event('Delete')

        result = handler(event, None)

        assert result['PhysicalResourceId'] == 'test-cluster-snapshot-copy'


class TestErrors:
    def test_raises_on_enable_failure(self, mock_redshift, make_event):
        handler = _import_handler(mock_redshift)
        mock_redshift.enable_snapshot_copy.side_effect = Exception('API error')
        event = make_event('Create')

        with pytest.raises(Exception, match='API error'):
            handler(event, None)
