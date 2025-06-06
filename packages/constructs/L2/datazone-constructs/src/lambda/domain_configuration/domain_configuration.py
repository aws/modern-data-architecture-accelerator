# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import os
import logging
from botocore.exceptions import ClientError
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
config = config.Config(**user_agent_extra_param)

ssm_client = boto3.client(
    'ssm',
    config=config
)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("Datazone domain configuration")


def lambda_handler(event, context):
    logger.info("Starting the event")
    logger.debug(json.dumps(event, indent=2))
    logger.info("Sleeping 30 seconds to allow for IAM permission propagation")
    # nosemgrep
    time.sleep(30)
    if event['RequestType'] == 'Create' or event['RequestType'] == 'Update':
        return handle_create_update(event, context)


def handle_create_update(event, context):

    resource_config = event['ResourceProperties']
    domainConfigSSMParam = resource_config.get('domainConfigSSMParam', None)
    if (domainConfigSSMParam is None):
        raise Exception("Unable to parse domainConfigSSMParam from event.")

    get_response = ssm_client.get_parameter(
        Name=domainConfigSSMParam
    )

    logger.info(get_response)
    data = json.loads(get_response.get("Parameter").get("Value"))
    logger.debug("Response: %s", data)
    return {
        "Status": "200",
        "Data": data
    }
