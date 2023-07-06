# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import json
import logging

import boto3
from botocore.exceptions import ClientError

lf_client = boto3.client('lakeformation')
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info("**Starting")
    logger.info(json.dumps(event, indent=2))
    if event['RequestType'] == 'Create':
        return handle_create_update(event, context)
    elif event['RequestType'] == 'Update':
        return handle_create_update(event, context)
    elif event['RequestType'] == 'Delete':
        return {
            "Status": "SUCCESS"
        }


def handle_create_update(event, context):
    resource_config = event['ResourceProperties']
    datalake_settings = resource_config['dataLakeSettings']
    account = resource_config['account']
    logger.info(f"Creating/Updating LF Settings: {datalake_settings}")
    response = lf_client.put_data_lake_settings(
        DataLakeSettings=datalake_settings
    )
    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": account
    }
