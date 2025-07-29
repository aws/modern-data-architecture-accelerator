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
    if event['RequestType'] == 'Create' or event['RequestType'] == 'Update':
        return handle_create_update(event, context)


def handle_create_update(event, context):

    resource_config = event['ResourceProperties']

    domainIdentifier = resource_config.get('domainIdentifier', None)
    arn = resource_config.get('arn', None)
    if (domainIdentifier is None):
        raise Exception("Unable to parse domainIdentifier from event.")

    search_users_response = datazone_client.search_user_profiles(
        domainIdentifier=domainIdentifier,
        userType='DATAZONE_IAM_USER',
        searchText=arn
    )
    
    if len(search_users_response['items']) != 1:
        logger.error(json.dumps(search_users_response, indent=4, sort_keys=True, default=str))
        raise Exception("Unexected number of user profiles found")

    return {
        "Status": "200",
        "Data": {
            'id': search_users_response['items'][0].get('id')
        }
    }
