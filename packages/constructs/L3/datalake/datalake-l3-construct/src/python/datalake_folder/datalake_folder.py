# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import logging
import os
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(json.dumps(event, indent=2))
    if event['RequestType'] == 'Create':
        return handle_create(event, context)


def handle_create(event, context):
    logger.info("**Starting")
    resource_config = event['ResourceProperties']

    bucket_name = resource_config['bucket_name']
    folder_name = resource_config['folder_name']

    if(folder_name.startswith("/")):
        folder_name = folder_name[1:]
    if(not folder_name.endswith("/")):
        folder_name = folder_name + "/"

    logger.info(f"Creating s3://{bucket_name}/{folder_name}")
    retryCount = 0
    while True:
        try:
            s3_client.put_object(Bucket=bucket_name, Key=folder_name)
            return {
                "Status": "SUCCESS",
                "PhysicalResourceId": f"{bucket_name}:{folder_name}"
            }
        except Exception as e:
            logger.warn(f"Error creating folder: {e}")
            if(retryCount >= 6):
                raise e
        retryCount = retryCount + 1
        time.sleep(10)
