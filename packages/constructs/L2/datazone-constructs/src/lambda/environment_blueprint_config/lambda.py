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
logger = logging.getLogger(__name__)
logger.info("Environment Blueprint Configuration")

def lambda_handler(event, context):
    logger.info("Starting")
    logger.info(json.dumps(event, indent=2))
    logger.info("Sleeping 30 seconds to allow for IAM permission propagation")
    # nosemgrep
    time.sleep(30)
    resource_config = event['ResourceProperties']
    domainId = resource_config.get('domain_id', None)
    if(domainId is None):
        raise Exception("Unable to parse domain_id from event.")
    
    if event['RequestType'] == 'Create':
        return handle_create(event, domainId, resource_config, context)
    elif event['RequestType'] == 'Update':
        return handle_update(event, domainId, resource_config, context)
    elif event['RequestType'] == 'Delete':
        return handle_delete(event, domainId, resource_config, context)

def handle_create(event, domainId, resource_config, context):
    blueprintIdentifier = resource_config.get('blueprint_identifier', None)
    if blueprintIdentifier is None:
        raise Exception("Unable to parse blueprint_identifier from event.")
    
    enabledRegions = resource_config.get('enabled_regions', None)
    if enabledRegions is None:
        raise Exception("Unable to parse enabled_regions from event.")

    provisioning_role_arn = resource_config.get('provisioning_role_arn', None)
    if provisioning_role_arn is None:
        raise Exception("Unable to parse provisioning_role_arn from event.")

    logger.info(f"Creating Environment Blueprint Configuration for blueprint {blueprintIdentifier} in domain {domainId}")
    
    response = datazone_client.put_environment_blueprint_configuration(
        domainIdentifier=domainId,
        environmentBlueprintIdentifier=blueprintIdentifier,
        enabledRegions=enabledRegions,
        provisioningRoleArn=provisioning_role_arn
    )

    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": f"{domainId}:{blueprintIdentifier}",
        "Data": {
            "BlueprintId": blueprintIdentifier,
            "DomainId": domainId
        }
    }

def handle_update(event, domainId, resource_config, context):
    blueprintIdentifier = resource_config.get('blueprint_identifier', None)
    if blueprintIdentifier is None:
        raise Exception("Unable to parse blueprint_identifier from event.")
    
    enabledRegions = resource_config.get('enabled_regions', None)
    if enabledRegions is None:
        raise Exception("Unable to parse enabled_regions from event.")
    
    provisioning_role_arn = resource_config.get('provisioning_role_arn', None)
    if provisioning_role_arn is None:
        raise Exception("Unable to parse provisioning_role_arn from event.")

    logger.info(f"Updating Environment Blueprint Configuration for blueprint {blueprintIdentifier} in domain {domainId}")

    response = datazone_client.put_environment_blueprint_configuration(
        domainIdentifier=domainId,
        environmentBlueprintIdentifier=blueprintIdentifier,
        enabledRegions=enabledRegions,
        provisioningRoleArn=provisioning_role_arn
    )

    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": f"{domainId}:{blueprintIdentifier}",
        "Data": {
            "BlueprintId": blueprintIdentifier,
        }
    }

def handle_delete(event, domainId, resource_config, context):
    # Blueprint configuration is deleted automatically when blueprint is deleted
    # No explicit delete action needed
    logger.info("Delete Environment Blueprint Configuration - no action needed")
    
    return {
        "Status": "SUCCESS",
    }
