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

datazone_client = boto3.client('datazone', config=config)

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

    resource_config = event['ResourceProperties']
    
    domainIdentifier = resource_config.get('domainIdentifier', None)
    if (domainIdentifier is None):
        raise Exception("Unable to parse domainIdentifier from event.")

    blueprintName = resource_config.get('blueprintName', None)
    if (blueprintName is None):
        raise Exception("Unable to parse blueprintName from event.")

    envsItems = datazone_client.list_environment_blueprints(
        domainIdentifier=domainIdentifier,
        managed=True,
        name=blueprintName
    )['items']

    if(len(envsItems) != 1):
        raise Exception(f"Unable to find environment blueprint {blueprintName} for domain: {domainIdentifier}")

    return {
        "Status": "200",
        "Data": {
            'id': envsItems[0]['id']
        }
    }
