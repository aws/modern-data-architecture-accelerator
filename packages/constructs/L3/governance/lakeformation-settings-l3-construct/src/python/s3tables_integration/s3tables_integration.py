# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os

import boto3
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = {"user_agent_extra": solution_identifier}
config = config.Config(**user_agent_extra_param)

glue_client = boto3.client("glue", config=config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("S3 Tables Integration")


def lambda_handler(event, context):
    logger.info("**Starting")
    logger.info(json.dumps(event, indent=2))
    if event["RequestType"] == "Create":
        return handle_create_update(event, context)
    elif event["RequestType"] == "Update":
        return handle_create_update(event, context)
    elif event["RequestType"] == "Delete":
        return handle_delete(event, context)


def handle_create_update(event, context):
    resource_config = event["ResourceProperties"]
    catalog_name = resource_config["catalogName"]
    federated_catalog_identifier = resource_config["federatedCatalogIdentifier"]
    connection_name = resource_config["connectionName"]

    # Creating the s3tablescatalog federated catalog is the API-equivalent of the
    # S3 console "Enable integration" action. On first creation Glue registers the table
    # bucket location with Lake Formation on our behalf and applies the IAM
    # (IAM_ALLOWED_PRINCIPALS) access controls in the default permissions below. If the
    # catalog already exists these defaults are NOT re-applied (see the idempotency note
    # on the create call below); create_catalog is the only write this handler makes.
    catalog_input = {
        "FederatedCatalog": {
            "Identifier": federated_catalog_identifier,
            "ConnectionName": connection_name,
        },
        "CreateDatabaseDefaultPermissions": [
            {
                "Principal": {"DataLakePrincipalIdentifier": "IAM_ALLOWED_PRINCIPALS"},
                "Permissions": ["ALL"],
            }
        ],
        "CreateTableDefaultPermissions": [
            {
                "Principal": {"DataLakePrincipalIdentifier": "IAM_ALLOWED_PRINCIPALS"},
                "Permissions": ["ALL"],
            }
        ],
        "AllowFullTableExternalDataAccess": "True",
    }

    # Idempotent: the integration is a single shared catalog per account/Region, so a
    # redeploy (or a pre-existing manual/prior integration) must succeed without error.
    # When the catalog already exists we treat it as success WITHOUT converging it: an
    # existing catalog's permissions are left unchanged and are not verified against
    # catalog_input above. This is deliberate, because the catalog is a shared account-wide
    # resource another team may own; re-governing it is out of scope for this handler.
    try:
        logger.info(f"Creating Glue catalog {catalog_name}: {json.dumps(catalog_input, indent=2)}")
        glue_client.create_catalog(Name=catalog_name, CatalogInput=catalog_input)
    except glue_client.exceptions.AlreadyExistsException:
        logger.info(
            f"Glue catalog {catalog_name} already exists; treating as success (idempotent). "
            "Its existing permissions were left unchanged and were not verified against the "
            "default configuration."
        )
    except glue_client.exceptions.FederatedResourceAlreadyExistsException:
        logger.info(
            f"Federated resource for {catalog_name} already exists; treating as success (idempotent). "
            "Its existing permissions were left unchanged and were not verified against the "
            "default configuration."
        )

    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": catalog_name,
    }


def handle_delete(event, context):
    resource_config = event["ResourceProperties"]
    catalog_name = resource_config["catalogName"]
    remove_on_delete = resource_config.get("removeOnDelete", False)

    # By default, leave the integration in place on stack delete: it is shared per
    # account/Region and removing it would break queries for other S3 Tables
    # deployments. Only tear it down when the user has explicitly opted in.
    if not (remove_on_delete is True or str(remove_on_delete).lower() == "true"):
        logger.info(
            f"removeOnDelete not set; leaving Glue catalog {catalog_name} in place on delete."
        )
        return {"Status": "SUCCESS"}

    # It's ok if the catalog doesn't exist (we are deleting it anyway).
    try:
        logger.info(f"Deleting Glue catalog {catalog_name}.")
        # nosemgrep
        glue_client.delete_catalog(CatalogId=catalog_name)
    except glue_client.exceptions.EntityNotFoundException:
        logger.info(f"Glue catalog {catalog_name} not found on delete; treating as success.")
    return {"Status": "SUCCESS"}
