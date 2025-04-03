# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import os
from botocore.exceptions import ClientError
import logging

datazone_client = boto3.client('datazone')

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("Blueprint configuration")


def lambda_handler(event, context):
    logger.info("Starting the function")
    logger.debug(json.dumps(event, indent=2))
    logger.info("Sleeping 30 seconds to allow for IAM permission propagation")
    # nosemgrep
    time.sleep(30)
    if event['RequestType'] == 'Create' or event['RequestType'] == 'Update':
        return handle_create_update(event, context)


def handle_create_update(event, context):

    resource_config = event['ResourceProperties']
    domainIdentifier = resource_config.get('domainIdentifier', None)
    if (domainIdentifier is None):
        raise Exception("Unable to parse domainIdentifier from event.")
    
    environmentBlueprintIdentifier = resource_config.get(
        'environmentBlueprintIdentifier', None)
    if (environmentBlueprintIdentifier is None):
        raise Exception(
            "Unable to parse environmentBlueprintIdentifier from event.")
    
    enabledRegions = resource_config.get(
        'enabledRegions', None)
    if (enabledRegions is None):
        raise Exception("Unable to parse enabledRegions from event.")

    update_response = datazone_client.put_environment_blueprint_configuration(
        domainIdentifier=domainIdentifier,
        environmentBlueprintIdentifier=environmentBlueprintIdentifier,
        enabledRegions=enabledRegions
    )

    # logger.debug(json.dumps(update_response, indent=2))

    return {
        "Status": "200",
        "Data": {
            'id': update_response.get("environmentBlueprintId")
        }
    }
