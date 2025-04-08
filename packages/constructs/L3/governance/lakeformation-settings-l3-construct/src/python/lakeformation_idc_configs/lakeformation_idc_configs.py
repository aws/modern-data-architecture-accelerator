# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import json
import logging
import os

import boto3
from botocore.exceptions import ClientError
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
config = config.Config(**user_agent_extra_param)
lf_client = boto3.client('lakeformation',config=config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger()


def lambda_handler(event, context):
    logger.info("**Starting")
    logger.info(json.dumps(event, indent=2))
    if event['RequestType'] == 'Create':
        return handle_create(event, context)
    elif event['RequestType'] == 'Update':
        return handle_update(event, context)
    elif event['RequestType'] == 'Delete':
        return handle_delete(event, context)


def handle_create(event, context):
    resource_config = event['ResourceProperties']
    instance_arn = resource_config['instanceArn']
    share_recipients = resource_config.get('shareRecipients',[])
    logger.info(f"Creating LF IDC Config: InstanceArn:{instance_arn} ShareRecipients:{share_recipients}")
    response = lf_client.create_lake_formation_identity_center_configuration(
        InstanceArn = instance_arn,
        ShareRecipients = share_recipients
    )
    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": response['ApplicationArn']
    }

def handle_update(event, context):
    resource_config = event['ResourceProperties']
    share_recipients = resource_config.get('shareRecipients',[])
    logger.info(f"Updating LF IDC Config:  ShareRecipients:{share_recipients}")
    response = lf_client.update_lake_formation_identity_center_configuration(
        ShareRecipients = share_recipients
    )
    return {
        "Status": "SUCCESS"
    }

def handle_delete(event, context):
    resource_config = event['ResourceProperties']
    logger.info(f"Deleting LF IDC Config")
    response = lf_client.delete_lake_formation_identity_center_configuration(
    )
    return {
        "Status": "SUCCESS"
    }