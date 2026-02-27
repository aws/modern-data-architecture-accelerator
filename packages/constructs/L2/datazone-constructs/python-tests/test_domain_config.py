"""
Unit tests for domain_config Lambda function.
"""
import pytest
from unittest.mock import patch, MagicMock, call

import domain_config


class TestDomainConfig:
    """Test cases for domain_config module."""

    @pytest.fixture
    def mock_datazone(self):
        """Mock DataZone client."""
        return MagicMock()

    @pytest.fixture
    def create_event(self):
        """CloudFormation Create event."""
        return {
            "RequestType": "Create",
            "ResourceProperties": {
                "domain_id": "dzd_test123"
            }
        }

    @pytest.fixture
    def domain_response_v2(self):
        """Mock V2 domain response."""
        return {
            'name': 'test-domain',
            'domainVersion': 'V2',
            'arn': 'arn:aws:datazone:us-east-1:123456789012:domain/dzd_test123',
            'kmsKeyIdentifier': 'arn:aws:kms:us-east-1:123456789012:key/test-key',
            'rootDomainUnitId': 'root-unit-123'
        }

    @pytest.fixture
    def domain_response_v1(self):
        """Mock V1 domain response."""
        return {
            'name': 'test-domain-v1',
            'domainVersion': 'V1',
            'arn': 'arn:aws:datazone:us-east-1:123456789012:domain/dzd_v1',
            'kmsKeyIdentifier': 'arn:aws:kms:us-east-1:123456789012:key/test-key',
            'rootDomainUnitId': 'root-unit-v1'
        }

    @patch.object(domain_config, 'datazone_client')
    def test_lambda_handler_create_v2_domain(
        self, mock_dz, create_event, domain_response_v2, lambda_context
    ):
        """Test Create request with V2 domain."""
        mock_dz.get_domain.return_value = domain_response_v2
        mock_dz.list_domain_units_for_parent.return_value = {'items': []}
        mock_dz.list_projects.return_value = {
            'items': [{'name': 'project1', 'id': 'proj-123'}]
        }
        mock_dz.list_environment_blueprints.return_value = {'items': []}

        response = domain_config.lambda_handler(create_event, lambda_context)

        assert response['PhysicalResourceId'] == 'dzd_test123'
        assert response['Data']['name'] == 'test-domain'
        assert response['Data']['domainVersion'] == 'V2'
        assert 'project_id/project1' in response['Data']

    @patch.object(domain_config, 'datazone_client')
    def test_lambda_handler_create_v1_domain(
        self, mock_dz, domain_response_v1, lambda_context
    ):
        """Test Create request with V1 domain (no projects)."""
        event = {
            "RequestType": "Create",
            "ResourceProperties": {"domain_id": "dzd_v1"}
        }
        mock_dz.get_domain.return_value = domain_response_v1
        mock_dz.list_domain_units_for_parent.return_value = {'items': []}
        mock_dz.list_environment_blueprints.return_value = {'items': []}

        response = domain_config.lambda_handler(event, lambda_context)

        assert response['Data']['domainVersion'] == 'V1'
        mock_dz.list_projects.assert_not_called()

    @patch.object(domain_config, 'datazone_client')
    def test_lambda_handler_update(self, mock_dz, domain_response_v2, lambda_context):
        """Test Update request."""
        event = {
            "RequestType": "Update",
            "ResourceProperties": {"domain_id": "dzd_test123"}
        }
        mock_dz.get_domain.return_value = domain_response_v2
        mock_dz.list_domain_units_for_parent.return_value = {'items': []}
        mock_dz.list_projects.return_value = {'items': []}
        mock_dz.list_environment_blueprints.return_value = {'items': []}

        response = domain_config.lambda_handler(event, lambda_context)

        assert response['PhysicalResourceId'] == 'dzd_test123'

    def test_lambda_handler_delete_no_action(self, lambda_context):
        """Test Delete request returns None."""
        event = {
            "RequestType": "Delete",
            "ResourceProperties": {"domain_id": "dzd_test123"}
        }

        response = domain_config.lambda_handler(event, lambda_context)

        assert response is None

    def test_lambda_handler_missing_domain_id(self, lambda_context):
        """Test error when domain_id is missing."""
        event = {
            "RequestType": "Create",
            "ResourceProperties": {}
        }

        with pytest.raises(ValueError) as exc_info:
            domain_config.lambda_handler(event, lambda_context)

        assert "domain_id is required" in str(exc_info.value)

    @patch.object(domain_config, 'datazone_client')
    def test_environment_blueprints_returned(
        self, mock_dz, create_event, domain_response_v2, lambda_context
    ):
        """Test managed and unmanaged blueprints are returned."""
        mock_dz.get_domain.return_value = domain_response_v2
        mock_dz.list_domain_units_for_parent.return_value = {'items': []}
        mock_dz.list_projects.return_value = {'items': []}

        def list_blueprints_side_effect(**kwargs):
            if kwargs.get('managed'):
                return {'items': [{'name': 'ManagedBP', 'id': 'bp-managed'}]}
            return {'items': [{'name': 'CustomBP', 'id': 'bp-custom'}]}

        mock_dz.list_environment_blueprints.side_effect = list_blueprints_side_effect

        response = domain_config.lambda_handler(create_event, lambda_context)

        assert response['Data']['blueprint_id/ManagedBP'] == 'bp-managed'
        assert response['Data']['blueprint_id/CustomBP'] == 'bp-custom'

    @patch.object(domain_config, 'datazone_client')
    def test_nested_domain_units(
        self, mock_dz, create_event, domain_response_v2, lambda_context
    ):
        """Test nested domain units are returned."""
        mock_dz.get_domain.return_value = domain_response_v2
        mock_dz.list_projects.return_value = {'items': []}
        mock_dz.list_environment_blueprints.return_value = {'items': []}

        def list_domain_units_side_effect(**kwargs):
            parent_id = kwargs.get('parentDomainUnitIdentifier')
            if parent_id == 'root-unit-123':
                return {'items': [{'name': 'ChildUnit', 'id': 'child-unit-1'}]}
            return {'items': []}

        mock_dz.list_domain_units_for_parent.side_effect = list_domain_units_side_effect

        response = domain_config.lambda_handler(create_event, lambda_context)

        assert response['Data']['domain_unit_id/root'] == 'root-unit-123'
        assert response['Data']['domain_unit_id/root/ChildUnit'] == 'child-unit-1'


class TestPaginatedList:
    """Test cases for paginated_list helper function."""

    def test_single_page(self):
        """Test single page response."""
        mock_func = MagicMock(return_value={'items': [{'id': '1'}, {'id': '2'}]})

        result = domain_config.paginated_list(mock_func, domainIdentifier='test')

        assert len(result) == 2
        mock_func.assert_called_once()

    def test_multiple_pages(self):
        """Test paginated response."""
        mock_func = MagicMock(side_effect=[
            {'items': [{'id': '1'}], 'nextToken': 'token1'},
            {'items': [{'id': '2'}], 'nextToken': 'token2'},
            {'items': [{'id': '3'}]}
        ])

        result = domain_config.paginated_list(mock_func, domainIdentifier='test')

        assert len(result) == 3
        assert mock_func.call_count == 3
