# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import json
import logging

import boto3
from botocore.exceptions import ClientError

lf_client = boto3.client('lakeformation')
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.info("boto3 version: " + boto3.__version__)


def lambda_handler(event, context):
    logger.info("**Starting")
    logger.info(json.dumps(event, indent=2))
    if event['RequestType'] == 'Create':
        return handle_create(event, context)
    elif event['RequestType'] == 'Update':
        return handle_create(event, context)
    elif event['RequestType'] == 'Delete':
        return handle_delete(event, context)


def handle_create(event, context):
    resource_config = event['ResourceProperties']
    datalake_settings = resource_config['dataLakeSettings']
    account = resource_config['account']
    response = lf_client.put_data_lake_settings(
        DataLakeSettings=datalake_settings
    )
    logger.info(json.dumps(response, indent=2))
    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": account
    }


def handle_delete(event, context):
    resource_id = event['PhysicalResourceId']

    response = lf_client.put_data_lake_settings({
        'DataLakeSettings': {
            'DataLakeAdmins': []
        }
    })

    return {
        "Status": "SUCCESS"
    }
