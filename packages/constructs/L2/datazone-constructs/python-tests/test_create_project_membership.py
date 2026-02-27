"""
Unit tests for create_project_membership Lambda function.
"""
import pytest
from unittest.mock import patch, MagicMock

import create_project_membership


class TestCreateProjectMembership:
    """Test cases for create_project_membership module."""

    @pytest.fixture
    def mock_datazone(self):
        """Mock DataZone client."""
        client = MagicMock()
        client.exceptions = MagicMock()
        client.exceptions.ResourceNotFoundException = type(
            'ResourceNotFoundException', (Exception,), {}
        )
        return client

    @pytest.fixture
    def create_event(self):
        """CloudFormation Create event."""
        return {
            "RequestType": "Create",
            "ResourceProperties": {
                "DomainId": "dzd_test123",
                "ProjectId": "proj_abc",
                "UserIdentifier": "arn:aws:iam::123456789012:user/testuser",
                "Designation": "PROJECT_OWNER"
            }
        }

    @pytest.fixture
    def update_event(self):
        """CloudFormation Update event."""
        return {
            "RequestType": "Update",
            "ResourceProperties": {
                "DomainId": "dzd_test123",
                "ProjectId": "proj_abc",
                "UserIdentifier": "arn:aws:iam::123456789012:user/newuser",
                "Designation": "PROJECT_CONTRIBUTOR"
            },
            "OldResourceProperties": {
                "DomainId": "dzd_test123",
                "ProjectId": "proj_abc",
                "UserIdentifier": "arn:aws:iam::123456789012:user/olduser",
                "Designation": "PROJECT_OWNER"
            }
        }

    @pytest.fixture
    def delete_event(self):
        """CloudFormation Delete event."""
        return {
            "RequestType": "Delete",
            "ResourceProperties": {
                "DomainId": "dzd_test123",
                "ProjectId": "proj_abc",
                "UserIdentifier": "arn:aws:iam::123456789012:user/testuser"
            }
        }

    @patch.object(create_project_membership, 'datazone')
    def test_create_membership_success(self, mock_dz, create_event, lambda_context):
        """Test successful membership creation."""
        mock_dz.create_project_membership.return_value = {}

        response = create_project_membership.lambda_handler(create_event, lambda_context)

        assert response['PhysicalResourceId'] == "dzd_test123:proj_abc:arn:aws:iam::123456789012:user/testuser"
        assert 'MembershipId' in response['Data']
        mock_dz.create_project_membership.assert_called_once_with(
            domainIdentifier="dzd_test123",
            projectIdentifier="proj_abc",
            member={'userIdentifier': 'arn:aws:iam::123456789012:user/testuser'},
            designation="PROJECT_OWNER"
        )

    @patch.object(create_project_membership, 'datazone')
    def test_create_membership_default_designation(self, mock_dz, lambda_context):
        """Test membership creation with default designation."""
        event = {
            "RequestType": "Create",
            "ResourceProperties": {
                "DomainId": "dzd_test123",
                "ProjectId": "proj_abc",
                "UserIdentifier": "arn:aws:iam::123456789012:user/testuser"
            }
        }
        mock_dz.create_project_membership.return_value = {}

        create_project_membership.lambda_handler(event, lambda_context)

        mock_dz.create_project_membership.assert_called_once_with(
            domainIdentifier="dzd_test123",
            projectIdentifier="proj_abc",
            member={'userIdentifier': 'arn:aws:iam::123456789012:user/testuser'},
            designation="PROJECT_OWNER"
        )

    @patch.object(create_project_membership, 'datazone')
    def test_update_membership_different_user(self, mock_dz, update_event, lambda_context):
        """Test update with different user deletes old and creates new."""
        mock_dz.create_project_membership.return_value = {}
        mock_dz.delete_project_membership.return_value = {}

        create_project_membership.lambda_handler(update_event, lambda_context)

        mock_dz.delete_project_membership.assert_called_once_with(
            domainIdentifier="dzd_test123",
            projectIdentifier="proj_abc",
            member={'userIdentifier': 'arn:aws:iam::123456789012:user/olduser'}
        )
        mock_dz.create_project_membership.assert_called_once()

    @patch.object(create_project_membership, 'datazone')
    def test_update_membership_same_user(self, mock_dz, lambda_context):
        """Test update with same user only creates new membership."""
        event = {
            "RequestType": "Update",
            "ResourceProperties": {
                "DomainId": "dzd_test123",
                "ProjectId": "proj_abc",
                "UserIdentifier": "arn:aws:iam::123456789012:user/sameuser",
                "Designation": "PROJECT_CONTRIBUTOR"
            },
            "OldResourceProperties": {
                "UserIdentifier": "arn:aws:iam::123456789012:user/sameuser"
            }
        }
        mock_dz.create_project_membership.return_value = {}

        create_project_membership.lambda_handler(event, lambda_context)

        mock_dz.delete_project_membership.assert_not_called()
        mock_dz.create_project_membership.assert_called_once()

    @patch.object(create_project_membership, 'datazone')
    def test_update_old_delete_fails_continues(self, mock_dz, update_event, lambda_context):
        """Test update continues even if old membership delete fails."""
        mock_dz.delete_project_membership.side_effect = Exception("Delete failed")
        mock_dz.create_project_membership.return_value = {}

        response = create_project_membership.lambda_handler(update_event, lambda_context)

        assert response['PhysicalResourceId'] is not None
        mock_dz.create_project_membership.assert_called_once()

    @patch.object(create_project_membership, 'datazone')
    def test_delete_membership_success(self, mock_dz, delete_event, lambda_context):
        """Test successful membership deletion."""
        mock_dz.delete_project_membership.return_value = {}

        response = create_project_membership.lambda_handler(delete_event, lambda_context)

        assert response['PhysicalResourceId'] == "dzd_test123:proj_abc:arn:aws:iam::123456789012:user/testuser"
        mock_dz.delete_project_membership.assert_called_once()

    @patch.object(create_project_membership, 'datazone')
    def test_delete_membership_not_found(self, mock_dz, delete_event, lambda_context):
        """Test delete when membership already gone."""
        mock_dz.exceptions.ResourceNotFoundException = type(
            'ResourceNotFoundException', (Exception,), {}
        )
        mock_dz.delete_project_membership.side_effect = (
            mock_dz.exceptions.ResourceNotFoundException("Not found")
        )

        response = create_project_membership.lambda_handler(delete_event, lambda_context)

        assert response['PhysicalResourceId'] is not None

    @patch.object(create_project_membership, 'datazone')
    def test_delete_membership_other_error(self, mock_dz, delete_event, lambda_context):
        """Test delete with other error doesn't fail."""
        mock_dz.exceptions.ResourceNotFoundException = type(
            'ResourceNotFoundException', (Exception,), {}
        )
        mock_dz.delete_project_membership.side_effect = Exception("Other error")

        response = create_project_membership.lambda_handler(delete_event, lambda_context)

        assert response['PhysicalResourceId'] is not None

    @patch.object(create_project_membership, 'datazone')
    def test_create_membership_error_raises(self, mock_dz, create_event, lambda_context):
        """Test create error is raised."""
        mock_dz.create_project_membership.side_effect = Exception("API error")

        with pytest.raises(Exception) as exc_info:
            create_project_membership.lambda_handler(create_event, lambda_context)

        assert "API error" in str(exc_info.value)
