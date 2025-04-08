# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from botocore.exceptions import ClientError
import logging
import boto3
import time
import json
import os
import os.path
import sys
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
config = config.Config(**user_agent_extra_param)




# Below 3 lines are added to add boto3 custom version 1.26.0 to Lambda Function
envLambdaTaskRoot = '/var/task'
print("sys.path:"+str(sys.path))
sys.path.insert(0, envLambdaTaskRoot+"/quicksight_acount")
print(boto3.__version__)

quicksight_client = boto3.client('quicksight', config=config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("Quicksight account")

ACCOUNT_ID = os.environ["ACCOUNT_ID"]


def lambda_handler(event, context):
    logger.debug(json.dumps(event, indent=2))
    resource_config = event['ResourceProperties']
    accountDetail = resource_config['accountDetail']
    if event['RequestType'] == 'Create':
        return handle_create(accountDetail, context)
    elif event['RequestType'] == 'Update':
        return handle_update(accountDetail, context)
    elif event['RequestType'] == 'Delete':
        return handle_delete(accountDetail, context)


def handle_create(accountDetail, context):
    logger.info("**Starting running the QuickSight Account Setup")
    logger.info("**Creating quicksight account")
    response_data = create_quicksight_account(accountDetail)
    return response_data


def handle_delete(accountDetail, context):
    logger.info('Received delete event, Account will not be delete')
    response_data = {
        "Status": "FAILED",
        "PhysicalResourceId": accountDetail.get('accountName')
    }
    return response_data


def handle_update(accountDetail, context):
    logger.info(
        'Received update event, Updates are not supported, please revert config')
    response_data = {
        "Status": "FAILED",
        "PhysicalResourceId": accountDetail.get('accountName')
    }
    return response_data


def create_quicksight_account(accountDetail):
    response = quicksight_client.create_account_subscription(
        Edition=accountDetail.get('edition'),
        AuthenticationMethod=accountDetail.get('authenticationMethod'),
        AwsAccountId=ACCOUNT_ID,
        AccountName=accountDetail.get('accountName',),
        NotificationEmail=accountDetail.get('notificationEmail', ""),
        FirstName=accountDetail.get('firstName', ""),
        LastName=accountDetail.get('lastName', ""),
        EmailAddress=accountDetail.get('emailAddress', ""),
        ContactNumber=accountDetail.get('contactNumber', "")
    )
    logger.debug(json.dumps(response, indent=2))
    # nosemgrep
    time.sleep(30)
    created = False
    while not created:
        response = quicksight_client.describe_account_subscription(
            AwsAccountId=ACCOUNT_ID
        )
        logger.info(json.dumps(response, indent=2))
        # nosemgrep
        time.sleep(30)
        if response['AccountInfo']['AccountSubscriptionStatus'] == 'ACCOUNT_CREATED':
            created = True
        else:
            reason = response['AccountInfo']['AccountSubscriptionStatus']
            logging.info(
                f"**QuickSight account creation failed with: {reason}", )
            raise Exception(
                f"QuickSight account creation failed with: {reason}.")
    logging.info(f"**QuickSight Account created successfully: {accountDetail}")
    response_data = {
        "Status": "SUCCESS",
        "PhysicalResourceId": accountDetail.get('accountName')
    }
    return response_data
