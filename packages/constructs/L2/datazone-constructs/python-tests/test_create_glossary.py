"""
Unit tests for create_glossary Lambda function.
"""
import pytest
from unittest.mock import patch

import create_glossary


def glossary_props(glossary_name="TestGlossary", domain_id="dzd-test123", owning_project_id="proj_abc"):
    return {
        "domainId": domain_id,
        "owningProjectId": owning_project_id,
        "glossaryName": glossary_name,
        "status": "ENABLED",
    }


class TestCreateGlossary:
    """Test cases for create_glossary module."""

    @pytest.fixture
    def mock_dz(self, mock_datazone_client):
        mock_datazone_client.create_glossary.return_value = {"id": "gls123"}
        with patch.object(create_glossary, "datazone_client", mock_datazone_client):
            yield mock_datazone_client

    def test_create(self, mock_dz, lambda_context):
        event = {"RequestType": "Create", "ResourceProperties": glossary_props()}

        response = create_glossary.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "gls123"
        assert response["Data"] == {"glossaryName": "TestGlossary", "glossaryId": "gls123"}
        mock_dz.create_glossary.assert_called_once_with(
            domainIdentifier="dzd-test123",
            name="TestGlossary",
            owningProjectIdentifier="proj_abc",
            status="ENABLED",
        )

    def test_create_passes_description_when_set(self, mock_dz, lambda_context):
        props = {**glossary_props(), "description": "Standard business terms"}
        create_glossary.lambda_handler({"RequestType": "Create", "ResourceProperties": props}, lambda_context)

        assert mock_dz.create_glossary.call_args.kwargs["description"] == "Standard business terms"

    def test_create_omits_description_when_not_set(self, mock_dz, lambda_context):
        create_glossary.lambda_handler(
            {"RequestType": "Create", "ResourceProperties": glossary_props()}, lambda_context
        )

        assert "description" not in mock_dz.create_glossary.call_args.kwargs

    def test_create_missing_param_raises(self, mock_dz, lambda_context):
        props = glossary_props()
        del props["glossaryName"]

        with pytest.raises(ValueError, match="glossaryName"):
            create_glossary.lambda_handler({"RequestType": "Create", "ResourceProperties": props}, lambda_context)
        mock_dz.create_glossary.assert_not_called()

    def test_update_same_domain_and_owner_updates_in_place(self, mock_dz, lambda_context):
        mock_dz.update_glossary.return_value = {"id": "gls123"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "gls123",
            "ResourceProperties": {**glossary_props(), "description": "Updated"},
            "OldResourceProperties": {**glossary_props(), "description": "Updated"},
        }

        response = create_glossary.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "gls123"
        mock_dz.update_glossary.assert_called_once_with(
            domainIdentifier="dzd-test123",
            identifier="gls123",
            name="TestGlossary",
            status="ENABLED",
            description="Updated",
        )
        mock_dz.create_glossary.assert_not_called()

    def test_update_clears_description_when_removed(self, mock_dz, lambda_context):
        mock_dz.update_glossary.return_value = {"id": "gls123"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "gls123",
            "ResourceProperties": glossary_props(),
            "OldResourceProperties": {**glossary_props(), "description": "Was set"},
        }

        create_glossary.lambda_handler(event, lambda_context)

        assert mock_dz.update_glossary.call_args.kwargs["description"] == ""

    def test_update_owning_project_change_raises(self, mock_dz, lambda_context):
        # DataZone has no API to transfer a glossary's owning project, and the name is still
        # taken by the existing glossary in the same domain; fail clearly instead of attempting
        # a same-named CreateGlossary that would hit ConflictException.
        mock_dz.get_glossary.return_value = {"owningProjectId": "proj_old"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "gls_old",
            "ResourceProperties": glossary_props(owning_project_id="proj_new"),
            "OldResourceProperties": glossary_props(owning_project_id="proj_old"),
        }

        with pytest.raises(ValueError, match="cannot change owner"):
            create_glossary.lambda_handler(event, lambda_context)
        mock_dz.create_glossary.assert_not_called()
        mock_dz.update_glossary.assert_not_called()

    def test_update_owning_project_change_rollback_updates_in_place(self, mock_dz, lambda_context):
        # CloudFormation's rollback of a failed Update redelivers this event with the two
        # property sets reversed. The live owner still matches what the (reversed)
        # ResourceProperties claim, so this must update in place instead of raising again,
        # or the stack is left in UPDATE_ROLLBACK_FAILED.
        mock_dz.get_glossary.return_value = {"owningProjectId": "proj_old"}
        mock_dz.update_glossary.return_value = {"id": "gls_old"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "gls_old",
            "ResourceProperties": glossary_props(owning_project_id="proj_old"),
            "OldResourceProperties": glossary_props(owning_project_id="proj_new"),
        }

        response = create_glossary.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "gls_old"
        mock_dz.create_glossary.assert_not_called()
        mock_dz.update_glossary.assert_called_once()

    def test_update_domain_change_raises(self, mock_dz, lambda_context):
        # DataZone can't move a glossary between domains; fail clearly instead of attempting a
        # same-named CreateGlossary in the new domain.
        mock_dz.get_glossary.side_effect = mock_dz.exceptions.ResourceNotFoundException()
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "gls_old",
            "ResourceProperties": glossary_props(domain_id="dzd-new"),
            "OldResourceProperties": glossary_props(domain_id="dzd-test123"),
        }

        with pytest.raises(ValueError, match="cannot change domain"):
            create_glossary.lambda_handler(event, lambda_context)
        mock_dz.create_glossary.assert_not_called()
        mock_dz.update_glossary.assert_not_called()

    def test_update_domain_change_rollback_updates_in_place(self, mock_dz, lambda_context):
        # CloudFormation's rollback of a failed Update redelivers this event with the two
        # property sets reversed. The glossary is still live in the domain the (reversed)
        # ResourceProperties claim, so this must update in place instead of raising again,
        # or the stack is left in UPDATE_ROLLBACK_FAILED.
        mock_dz.get_glossary.return_value = {"owningProjectId": "proj_abc"}
        mock_dz.update_glossary.return_value = {"id": "gls_old"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "gls_old",
            "ResourceProperties": glossary_props(domain_id="dzd-test123"),
            "OldResourceProperties": glossary_props(domain_id="dzd-new"),
        }

        response = create_glossary.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "gls_old"
        mock_dz.create_glossary.assert_not_called()
        mock_dz.update_glossary.assert_called_once()

    def test_create_conflict_raises_descriptive_error(self, mock_dz, lambda_context):
        # A leftover glossary from a previous best-effort delete blocks the name; surface a
        # clear error instead of a bare ConflictException.
        mock_dz.create_glossary.side_effect = mock_dz.exceptions.ConflictException()
        event = {"RequestType": "Create", "ResourceProperties": glossary_props()}

        with pytest.raises(ValueError, match="TestGlossary.*already exists.*dzd-test123"):
            create_glossary.lambda_handler(event, lambda_context)

    def test_delete(self, mock_dz, lambda_context):
        event = {"RequestType": "Delete", "PhysicalResourceId": "gls123", "ResourceProperties": glossary_props()}

        response = create_glossary.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "gls123"
        # Pins the order: disable before delete. Two independent assert_called_once_with calls
        # can't catch the two calls happening in the wrong order.
        assert [c[0] for c in mock_dz.mock_calls] == ["update_glossary", "delete_glossary"]
        mock_dz.update_glossary.assert_called_once_with(
            domainIdentifier="dzd-test123", identifier="gls123", status="DISABLED"
        )
        mock_dz.delete_glossary.assert_called_once_with(domainIdentifier="dzd-test123", identifier="gls123")

    def test_delete_missing_ids_skips(self, mock_dz, lambda_context):
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "gls123",
            "ResourceProperties": {"domainId": "", "glossaryName": "TestGlossary"},
        }

        create_glossary.lambda_handler(event, lambda_context)

        mock_dz.delete_glossary.assert_not_called()

    def test_delete_not_found_does_not_raise(self, mock_dz, lambda_context):
        mock_dz.update_glossary.side_effect = mock_dz.exceptions.ResourceNotFoundException()
        event = {"RequestType": "Delete", "PhysicalResourceId": "gls123", "ResourceProperties": glossary_props()}

        create_glossary.lambda_handler(event, lambda_context)

        mock_dz.delete_glossary.assert_not_called()

    def test_delete_failure_does_not_raise(self, mock_dz, lambda_context):
        mock_dz.delete_glossary.side_effect = Exception("glossary has attached terms")
        event = {"RequestType": "Delete", "PhysicalResourceId": "gls123", "ResourceProperties": glossary_props()}

        create_glossary.lambda_handler(event, lambda_context)

    def test_unsupported_request_type_raises(self, mock_dz, lambda_context):
        with pytest.raises(ValueError, match="Unsupported RequestType"):
            create_glossary.lambda_handler(
                {"RequestType": "Bogus", "ResourceProperties": glossary_props()}, lambda_context
            )
