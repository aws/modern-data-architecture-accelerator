# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import logging
import os
from botocore.exceptions import ClientError

datazone_client = boto3.client('datazone')
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)


def lambda_handler(event, context):
    logger.info("Starting")
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

    # logger.info(json.dumps(update_response, indent=2))

    return {
        "Status": "200",
        "Data": {
            'id': update_response.get("environmentBlueprintId")
        }
    }
