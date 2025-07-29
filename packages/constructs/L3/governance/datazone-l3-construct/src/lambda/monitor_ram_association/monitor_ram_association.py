# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import os
from botocore.exceptions import ClientError
import logging
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
config = config.Config(**user_agent_extra_param)

ram_client = boto3.client('ram', config=config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("RAM Association Monitor")


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

    resourceShareArn = resource_config.get('resourceShareArn', None)
    if (resourceShareArn is None):
        raise Exception("Unable to parse resourceShareArn from event.")

    associatedEntity = resource_config.get('associatedEntity', None)
    if (associatedEntity is None):
        raise Exception("Unable to parse associatedEntity from event.")

    response = ram_client.get_resource_share_associations(
        associationType='PRINCIPAL',
        resourceShareArns=[
            resourceShareArn
        ],
        principal=associatedEntity,
    )
    

    while len(response['resourceShareAssociations']) != 1 or response['resourceShareAssociations'][0]['status'] != 'ASSOCIATED':
        logger.info(json.dumps(response, indent=4, sort_keys=True, default=str))
        logger.info("RAM Share not associated. Sleeping 5 seconds")
        time.sleep(5)
        response = ram_client.get_resource_share_associations(
            associationType='PRINCIPAL',
            resourceShareArns=[
                resourceShareArn
            ],
            principal=associatedEntity,
        )
    logger.info("RAM Share Associated")
    return {
        "Status": "200",
        "Data": {
            
        }
    }
