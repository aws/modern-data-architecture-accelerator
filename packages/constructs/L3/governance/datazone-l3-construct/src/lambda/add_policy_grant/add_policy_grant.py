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

def recursive_bool_conversion(data):
    """
    Recursively converts string values 'true'/'false' (case-insensitive)
    within a dictionary to actual boolean True/False.
    """
    if isinstance(data, dict):
        for key, value in data.items():
            data[key] = recursive_bool_conversion(value)
        return data
    elif isinstance(data, list):
        return [recursive_bool_conversion(item) for item in data]
    elif isinstance(data, str):
        lower_value = data.lower()
        if lower_value == 'true':
            return True
        elif lower_value == 'false':
            return False
        else:
            return data  # Return original string if not 'true' or 'false'
    else:
        return data  # Return other data types as is


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

    entityIdentifier = resource_config.get('entityIdentifier', None)
    if (entityIdentifier is None):
        raise Exception("Unable to parse entityIdentifier from event.")
    
    entityType = resource_config.get('entityType', None)
    if (entityType is None):
        raise Exception("Unable to parse entityType from event.")
    
    policyType = resource_config.get('policyType', None)
    if (policyType is None):
        raise Exception("Unable to parse policyType from event.")
    
    principal = resource_config.get('principal', None)
    if (principal is None):
        raise Exception("Unable to parse principal from event.")
    
    detail = recursive_bool_conversion(resource_config.get('detail', None))
    if (detail is None):
        raise Exception("Unable to parse detail from event.")
    

    if event['RequestType'] == 'Create':
        handle_create(domainIdentifier,entityIdentifier,entityType,policyType,principal,detail)
    elif event['RequestType'] == 'Update':
        handle_delete(domainIdentifier,entityIdentifier,entityType,policyType,principal,detail)
        handle_create(domainIdentifier,entityIdentifier,entityType,policyType,principal,detail)
    elif event['RequestType'] == 'Delete':
        handle_delete(domainIdentifier,entityIdentifier,entityType,policyType,principal)

    return {
        "Status": "200",
        "Data": {
            
        }
    }

def handle_delete(domainIdentifier,entityIdentifier,entityType,policyType,principal,detail):    
    datazone_client.remove_policy_grant(
        domainIdentifier=domainIdentifier,
        entityIdentifier=entityIdentifier,
        entityType=entityType,
        policyType=policyType,
        principal=principal,
        detail=detail
    )

def handle_create(domainIdentifier,entityIdentifier,entityType,policyType,principal,detail):    
    datazone_client.add_policy_grant(
        domainIdentifier=domainIdentifier,
        entityIdentifier=entityIdentifier,
        entityType=entityType,
        policyType=policyType,
        principal=principal,
        detail=detail
    )



    
