# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from multiprocessing.connection import wait
import time
import boto3
import logging
import os
from botocore.exceptions import ClientError
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
config = config.Config(**user_agent_extra_param)
quicksight_client = boto3.client('quicksight', config=config)


logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger('Quicksight Namespace user')

ACCOUNT_ID = os.environ["ACCOUNT_ID"]
NAMESPACE = os.environ["NAMESPACE"]
QUICKSIGHT_ROLE = os.environ["QUICKSIGHT_ROLE"]
QUICKSIGHT_GROUPS = os.environ["QUICKSIGHT_GROUPS"].split(',')


def lambda_handler(event, context):
    logger.info('Validate CloudTrail Event')
    response_user_id = event.get('detail', None).get('serviceEventDetails', None).get(
        'eventResponseDetails', None).get('userId', None)
    if(not response_user_id):
        logger.error(
            "Unable to read userId from event: detail/serviceEventDetails/eventResponseDetails/userId")
        logger.error(json.dumps(event, indent=2))
        return {
            "status": 500
        }

    logger.debug(json.dumps(event, indent=2))
    if(len(response_user_id.split("/")) != 3):
        logger.error(
            f"Unable to parse user/role details from userId: {response_user_id}")
        return {
            "status": 500
        }

    request_user_name = event.get('detail', None).get('serviceEventDetails', None).get(
        'eventRequestDetails', None).get('userName', None)
    if(not request_user_name):
        logger.error(
            "Unable to read userId from event: detail/serviceEventDetails/eventResponseDetails/userId")
        logger.error(json.dumps(event, indent=2))
        return {
            "status": 500
        }
    role_name = response_user_id.split("/")[1]
    user_id = response_user_id.split("/")[2]
    user_name = request_user_name.replace(":", "/")

    logger.info('Validation of CloudTrail Event Completed....')

    user_email = get_default_namespace_user_email(
        user_name=user_name, role_name=role_name)

    delete_default_namespace_user(user_name=user_name, role_name=role_name)
    # nosemgrep
    time.sleep(5)
    register_lob_namespace_user(user_id, role_name, user_email)
    register_user_in_groups(user_name)


def get_default_namespace_user_email(user_name, role_name):
    logger.info(
        f"Getting user {user_name} e-mail in QuickSight default namespace for role {role_name}")
    try:
        response = quicksight_client.describe_user(
            UserName=user_name,
            AwsAccountId=ACCOUNT_ID,
            Namespace="default"
        )

        user = response.get('User')
        email = user.get('Email')

        return email

    except quicksight_client.exceptions.ResourceNotFoundException:
        logger.warning(
            f"User {user_name} doesn't exist in QuickSight default namespace. Skipping.")
        return {
            "status": 200
        }
    except Exception as e:
        logger.error(
            f"Exception finding {user_name} email in default namespace : {str(e)}")
        return {
            "exception": str(e)
        }


def delete_default_namespace_user(user_name, role_name):
    logger.info(
        f"Deleting user {user_name} to QuickSight default namespace  using role {role_name}")
    try:
        response = quicksight_client.delete_user(
            AwsAccountId=ACCOUNT_ID,
            Namespace="default",
            UserName=user_name
        )
        status = response['Status']
        if(status != 200):
            logger.error("Received non-200 status code")
            logger.error(json.dumps(response, indent=2))
            return {
                "status": 500
            }
    except quicksight_client.exceptions.ResourceNotFoundException:
        logger.warning(
            f"User {user_name} doesn't exist in QuickSight default namespace. Skipping.")
        return {
            "status": 200
        }
    except Exception as e:
        logger.error(
            f"Failed to delete {user_name} in default namespace : {str(e)}")
        return {
            "exception": str(e)
        }


def register_lob_namespace_user(user_id, role_name, user_email):

    logger.info(
        f"Registering user {user_id} to QuickSight namespace {NAMESPACE} using role {role_name}")

    try:
        response = quicksight_client.register_user(
            AwsAccountId=ACCOUNT_ID,
            Namespace=NAMESPACE,
            IdentityType="IAM",
            Email=user_email,
            UserRole=QUICKSIGHT_ROLE,
            IamArn=f"arn:aws:iam::{ACCOUNT_ID}:role/{role_name}",
            SessionName=user_id
        )
        status = response['Status']
        if(status != 201):
            logger.error("Received non-201 status code")
            logger.error(json.dumps(response, indent=2))
            return {
                "status": 500
            }
    except quicksight_client.exceptions.ResourceExistsException:
        logger.warn(
            f"User {role_name}/{user_id} already exists in QuickSight namespace {NAMESPACE}. Skipping.")
        return {
            "status": 200
        }
    except Exception as e:
        logger.error(
            f"Failed to add user {role_name}/{user_id} to namespace {NAMESPACE}: {str(e)}")
        return {
            "exception": str(e)
        }


def register_user_in_groups(username):
    group_name_allusers = NAMESPACE+"-ALLUSERS"
    # Get list of groups in Namespace:
    groups = list_groups().get('GroupList', None)
    new = []
    for group in groups:
        new.append(group['GroupName'])
    groups = new

    # Check and Create Groups if they do not exist:
    for group_name in QUICKSIGHT_GROUPS:
        if group_name not in groups:
            create_group(group_name)
    if group_name_allusers not in groups:
        create_group(group_name_allusers)

    # Add user into ALLUSER group
    response = create_group_membership(username, group_name_allusers)

    # Add user into LOB specific groups
    for group_name in QUICKSIGHT_GROUPS:
        response = create_group_membership(username, group_name)


def list_groups():
    logger.info(f"Getting List of All Groups in Namespace {NAMESPACE}")
    try:
        res = quicksight_client.list_groups(
            AwsAccountId=ACCOUNT_ID,
            Namespace=NAMESPACE
        )
        return res
    except Exception as e:
        logger.error(
            f"Failed while getting list of Groups from Namespace {NAMESPACE}: {str(e)}")
        return {
            "exception": str(e)
        }


def create_group(group_name):
    logger.info(
        f"Creating Group {group_name} in Namespace {NAMESPACE} as group does not exist")
    try:
        res = quicksight_client.create_group(
            GroupName=group_name,
            AwsAccountId=ACCOUNT_ID,
            Namespace=NAMESPACE
        )
        return res
    except quicksight_client.exceptions.ResourceExistsException:
        logger.warn(
            f"Group {group_name} already exists in QuickSight namespace {NAMESPACE}. Skipping.")
        return {
            "status": 200
        }
    except Exception as e:
        logger.error(
            f"Failed while Creating Group {group_name} in Namespace {NAMESPACE}: {str(e)}")
        return {
            "exception": str(e)
        }


def create_group_membership(username, group_name):
    logger.info(
        f"Registering User {username} in {group_name} of Namespace {NAMESPACE}")
    try:
        res = quicksight_client.create_group_membership(
            MemberName=username,
            GroupName=group_name,
            AwsAccountId=ACCOUNT_ID,
            Namespace=NAMESPACE
        )
        return res
    except Exception as e:
        logger.error(
            f"Failed while Registering User {username} in Group {group_name} of Namespace {NAMESPACE}: {str(e)}")
        return {
            "exception": str(e)
        }
