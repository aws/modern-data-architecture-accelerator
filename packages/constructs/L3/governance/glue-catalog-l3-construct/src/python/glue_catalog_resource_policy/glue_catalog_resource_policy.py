# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os

import boto3
from botocore.exceptions import ClientError

glue_client = boto3.client("glue")
ram_client = boto3.client("ram")

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("Glue Catalog")



def lambda_handler(event, context):
    logger.info("**Starting")
    logger.info(json.dumps(event, indent=2))
    if event["RequestType"] == "Create":
        return handle_create(event, context)
    elif event["RequestType"] == "Update":
        return handle_create(event, context)
    elif event["RequestType"] == "Delete":
        return handle_delete(event, context)


def handle_create(event, context):
    resource_config = event["ResourceProperties"]
    policy_json = resource_config["resourcePolicyJson"]
    account = resource_config["account"]

    # Check if the glue:Catalog is shared with RAM first
    # see: https://docs.aws.amazon.com/lake-formation/latest/dg/hybrid-cross-account.html
    ram_res = ram_client.list_resources(resourceOwner="SELF")
    hybrid = "glue:Catalog" in set(map(lambda r: r["type"], ram_res["resources"]))
    logger.info("EnableHybrid is set to True")

    response = glue_client.put_resource_policy(
        PolicyInJson=json.dumps(policy_json), EnableHybrid="TRUE" if hybrid else "FALSE"
    )
    logger.info(json.dumps(response, indent=2))
    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": account,
        "Data": {"PolicyHash": response["PolicyHash"]},
    }


def handle_delete(event, context):
    resource_id = event["PhysicalResourceId"]
    # nosemgrep
    # It's ok if resource policy doesn't exist (we are deleting it anyway)
    try:
        glue_client.delete_resource_policy()
    except glue_client.exceptions.EntityNotFoundException as exception:
        pass
    return {"Status": "SUCCESS"}
