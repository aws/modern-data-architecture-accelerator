# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import csv
import json
import ast
from random import random
import time
import boto3
import logging
import os
from botocore.exceptions import ClientError

quicksight_client = boto3.client('quicksight')
logger = logging.getLogger()
logger.setLevel(logging.INFO)
ACCOUNT_ID = os.environ["ACCOUNT_ID"]


def lambda_handler(event, context):
    logger.info(json.dumps(event, indent=2))
    resource_config = event.get('ResourceProperties').get('folderDetails')
    if resource_config is None:
        logger.error(f"folderDetails cannot be empty/None/Null")
        return 201
    folderName = resource_config.get("folderName")
    folderPermissions = resource_config.get("folderPermissions")
    folderId = resource_config.get(
        "folderNameWithParentName")  # lob1_dev-working
    parentFolderArn = resource_config.get("parentFolderArn")
    if event['RequestType'] == 'Create':
        return handle_create(folderId, folderName, folderPermissions, parentFolderArn)
    elif event['RequestType'] == 'Update':
        return handle_update(folderId, folderPermissions)
    elif event['RequestType'] == 'Delete':
        return handle_delete(folderId)


def handle_create(folderId, folderName, folderPermissions, parentFolderArn):
    logger.info("**QS Folder Creation Process")
    folderArn = create_quicksight_folder(
        folderId, folderName, folderPermissions, parentFolderArn)
    response_data = {
        "Status": "SUCCESS",
        "Data": {
            "FolderArn": folderArn
        }
    }
    return response_data


def create_quicksight_folder(folderId, folderName, folderPermissions, parentFolderArn):
    if parentFolderArn is None:
        response = quicksight_client.create_folder(
            AwsAccountId=ACCOUNT_ID,
            FolderId=folderId,
            Name=folderName,
            FolderType='SHARED',
            Permissions=folderPermissions
        )
    else:
        response = quicksight_client.create_folder(
            AwsAccountId=ACCOUNT_ID,
            FolderId=folderId,
            Name=folderName,
            ParentFolderArn=parentFolderArn,
            FolderType='SHARED',
            Permissions=folderPermissions
        )
    if response['Status'] == 200:
        return response['Arn']
    else:
        logger.error(f"Folder Creation Failed for {folderId}")
        return response['Status']



def handle_update(folderId, folderPermissions):
    logger.info("** QS Folder Update Process")
    folderArn = update_quicksight_folder_permissions(
        folderId, folderPermissions)
    response_data = {
        "Status": "SUCCESS",
        "Data": {
            "FolderArn": folderArn
        }
    }
    return response_data


def update_quicksight_folder_permissions(folderId, folderPermissions):
    logger.info("Folder Permissions update instead of create")
    response = quicksight_client.update_folder_permissions(
        AwsAccountId=ACCOUNT_ID,
        FolderId=folderId,
        GrantPermissions=folderPermissions
    )
    if response['Status'] == 200:
        return response['Arn']
    else:
        logger.error(f"Folder Permissions Update Failed for {folderId}")
        return response['Status']



def handle_delete(folderId):
    logger.info("** QS Folder Delete Process")
    folderArn = delete_quicksight_folder(folderId)
    response_data = {
        "Status": "SUCCESS",
        "Data": {
            "FolderArn": folderArn
        }
    }
    return response_data


def delete_quicksight_folder(folderId):
    logger.info("Folder Permissions update instead of create")
    response = quicksight_client.delete_folder(
        AwsAccountId=ACCOUNT_ID,
        FolderId=folderId
    )
    if response['Status'] == 200:
        return response['Arn']
    else:
        logger.error(f"Folder Deletion Failed for {folderId}")
        return response['Status']

