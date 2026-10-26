"""
Unit tests for create_glossary_term Lambda function.
"""
import pytest
from unittest.mock import patch

import create_glossary_term


def term_props(term_name="TestTerm", domain_id="dzd-test123", glossary_id="gls123"):
    return {
        "domainId": domain_id,
        "glossaryId": glossary_id,
        "termName": term_name,
        "status": "ENABLED",
    }


class TestCreateGlossaryTerm:
    """Test cases for create_glossary_term module."""

    @pytest.fixture
    def mock_dz(self, mock_datazone_client):
        mock_datazone_client.create_glossary_term.return_value = {"id": "trm123"}
        with patch.object(create_glossary_term, "datazone_client", mock_datazone_client):
            yield mock_datazone_client

    def test_create(self, mock_dz, lambda_context):
        event = {"RequestType": "Create", "ResourceProperties": term_props()}

        response = create_glossary_term.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "trm123"
        assert response["Data"] == {"termName": "TestTerm", "termId": "trm123"}
        mock_dz.create_glossary_term.assert_called_once_with(
            domainIdentifier="dzd-test123",
            glossaryIdentifier="gls123",
            name="TestTerm",
            status="ENABLED",
        )

    def test_create_passes_descriptions_when_set(self, mock_dz, lambda_context):
        props = {**term_props(), "shortDescription": "CLV", "longDescription": "Customer lifetime value"}
        create_glossary_term.lambda_handler({"RequestType": "Create", "ResourceProperties": props}, lambda_context)

        assert mock_dz.create_glossary_term.call_args.kwargs["shortDescription"] == "CLV"
        assert mock_dz.create_glossary_term.call_args.kwargs["longDescription"] == "Customer lifetime value"

    def test_create_omits_descriptions_when_not_set(self, mock_dz, lambda_context):
        create_glossary_term.lambda_handler(
            {"RequestType": "Create", "ResourceProperties": term_props()}, lambda_context
        )

        assert "shortDescription" not in mock_dz.create_glossary_term.call_args.kwargs
        assert "longDescription" not in mock_dz.create_glossary_term.call_args.kwargs

    def test_create_missing_param_raises(self, mock_dz, lambda_context):
        props = term_props()
        del props["glossaryId"]

        with pytest.raises(ValueError, match="glossaryId"):
            create_glossary_term.lambda_handler({"RequestType": "Create", "ResourceProperties": props}, lambda_context)
        mock_dz.create_glossary_term.assert_not_called()

    def test_update_same_domain_and_glossary_updates_in_place(self, mock_dz, lambda_context):
        mock_dz.update_glossary_term.return_value = {"id": "trm123"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "trm123",
            "ResourceProperties": {**term_props(), "shortDescription": "Updated"},
            "OldResourceProperties": {**term_props(), "shortDescription": "Updated"},
        }

        response = create_glossary_term.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "trm123"
        mock_dz.update_glossary_term.assert_called_once_with(
            domainIdentifier="dzd-test123",
            identifier="trm123",
            name="TestTerm",
            status="ENABLED",
            shortDescription="Updated",
            longDescription="",
        )
        mock_dz.create_glossary_term.assert_not_called()

    def test_update_clears_descriptions_when_removed(self, mock_dz, lambda_context):
        mock_dz.update_glossary_term.return_value = {"id": "trm123"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "trm123",
            "ResourceProperties": term_props(),
            "OldResourceProperties": {
                **term_props(),
                "shortDescription": "Was set",
                "longDescription": "Was also set",
            },
        }

        create_glossary_term.lambda_handler(event, lambda_context)

        assert mock_dz.update_glossary_term.call_args.kwargs["shortDescription"] == ""
        assert mock_dz.update_glossary_term.call_args.kwargs["longDescription"] == ""

    def test_update_glossary_change_creates_replacement(self, mock_dz, lambda_context):
        # A term can't move to a different glossary in place; CloudFormation deletes the old
        # physical resource via a follow-up Delete once this succeeds. The live term is still
        # under the old glossary, so this is a genuine replace, not a rollback.
        mock_dz.get_glossary_term.return_value = {"glossaryId": "gls_old"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "trm_old",
            "ResourceProperties": term_props(glossary_id="gls_new"),
            "OldResourceProperties": term_props(glossary_id="gls_old"),
        }

        response = create_glossary_term.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "trm123"  # the new id returned by create_glossary_term
        mock_dz.update_glossary_term.assert_not_called()
        mock_dz.create_glossary_term.assert_called_once_with(
            domainIdentifier="dzd-test123",
            glossaryIdentifier="gls_new",
            name="TestTerm",
            status="ENABLED",
        )

    def test_update_glossary_change_rollback_updates_in_place(self, mock_dz, lambda_context):
        # CloudFormation's rollback of a failed replace redelivers this event with the two
        # property sets reversed. The term is still under the glossary the (reversed)
        # ResourceProperties claim, so this must update in place instead of attempting another
        # same-named create, or the stack is left in UPDATE_ROLLBACK_FAILED.
        mock_dz.get_glossary_term.return_value = {"glossaryId": "gls_old"}
        mock_dz.update_glossary_term.return_value = {"id": "trm_old"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "trm_old",
            "ResourceProperties": term_props(glossary_id="gls_old"),
            "OldResourceProperties": term_props(glossary_id="gls_new"),
        }

        response = create_glossary_term.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "trm_old"
        mock_dz.create_glossary_term.assert_not_called()
        mock_dz.update_glossary_term.assert_called_once()

    def test_update_domain_change_updates_in_place(self, mock_dz, lambda_context):
        # The project's domain changing is guarded at the glossary level: by the time a term's
        # Update fires, the dependency graph guarantees the glossary already matches. A
        # domain-only mismatch here is not a replace trigger; it updates in place.
        mock_dz.update_glossary_term.return_value = {"id": "trm_old"}
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "trm_old",
            "ResourceProperties": term_props(domain_id="dzd-new"),
            "OldResourceProperties": term_props(domain_id="dzd-test123"),
        }

        response = create_glossary_term.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "trm_old"
        mock_dz.create_glossary_term.assert_not_called()
        mock_dz.get_glossary_term.assert_not_called()
        mock_dz.update_glossary_term.assert_called_once_with(
            domainIdentifier="dzd-new",
            identifier="trm_old",
            name="TestTerm",
            status="ENABLED",
            shortDescription="",
            longDescription="",
        )

    def test_delete(self, mock_dz, lambda_context):
        event = {"RequestType": "Delete", "PhysicalResourceId": "trm123", "ResourceProperties": term_props()}

        response = create_glossary_term.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "trm123"
        mock_dz.delete_glossary_term.assert_called_once_with(domainIdentifier="dzd-test123", identifier="trm123")

    def test_delete_missing_ids_skips(self, mock_dz, lambda_context):
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "trm123",
            "ResourceProperties": {"domainId": "", "termName": "TestTerm"},
        }

        create_glossary_term.lambda_handler(event, lambda_context)

        mock_dz.delete_glossary_term.assert_not_called()

    def test_delete_not_found_does_not_raise(self, mock_dz, lambda_context):
        mock_dz.delete_glossary_term.side_effect = mock_dz.exceptions.ResourceNotFoundException()
        event = {"RequestType": "Delete", "PhysicalResourceId": "trm123", "ResourceProperties": term_props()}

        create_glossary_term.lambda_handler(event, lambda_context)

    def test_delete_failure_does_not_raise(self, mock_dz, lambda_context):
        mock_dz.delete_glossary_term.side_effect = Exception("term in use")
        event = {"RequestType": "Delete", "PhysicalResourceId": "trm123", "ResourceProperties": term_props()}

        create_glossary_term.lambda_handler(event, lambda_context)

    def test_unsupported_request_type_raises(self, mock_dz, lambda_context):
        with pytest.raises(ValueError, match="Unsupported RequestType"):
            create_glossary_term.lambda_handler(
                {"RequestType": "Bogus", "ResourceProperties": term_props()}, lambda_context
            )
