"""
Unit tests for the s3tables_integration Lambda custom-resource handler.
"""
from unittest.mock import patch

import pytest

import s3tables_integration


class TestLambdaHandlerRouting:
    """RequestType routing in lambda_handler."""

    def test_create_routes_to_handle_create_update(self, create_event, lambda_context):
        with patch.object(s3tables_integration, 'handle_create_update') as mock_handler:
            mock_handler.return_value = {"Status": "SUCCESS"}
            s3tables_integration.lambda_handler(create_event, lambda_context)
            mock_handler.assert_called_once_with(create_event, lambda_context)

    def test_update_routes_to_handle_create_update(self, update_event, lambda_context):
        with patch.object(s3tables_integration, 'handle_create_update') as mock_handler:
            mock_handler.return_value = {"Status": "SUCCESS"}
            s3tables_integration.lambda_handler(update_event, lambda_context)
            mock_handler.assert_called_once_with(update_event, lambda_context)

    def test_delete_routes_to_handle_delete(self, delete_event, lambda_context):
        with patch.object(s3tables_integration, 'handle_delete') as mock_handler:
            mock_handler.return_value = {"Status": "SUCCESS"}
            s3tables_integration.lambda_handler(delete_event, lambda_context)
            mock_handler.assert_called_once_with(delete_event, lambda_context)

    def test_unknown_request_type_returns_none(self, lambda_context):
        # lambda_handler has no branch for request types other than
        # Create/Update/Delete and intentionally returns None. Pinned so the
        # no-op behaviour is a recorded decision rather than an accident.
        event = {"RequestType": "Snapshot", "ResourceProperties": {}}
        assert s3tables_integration.lambda_handler(event, lambda_context) is None


class TestHandleCreateUpdate:
    """create/update path: catalog creation and idempotency."""

    def test_create_calls_create_catalog_with_federated_input(
        self, create_event, lambda_context, mock_glue_client
    ):
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            result = s3tables_integration.handle_create_update(create_event, lambda_context)

        mock_glue_client.create_catalog.assert_called_once()
        kwargs = mock_glue_client.create_catalog.call_args.kwargs
        assert kwargs["Name"] == "s3tablescatalog"
        catalog_input = kwargs["CatalogInput"]
        assert catalog_input["FederatedCatalog"]["Identifier"] == (
            "arn:aws:s3tables:us-east-1:123456789012:bucket/*"
        )
        assert catalog_input["FederatedCatalog"]["ConnectionName"] == "aws:s3tables"
        assert catalog_input["CreateDatabaseDefaultPermissions"][0]["Principal"][
            "DataLakePrincipalIdentifier"
        ] == "IAM_ALLOWED_PRINCIPALS"
        assert result["Status"] == "SUCCESS"
        assert result["PhysicalResourceId"] == "s3tablescatalog"

    def test_create_catalog_applies_iam_governed_defaults(
        self, create_event, lambda_context, mock_glue_client
    ):
        # These three values decide whether Lake Formation governs the
        # s3tablescatalog catalogs. They must survive refactors, so assert the
        # full shape of both permission blocks and the external-access flag —
        # not just the database principal.
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            s3tables_integration.handle_create_update(create_event, lambda_context)

        catalog_input = mock_glue_client.create_catalog.call_args.kwargs["CatalogInput"]

        expected_default_permissions = [
            {
                "Principal": {"DataLakePrincipalIdentifier": "IAM_ALLOWED_PRINCIPALS"},
                "Permissions": ["ALL"],
            }
        ]
        assert catalog_input["CreateDatabaseDefaultPermissions"] == expected_default_permissions
        assert catalog_input["CreateTableDefaultPermissions"] == expected_default_permissions
        assert catalog_input["AllowFullTableExternalDataAccess"] == "True"

    def test_update_uses_same_create_catalog_path(
        self, update_event, lambda_context, mock_glue_client
    ):
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            result = s3tables_integration.handle_create_update(update_event, lambda_context)

        mock_glue_client.create_catalog.assert_called_once()
        assert result["Status"] == "SUCCESS"

    def test_create_idempotent_on_already_exists(
        self, create_event, lambda_context, mock_glue_client
    ):
        mock_glue_client.create_catalog.side_effect = (
            mock_glue_client.exceptions.AlreadyExistsException("exists")
        )
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            result = s3tables_integration.handle_create_update(create_event, lambda_context)

        assert result["Status"] == "SUCCESS"
        assert result["PhysicalResourceId"] == "s3tablescatalog"

    def test_create_idempotent_on_federated_resource_already_exists(
        self, create_event, lambda_context, mock_glue_client
    ):
        mock_glue_client.create_catalog.side_effect = (
            mock_glue_client.exceptions.FederatedResourceAlreadyExistsException("exists")
        )
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            result = s3tables_integration.handle_create_update(create_event, lambda_context)

        assert result["Status"] == "SUCCESS"


class TestHandleDelete:
    """delete path: removeOnDelete safety gate."""

    def test_delete_leaves_catalog_in_place_by_default(
        self, delete_event, lambda_context, mock_glue_client
    ):
        # removeOnDelete defaults to False in the event fixture.
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            result = s3tables_integration.handle_delete(delete_event, lambda_context)

        mock_glue_client.delete_catalog.assert_not_called()
        assert result["Status"] == "SUCCESS"

    def test_delete_leaves_catalog_in_place_when_missing(
        self, delete_event, lambda_context, mock_glue_client
    ):
        del delete_event["ResourceProperties"]["removeOnDelete"]
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            result = s3tables_integration.handle_delete(delete_event, lambda_context)

        mock_glue_client.delete_catalog.assert_not_called()
        assert result["Status"] == "SUCCESS"

    def test_delete_leaves_catalog_in_place_when_false_string(
        self, delete_event, lambda_context, mock_glue_client
    ):
        # CloudFormation serializes the safe default as the string "false", not the
        # Python bool False. This is the most important non-destructive path, so pin it
        # in the exact wire format the handler receives at runtime.
        delete_event["ResourceProperties"]["removeOnDelete"] = "false"
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            result = s3tables_integration.handle_delete(delete_event, lambda_context)

        mock_glue_client.delete_catalog.assert_not_called()
        assert result["Status"] == "SUCCESS"

    def test_delete_removes_catalog_when_true_bool(
        self, delete_event, lambda_context, mock_glue_client
    ):
        delete_event["ResourceProperties"]["removeOnDelete"] = True
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            result = s3tables_integration.handle_delete(delete_event, lambda_context)

        mock_glue_client.delete_catalog.assert_called_once_with(CatalogId="s3tablescatalog")
        assert result["Status"] == "SUCCESS"

    def test_delete_removes_catalog_when_true_string(
        self, delete_event, lambda_context, mock_glue_client
    ):
        # CloudFormation serializes custom-resource properties as strings.
        delete_event["ResourceProperties"]["removeOnDelete"] = "true"
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            result = s3tables_integration.handle_delete(delete_event, lambda_context)

        mock_glue_client.delete_catalog.assert_called_once_with(CatalogId="s3tablescatalog")
        assert result["Status"] == "SUCCESS"

    def test_delete_idempotent_on_entity_not_found(
        self, delete_event, lambda_context, mock_glue_client
    ):
        delete_event["ResourceProperties"]["removeOnDelete"] = True
        mock_glue_client.delete_catalog.side_effect = (
            mock_glue_client.exceptions.EntityNotFoundException("not found")
        )
        with patch.object(s3tables_integration, 'glue_client', mock_glue_client):
            result = s3tables_integration.handle_delete(delete_event, lambda_context)

        assert result["Status"] == "SUCCESS"
