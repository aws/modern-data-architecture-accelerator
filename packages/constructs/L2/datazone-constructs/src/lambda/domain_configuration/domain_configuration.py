# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import logging
import os
from botocore.exceptions import ClientError

ssm_client = boto3.client('ssm')
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
    domainConfigSSMParam = resource_config.get('domainConfigSSMParam', None)
    if (domainConfigSSMParam is None):
        raise Exception("Unable to parse domainConfigSSMParam from event.")

    get_response = ssm_client.get_parameter(
        Name=domainConfigSSMParam
    )

    logger.info(get_response)
    data = json.loads(get_response.get("Parameter").get("Value"))
    logger.info(data)
    return {
        "Status": "200",
        "Data": data
    }
