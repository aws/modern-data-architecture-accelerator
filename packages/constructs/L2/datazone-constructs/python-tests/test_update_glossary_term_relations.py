"""
Unit tests for update_glossary_term_relations Lambda function.
"""
import pytest
from unittest.mock import patch

import update_glossary_term_relations


def relations_props(term_id="trm123", domain_id="dzd-test123", related_term_ids=None):
    return {
        "domainId": domain_id,
        "termId": term_id,
        "relatedTermIds": related_term_ids if related_term_ids is not None else ["trm-a", "trm-b"],
    }


class TestUpdateGlossaryTermRelations:
    """Test cases for update_glossary_term_relations module."""

    @pytest.fixture
    def mock_dz(self, mock_datazone_client):
        mock_datazone_client.get_glossary_term.return_value = {}
        with patch.object(update_glossary_term_relations, "datazone_client", mock_datazone_client):
            yield mock_datazone_client

    def test_create_sets_relations(self, mock_dz, lambda_context):
        event = {"RequestType": "Create", "ResourceProperties": relations_props()}

        response = update_glossary_term_relations.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "trm123"
        mock_dz.update_glossary_term.assert_called_once_with(
            domainIdentifier="dzd-test123",
            identifier="trm123",
            termRelations={"isA": ["trm-a", "trm-b"]},
        )

    def test_update_sets_relations(self, mock_dz, lambda_context):
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "trm123",
            "ResourceProperties": relations_props(related_term_ids=["trm-c"]),
        }

        response = update_glossary_term_relations.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "trm123"
        mock_dz.update_glossary_term.assert_called_once_with(
            domainIdentifier="dzd-test123",
            identifier="trm123",
            termRelations={"isA": ["trm-c"]},
        )

    def test_update_follows_owning_term_to_a_new_id(self, mock_dz, lambda_context):
        # The owning term's own custom resource can be replaced (e.g. its glossary's
        # construct key was renamed), giving it a new physical term ID. CloudFormation
        # still delivers this as an Update of the SAME term-relations resource (its
        # construct ID is unchanged), with the new termId in ResourceProperties but the
        # OLD term's ID as the event's own PhysicalResourceId.
        event = {
            "RequestType": "Update",
            "PhysicalResourceId": "trm-old",
            "ResourceProperties": relations_props(term_id="trm-new"),
        }

        response = update_glossary_term_relations.lambda_handler(event, lambda_context)

        # Returning a PhysicalResourceId that differs from the event's signals a
        # replacement: CloudFormation follows up with a Delete on "trm-old".
        assert response["PhysicalResourceId"] == "trm-new"
        mock_dz.update_glossary_term.assert_called_once_with(
            domainIdentifier="dzd-test123",
            identifier="trm-new",
            termRelations={"isA": ["trm-a", "trm-b"]},
        )

    def test_create_preserves_existing_classifies(self, mock_dz, lambda_context):
        # It's unconfirmed whether UpdateGlossaryTerm merges termRelations or replaces it
        # outright, so the existing classifies (read via GetGlossaryTerm) must be re-sent
        # unchanged to avoid silently wiping it either way.
        mock_dz.get_glossary_term.return_value = {"termRelations": {"classifies": ["trm-child"]}}
        event = {"RequestType": "Create", "ResourceProperties": relations_props()}

        update_glossary_term_relations.lambda_handler(event, lambda_context)

        mock_dz.get_glossary_term.assert_called_once_with(domainIdentifier="dzd-test123", identifier="trm123")
        mock_dz.update_glossary_term.assert_called_once_with(
            domainIdentifier="dzd-test123",
            identifier="trm123",
            termRelations={"isA": ["trm-a", "trm-b"], "classifies": ["trm-child"]},
        )

    def test_create_missing_param_raises(self, mock_dz, lambda_context):
        props = relations_props()
        del props["termId"]

        with pytest.raises(ValueError, match="termId"):
            update_glossary_term_relations.lambda_handler(
                {"RequestType": "Create", "ResourceProperties": props}, lambda_context
            )
        mock_dz.update_glossary_term.assert_not_called()

    def test_create_empty_string_param_raises(self, mock_dz, lambda_context):
        # get_required_param must reject falsy values, not just None: an empty termId would
        # otherwise produce an empty PhysicalResourceId and an empty-identifier API call.
        props = relations_props(term_id="")

        with pytest.raises(ValueError, match="termId"):
            update_glossary_term_relations.lambda_handler(
                {"RequestType": "Create", "ResourceProperties": props}, lambda_context
            )
        mock_dz.update_glossary_term.assert_not_called()

    def test_create_missing_related_term_ids_raises(self, mock_dz, lambda_context):
        # relatedTermIds is required, not defaulted to []: an empty list would reach
        # update_glossary_term as isA: [], which DataZone always rejects.
        props = relations_props()
        del props["relatedTermIds"]

        with pytest.raises(ValueError, match="relatedTermIds"):
            update_glossary_term_relations.lambda_handler(
                {"RequestType": "Create", "ResourceProperties": props}, lambda_context
            )
        mock_dz.update_glossary_term.assert_not_called()

    def test_delete_clears_relations(self, mock_dz, lambda_context):
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "trm123",
            "ResourceProperties": relations_props(),
        }

        response = update_glossary_term_relations.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "trm123"
        # DataZone's termRelations.isA/classifies lists reject an explicit empty list
        # client-side (botocore ParamValidationError), so clearing can only omit the key.
        mock_dz.update_glossary_term.assert_called_once_with(
            domainIdentifier="dzd-test123",
            identifier="trm123",
            termRelations={},
        )
        # The clear is verified by reading the term back.
        mock_dz.get_glossary_term.assert_called_once_with(domainIdentifier="dzd-test123", identifier="trm123")

    def test_delete_raises_when_relationship_not_cleared(self, mock_dz, lambda_context):
        # If DataZone's omit-the-key call doesn't actually clear isA, the Delete must
        # fail loudly rather than report success with the relationship still in place.
        mock_dz.get_glossary_term.return_value = {"termRelations": {"isA": ["trm-a"]}}
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "trm123",
            "ResourceProperties": relations_props(),
        }

        with pytest.raises(RuntimeError, match="still \\['trm-a'\\] after clearing"):
            update_glossary_term_relations.lambda_handler(event, lambda_context)

    def test_delete_missing_ids_skips(self, mock_dz, lambda_context):
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "trm123",
            "ResourceProperties": {"domainId": "", "termId": "trm123"},
        }

        update_glossary_term_relations.lambda_handler(event, lambda_context)

        mock_dz.update_glossary_term.assert_not_called()

    def test_delete_not_found_does_not_raise(self, mock_dz, lambda_context):
        mock_dz.update_glossary_term.side_effect = mock_dz.exceptions.ResourceNotFoundException()
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "trm123",
            "ResourceProperties": relations_props(),
        }

        response = update_glossary_term_relations.lambda_handler(event, lambda_context)

        assert response["PhysicalResourceId"] == "trm123"
        # The term is already gone, so there's nothing to read back and verify.
        mock_dz.get_glossary_term.assert_not_called()

    def test_delete_failure_raises(self, mock_dz, lambda_context):
        # Any failure other than ResourceNotFoundException must propagate: CloudFormation
        # can retry a failed Delete, but a swallowed failure guarantees a leftover
        # relationship and an undeletable term/glossary on the next deploy.
        mock_dz.update_glossary_term.side_effect = Exception("term in use")
        event = {
            "RequestType": "Delete",
            "PhysicalResourceId": "trm123",
            "ResourceProperties": relations_props(),
        }

        with pytest.raises(Exception, match="term in use"):
            update_glossary_term_relations.lambda_handler(event, lambda_context)

    def test_unsupported_request_type_raises(self, mock_dz, lambda_context):
        with pytest.raises(ValueError, match="Unsupported RequestType"):
            update_glossary_term_relations.lambda_handler(
                {"RequestType": "Bogus", "ResourceProperties": relations_props()}, lambda_context
            )
