"""
Unit tests for create_form_type Lambda function.
"""
import pytest
from unittest.mock import patch

import create_form_type

STRUCTURE = "structure TestForm {\n    note: smithy.api#String\n}"


def form_props(form_name="TestForm", domain_id="dzd-test123", owning_project_id="proj_abc"):
    return {
        "domainId": domain_id,
        "owningProjectId": owning_project_id,
        "formName": form_name,
        "modelStructure": STRUCTURE,
        "status": "ENABLED",
    }


class TestCreateFormType:
    """Test cases for create_form_type module."""

    @pytest.fixture
    def mock_dz(self, mock_datazone_client):
        mock_datazone_client.create_form_type.return_value = {"revision": "1"}
        # By default the form type doesn't exist yet; tests override this to simulate
        # an existing (possibly differently-owned) form type.
        mock_datazone_client.get_form_type.side_effect = mock_datazone_client.exceptions.ResourceNotFoundException()
        with patch.object(create_form_type, "datazone_client", mock_datazone_client):
            yield mock_datazone_client

    def test_build_smithy_model_replaces_hyphens_in_namespace(self):
        model = create_form_type.build_smithy_model("dzd-abc-123", STRUCTURE)
        assert model == f"namespace dzd_abc_123\n\n{STRUCTURE}"

    def test_get_owning_project_returns_none_when_not_found(self, mock_dz):
        assert create_form_type.get_owning_project("dzd-test123", "TestForm") is None

    def test_get_owning_project_returns_owner(self, mock_dz):
        mock_dz.get_form_type.side_effect = None
        mock_dz.get_form_type.return_value = {"owningProjectId": "proj_abc"}

        assert create_form_type.get_owning_project("dzd-test123", "TestForm") == "proj_abc"

    def test_create(self, mock_dz, lambda_context):
        event = {"RequestType": "Create", "ResourceProperties": form_props()}

        response = create_form_type.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "dzd-test123:proj_abc:TestForm"
        assert response["Data"] == {"formName": "TestForm", "revision": "1"}
        mock_dz.create_form_type.assert_called_once_with(
            domainIdentifier="dzd-test123",
            name="TestForm",
            owningProjectIdentifier="proj_abc",
            model={"smithy": f"namespace dzd_test123\n\n{STRUCTURE}"},
            status="ENABLED",
        )

    def test_create_passes_description_when_set(self, mock_dz, lambda_context):
        props = {**form_props(), "description": "A form"}
        create_form_type.lambda_handler({"RequestType": "Create", "ResourceProperties": props}, lambda_context)

        assert mock_dz.create_form_type.call_args.kwargs["description"] == "A form"

    def test_create_missing_param_raises(self, mock_dz, lambda_context):
        props = form_props()
        del props["modelStructure"]

        with pytest.raises(ValueError, match="modelStructure"):
            create_form_type.lambda_handler({"RequestType": "Create", "ResourceProperties": props}, lambda_context)
        mock_dz.create_form_type.assert_not_called()

    def test_create_owned_by_another_project_raises_without_creating(self, mock_dz, lambda_context):
        # Form type names are domain-scoped; a name already owned by a different project
        # must fail loudly instead of silently adding a revision to that project's form.
        mock_dz.get_form_type.side_effect = None
        mock_dz.get_form_type.return_value = {"owningProjectId": "proj_other"}
        event = {"RequestType": "Create", "ResourceProperties": form_props(owning_project_id="proj_abc")}

        with pytest.raises(ValueError, match="proj_other"):
            create_form_type.lambda_handler(event, lambda_context)
        mock_dz.create_form_type.assert_not_called()

    def test_create_owned_by_same_project_adds_revision(self, mock_dz, lambda_context):
        mock_dz.get_form_type.side_effect = None
        mock_dz.get_form_type.return_value = {"owningProjectId": "proj_abc"}
        event = {"RequestType": "Create", "ResourceProperties": form_props(owning_project_id="proj_abc")}

        create_form_type.lambda_handler(event, lambda_context)

        mock_dz.create_form_type.assert_called_once()

    def test_update_same_name_keeps_physical_id(self, mock_dz, lambda_context):
        mock_dz.get_form_type.side_effect = None
        mock_dz.get_form_type.return_value = {"owningProjectId": "proj_abc"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "dzd-test123:proj_abc:TestForm",
            "ResourceProperties": form_props(),
            "OldResourceProperties": form_props(),
        }

        response = create_form_type.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "dzd-test123:proj_abc:TestForm"
        mock_dz.create_form_type.assert_called_once()
        mock_dz.delete_form_type.assert_not_called()

    def test_update_rename_returns_new_physical_id_without_deleting(self, mock_dz, lambda_context):
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "dzd-test123:proj_abc:OldForm",
            "ResourceProperties": form_props("NewForm"),
            "OldResourceProperties": form_props("OldForm"),
        }

        response = create_form_type.lambda_handler(event, lambda_context)

        # CloudFormation deletes the old form type via a follow-up Delete for the old id.
        assert response["PhysicalResourceId"] == "dzd-test123:proj_abc:NewForm"
        mock_dz.delete_form_type.assert_not_called()

    def test_update_new_owning_project_fails_with_clear_message(self, mock_dz, lambda_context):
        # A project replacement (same name, new owningProjectId) arrives as an Update while the
        # form still exists under the old project. DataZone can't transfer it, so fail clearly
        # instead of the generic name-collision error.
        mock_dz.get_form_type.side_effect = None
        mock_dz.get_form_type.return_value = {"owningProjectId": "proj_old"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "dzd-test123:proj_old:TestForm",
            "ResourceProperties": form_props(owning_project_id="proj_new"),
            "OldResourceProperties": form_props(owning_project_id="proj_old"),
        }

        with pytest.raises(ValueError, match="cannot change owner"):
            create_form_type.lambda_handler(event, lambda_context)
        mock_dz.create_form_type.assert_not_called()
        mock_dz.delete_form_type.assert_not_called()

    def test_update_owned_by_unrelated_project_reports_name_collision(self, mock_dz, lambda_context):
        mock_dz.get_form_type.side_effect = None
        mock_dz.get_form_type.return_value = {"owningProjectId": "proj_other"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "dzd-test123:proj_old:TestForm",
            "ResourceProperties": form_props(owning_project_id="proj_new"),
            "OldResourceProperties": form_props(owning_project_id="proj_old"),
        }

        with pytest.raises(ValueError, match="domain-scoped"):
            create_form_type.lambda_handler(event, lambda_context)

    def test_delete_matching_physical_id(self, mock_dz, lambda_context):
        mock_dz.get_form_type.side_effect = None
        mock_dz.get_form_type.return_value = {"owningProjectId": "proj_abc"}
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "dzd-test123:proj_abc:TestForm",
            "ResourceProperties": form_props(),
        }

        response = create_form_type.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "dzd-test123:proj_abc:TestForm"
        mock_dz.delete_form_type.assert_called_once_with(
            domainIdentifier="dzd-test123",
            formTypeIdentifier="TestForm",
        )

    def test_delete_owned_by_another_project_skips_delete(self, mock_dz, lambda_context):
        # The name was re-created under a different owning project since this resource
        # last acted (e.g. after the collision in test_create_owned_by_another_project);
        # deleting by name here would remove that project's form type.
        mock_dz.get_form_type.side_effect = None
        mock_dz.get_form_type.return_value = {"owningProjectId": "proj_other"}
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "dzd-test123:proj_abc:TestForm",
            "ResourceProperties": form_props(owning_project_id="proj_abc"),
        }

        create_form_type.lambda_handler(event, lambda_context)

        mock_dz.delete_form_type.assert_not_called()

    def test_delete_after_failed_create_skips_delete(self, mock_dz, lambda_context):
        # A failed Create is rolled back with a framework-generated physical id; a
        # pre-existing form type with the same name must not be deleted.
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "generated-request-id",
            "ResourceProperties": form_props(),
        }

        response = create_form_type.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "generated-request-id"
        mock_dz.delete_form_type.assert_not_called()

    def test_delete_get_form_type_error_does_not_raise(self, mock_dz, lambda_context):
        # A GetFormType error other than ResourceNotFoundException (throttling, a stale
        # role missing datazone:GetFormType, ...) must not block teardown either.
        mock_dz.get_form_type.side_effect = Exception("ThrottlingException")
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "dzd-test123:proj_abc:TestForm",
            "ResourceProperties": form_props(),
        }

        create_form_type.lambda_handler(event, lambda_context)

        mock_dz.delete_form_type.assert_not_called()

    def test_delete_not_found_does_not_raise(self, mock_dz, lambda_context):
        # get_form_type (via get_owning_project) already reports not-found for this case.
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "dzd-test123:proj_abc:TestForm",
            "ResourceProperties": form_props(),
        }

        create_form_type.lambda_handler(event, lambda_context)

        mock_dz.delete_form_type.assert_not_called()

    def test_delete_failure_does_not_raise(self, mock_dz, lambda_context):
        mock_dz.get_form_type.side_effect = None
        mock_dz.get_form_type.return_value = {"owningProjectId": "proj_abc"}
        mock_dz.delete_form_type.side_effect = Exception("form type in use")
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "dzd-test123:proj_abc:TestForm",
            "ResourceProperties": form_props(),
        }

        create_form_type.lambda_handler(event, lambda_context)

    def test_unsupported_request_type_raises(self, mock_dz, lambda_context):
        with pytest.raises(ValueError, match="Unsupported RequestType"):
            create_form_type.lambda_handler({"RequestType": "Bogus", "ResourceProperties": form_props()}, lambda_context)
