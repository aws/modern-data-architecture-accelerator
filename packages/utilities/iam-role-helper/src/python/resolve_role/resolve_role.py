# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import json
import resource
import time
import boto3
import logging
import os
from botocore.exceptions import ClientError

client = boto3.client('iam')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

role_id_map = {}
role_name_map = {}
role_arn_map = {}


def get_roles():
    roles = []
    response = client.list_roles()
    roles = roles + response['Roles']
    while(response.get('IsTruncated', False) is True):
        response = client.list_roles(Marker=response['Marker'])
        roles = roles + response['Roles']

    for role in roles:
        role_id_map[role['RoleId']] = role
        role_name_map[role['RoleName']] = role
        role_arn_map[role['Arn']] = role


get_roles()


def lambda_handler(event, context):
    logger.info("**Starting")
    logger.info(json.dumps(event, indent=2))
    resource_config = event['ResourceProperties']
    role_ref = resource_config.get('roleRef', None)
    if(role_ref is None):
        raise Exception(f"Missing roleRef in request: {resource_config}")
    return resolve_role_ref(role_ref)


def resolve_role_ref(role_ref):
    if(role_ref.get("id", None) is not None):
        resourceId = role_ref.get("id")
        role = role_id_map.get(resourceId)
    elif(role_ref.get("arn") is not None):
        resourceId = role_ref.get("arn", None)
        role = role_arn_map.get(resourceId)
    elif(role_ref.get("name", None) is not None):
        resourceId = role_ref.get("name")
        role = role_name_map.get(resourceId)
    else:
        raise Exception("Callied without id, arn or name specified")

    if(role is None):
        raise Exception(f"Failed to resolve role: {role_ref}")
    else:
        return {
            "Status": "200",
            "Data": {
                "arn": role['Arn'],
                "name": role['RoleName'],
                "id": role["RoleId"]
            }
        }
