# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import boto3
import time

ec2 = boto3.client('ec2')
logger = logging.getLogger("Keypair")
log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
logger.setLevel(getattr(logging, log_level, logging.INFO))
logger.setFormatter(logging.Formatter(
    "%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s"
    "| Function: %(funcName)s | "
    "%(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
))


def lambda_handler(event, context):
    logger.info("Starting the function")
    logger.info("Sleeping 30 seconds to allow for IAM permission propagation")
    # nosemgrep
    time.sleep(30)
    if event['RequestType'] == 'Create':
        return handle_create(event, context)


def handle_create(event, context):

    resource_config = event['ResourceProperties']
    key_pair_name = resource_config.get('keypairName', None)

    if(key_pair_name is None):
        raise Exception(f"Missing parameters in request: {resource_config}")

    logger.info("Creating Keypair")

    try:
        response = ec2.create_key_pair(KeyName=key_pair_name)
    except Exception as e:
        # nosemgrep
        logger.error(f"Unable to create keypair {key_pair_name}: {e}")
        raise e

    responseData = {
        "Status": "200",
        "PhysicalResourceId": response["KeyName"],
        "Data": {
            "key_pair_id": response["KeyPairId"],
            "key_material": response["KeyMaterial"]
        }
    }
    return responseData
