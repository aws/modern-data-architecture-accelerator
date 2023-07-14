# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import time
import boto3
import logging
from botocore.exceptions import ClientError
import hashlib

sagemaker_client = boto3.client('sagemaker')

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info("Starting")
    logger.info("Sleeping 30 seconds to allow for IAM permission propagation")
    time.sleep(30)
    if event['RequestType'] == 'Create':
        return handle_create(event, context)
    if event['RequestType'] == 'Update':
        handle_delete(event, context)
        logger.info("Sleeping 30 seconds to allow for lifecycle cleanup")
        time.sleep(30)
        return handle_create(event, context)
    if event['RequestType'] == 'Delete':
        return handle_delete(event, context)


def handle_create(event, context):
    resource_config = event['ResourceProperties']
    lifecycleConfigName = resource_config.get('lifecycleConfigName', None)
    if(lifecycleConfigName is None):
        raise Exception("Unable to parse lifecycleConfigName from event.")

    lifecycleConfigContent = resource_config.get(
        'lifecycleConfigContent', None)
    if(lifecycleConfigContent is None):
        raise Exception(
            "Unable to parse lifecycleConfigContent from event.")

    lifecycleConfigContentHash = hashlib.sha1(
        lifecycleConfigContent.encode("UTF-8")).hexdigest()[:10]

    lifecycleConfigNameWithHash = f"{lifecycleConfigName}-{lifecycleConfigContentHash}"

    lifecycleConfigAppType = resource_config.get(
        'lifecycleConfigAppType', None)
    if(lifecycleConfigAppType is None):
        raise Exception(
            "Unable to parse lifecycleConfigAppType from event.")

    logger.info(f"Creating Lifecycle Config {lifecycleConfigName}")

    try:
        response = sagemaker_client.create_studio_lifecycle_config(
            StudioLifecycleConfigName=lifecycleConfigNameWithHash,
            StudioLifecycleConfigContent=lifecycleConfigContent,
            StudioLifecycleConfigAppType=lifecycleConfigAppType
        )
        return {
            "Status": "SUCCESS",
            "PhysicalResourceId": lifecycleConfigNameWithHash,
            "Data": response
        }
    except Exception as e:
        logger.error(f"Failed to create lifecycle config: {e}")
        raise e


def handle_delete(event, context):

    lifecycleConfigName = event.get('PhysicalResourceId', None)
    if(lifecycleConfigName is None):
        raise Exception("Unable to parse lifecycleConfigName from event.")
    logger.info(f"Deleting Lifecycle Config {lifecycleConfigName}")
    try:
        response = sagemaker_client.delete_studio_lifecycle_config(
            StudioLifecycleConfigName=lifecycleConfigName
        )
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUse':
            logger.warn(
                f"Failed to delete lifecycle config because it is in use. Leaving in place.")
        elif e.response['Error']['Code'] == 'ResourceNotFound':
            logger.warn(
                f"Failed to delete lifecycle config because it does not exist.")
        else:
            logger.error(f"Failed to delete lifecycle config: {e}")
            raise e

    return {
        "Status": "SUCCESS",
    }
