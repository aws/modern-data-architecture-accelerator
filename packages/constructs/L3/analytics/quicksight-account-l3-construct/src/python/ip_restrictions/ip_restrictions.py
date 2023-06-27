# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import boto3
import json

quicksight_client = boto3.client('quicksight')
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(json.dumps(event, indent=2))

    if event['RequestType'] == 'Create' or event['RequestType'] == 'Update':
        return handle_create_update(event, context)
    elif event['RequestType'] == 'Delete':
        return handle_delete(event, context)


def handle_create_update(event, context):
    try:
        resource_config = event['ResourceProperties']
        account_id = resource_config['accountId']
        ip_restrictions_map = resource_config['ipRestrictionsMap']
        logger.info(
            f"Setting IP Address Restrictions on account {account_id}: {ip_restrictions_map} ")
        response = quicksight_client.update_ip_restriction(
            AwsAccountId=account_id,
            IpRestrictionRuleMap=ip_restrictions_map,
            Enabled=True
        )
        return {
            "Status": "SUCCESS",
            "PhysicalResourceId": response['AwsAccountId']
        }
    except Exception as e:
        logger.error(f"Failed to update ip restrictions: {e}")
        raise e


def handle_delete(event, context):
    try:
        account_id = event['PhysicalResourceId']
        logger.info(
            f"Disabling IP Address Restrictions on account {account_id}")
        response = quicksight_client.update_ip_restriction(
            AwsAccountId=account_id,
            Enabled=False
        )
        return {
            "Status": "SUCCESS",
            "PhysicalResourceId": response['AwsAccountId']
        }
    except Exception as e:
        logger.error(f"Failed to disable ip restrictions: {e}")
        raise e
