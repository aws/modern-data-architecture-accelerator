# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import logging
import os
from botocore.exceptions import ClientError

sagemaker_client = boto3.client('sagemaker')
logger = logging.getLogger()
logger.setLevel(logging.INFO)


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
    domainId = resource_config.get('DomainId', None)
    if(domainId is None):
        raise Exception("Unable to parse domainId from event.")
    defaultUserSettings = resource_config.get('DefaultUserSettings', None)
    if(defaultUserSettings is None):
        raise Exception("Unable to parse defaultUserSettings from event.")
    domainSettingsForUpdate = resource_config.get(
        'DomainSettingsForUpdate', None)
    if(domainSettingsForUpdate is None):
        raise Exception(
            "Unable to parse domainSettingsForUpdate from event.")
    logger.info(f"Updating Domain {domainId}")
    try:
        update_response = sagemaker_client.update_domain(
            DomainId=domainId,
            DefaultUserSettings=defaultUserSettings,
            DomainSettingsForUpdate=domainSettingsForUpdate
        )

        num_attempts = 0
        while num_attempts <= 5:
            describe_response = sagemaker_client.describe_domain(
                DomainId=domainId
            )
            update_status = describe_response.get('Status')
            logger.info(f"Update Status: {update_status}")
            if update_status == "Update_Failed":
                raise Exception(describe_response.get('FailureReason'))
            elif update_status == "InService":
                return {
                    "Status": "SUCCESS",
                    "PhysicalResourceId": domainId
                }
            # nosemgrep
            time.sleep(10)
            num_attempts = num_attempts + 1

        raise Exception("Timed out waiting for domain to update")

    except Exception as e:
        logger.error(f"Failed to update domain: {e}")
        raise e
