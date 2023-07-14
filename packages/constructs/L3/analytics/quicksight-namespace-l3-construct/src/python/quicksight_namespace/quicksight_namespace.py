# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import logging
import os
from botocore.exceptions import ClientError

quicksight_client = boto3.client('quicksight')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

ACCOUNT_ID = os.environ["ACCOUNT_ID"]
IDENTITY_STORE = os.environ["IDENTITY_STORE"]


def lambda_handler(event, context):
    logger.info(json.dumps(event, indent=2))
    if event['RequestType'] == 'Create':
        return handle_create(event, context)
    elif event['RequestType'] == 'Update':
        return handle_update(event, context)
    elif event['RequestType'] == 'Delete':
        return handle_delete(event, context)


def handle_create(event, context):
    logger.info("**Starting running the QuickSight workshop setup code")
    resource_config = event['ResourceProperties']

    logger.info("**Creating quicksight namespace")
    response_data = create_quicksight_namespace(resource_config)
    return response_data


def handle_delete(event, context):
    logger.info('Received delete event')
    resource_id = event['PhysicalResourceId']

    try:
        quicksight_client.describe_namespace(
            AwsAccountId=ACCOUNT_ID,
            Namespace=resource_id
        )
    except ClientError as exception:
        return
    return delete_namespace(resource_id)


def handle_update(event, context):
    raise NotImplementedError("Updates not supported for Namespaces")


def create_quicksight_namespace(config):
    name = config['name']

    response = quicksight_client.create_namespace(
        AwsAccountId=ACCOUNT_ID,
        Namespace=name,
        IdentityStore=IDENTITY_STORE
        # ,
        # Tags=[
        #     {
        #         'Key': 'string',
        #         'Value': 'string'
        #     }
        # ]
    )

    created = False
    while not created:
        response = quicksight_client.describe_namespace(
            AwsAccountId=ACCOUNT_ID,
            Namespace=name
        )
        logger.info(json.dumps(response, indent=2))
        time.sleep(5)
        if response['Namespace']['CreationStatus'] == 'CREATED':
            created = True
        elif response['Namespace']['CreationStatus'] == 'RETRYABLE_FAILURE':
            reason = response['Namespace']['NamespaceError']
            logging.info(f"**QuickSight namespace creation failed: {reason}", )
            delete_namespace(name)
            raise Exception(f"QuickSight namespace creation failed: {reason}.")

    logging.info(f"**QuickSight namespace created successfully: {name}")
    response_data = {
        "Status": "SUCCESS",
        "PhysicalResourceId": name
    }
    return response_data


def delete_namespace(name):
    delete_response = quicksight_client.delete_namespace(
        AwsAccountId=ACCOUNT_ID,
        Namespace=name
    )
    deleted = False
    while not deleted:
        try:
            verify_response = quicksight_client.describe_namespace(
                AwsAccountId=ACCOUNT_ID,
                Namespace=name
            )
        except quicksight_client.exceptions.ResourceNotFoundException:
            logger.info('Deleted')
            deleted = True
            return
        logger.info(verify_response)
        time.sleep(5)
    response_data = {
        "Status": "SUCCESS",
        "PhysicalResourceId": name
    }
    return response_data
