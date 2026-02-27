# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import json
import os
import boto3
import logging
import re
from botocore.exceptions import ClientError
from botocore import config
solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
boto_config = config.Config(**user_agent_extra_param)
client = boto3.client('iam', config=boto_config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("IAM Role Helper")


role_id_map = {}
role_name_map = {}
role_arn_map = {}
# Using a separate flag rather than checking `if not role_id_map` to avoid
# repeated API calls in the edge case where an account has zero IAM roles.
_roles_loaded = False


def _ensure_roles_loaded():
    """Lazy load roles on first access."""
    global _roles_loaded
    if not _roles_loaded:
        get_roles()
        _roles_loaded = True


def get_roles():
    roles = []
    response = client.list_roles()
    roles = roles + response['Roles']
    while response.get('IsTruncated', False) is True:
        response = client.list_roles(Marker=response['Marker'])
        roles = roles + response['Roles']

    for role in roles:
        role_id_map[role['RoleId']] = role
        role_name_map[role['RoleName']] = role
        role_arn_map[role['Arn']] = role


def lambda_handler(event, context):
    logger.info("**Starting")
    logger.debug(json.dumps(event, indent=2))
    resource_config = event['ResourceProperties']
    role_ref = resource_config.get('roleRef')
    if role_ref is None:
        raise ValueError(f"Missing roleRef in request: {resource_config}")
    
    if event['RequestType'] == 'Create' or event['RequestType'] == 'Update':  
        return resolve_role_ref(role_ref)


def _find_sso_role(permission_set_name):
    """Find an SSO role by permission set name. Raises if ambiguous."""
    regex = "^AWSReservedSSO_" + permission_set_name + "_[0-9a-zA-Z]{16}$"
    logger.info(regex)
    role = None
    for role_name, check_role in role_name_map.items():
        logger.info(role_name)
        if re.match(regex, role_name):
            if role is not None:
                raise ValueError(f"Ambiguous role resolution: {role_name}/{permission_set_name}")
            role = check_role
    return role


def resolve_role_ref(role_ref):
    _ensure_roles_loaded()
    if role_ref.get("id") is not None:
        resource_id = role_ref.get("id")
        role = role_id_map.get(resource_id)
    elif role_ref.get("arn") is not None:
        resource_id = role_ref.get("arn")
        role = role_arn_map.get(resource_id)
    elif role_ref.get("name") is not None:
        resource_id = role_ref.get("name")
        sso = role_ref.get("sso", False)
        role = _find_sso_role(resource_id) if sso else role_name_map.get(resource_id)
    else:
        raise ValueError("Called without id, arn or name specified")

    # If role not found in cache, try to fetch it directly from IAM
    if role is None:
        logger.info(f"Role not found in cache, attempting to fetch from IAM: {role_ref}")
        role = fetch_role_from_iam(role_ref)
        if role is not None:
            # Update cache with newly fetched role
            role_id_map[role['RoleId']] = role
            role_name_map[role['RoleName']] = role
            role_arn_map[role['Arn']] = role
            logger.info(f"Successfully fetched and cached role: {role['RoleName']}")

    if role is None:
        raise ValueError(f"Failed to resolve role: {role_ref}")
    else:
        return {
            "Status": "200",
            "PhysicalResourceId": role['RoleId'],
            "Data": {
                "arn": role['Arn'],
                "name": role['RoleName'],
                "id": role["RoleId"]
            }
        }


def fetch_role_from_iam(role_ref):
    """
    Attempt to fetch a role directly from IAM when it's not in the cache.
    This handles newly created roles that weren't present during Lambda cold start.
    """
    try:
        # If we have an ARN, extract the role name from it
        if role_ref.get("arn") is not None:
            arn = role_ref.get("arn")
            # ARN format: arn:aws:iam::123456789012:role/RoleName
            role_name = arn.split('/')[-1]
            logger.info(f"Extracted role name from ARN: {role_name}")
            response = client.get_role(RoleName=role_name)
            return response['Role']
        
        # If we have a name, use it directly
        elif role_ref.get("name") is not None:
            role_name = role_ref.get("name")
            logger.info(f"Fetching role by name: {role_name}")
            response = client.get_role(RoleName=role_name)
            return response['Role']
        
        # If we only have an ID, we need to list roles to find it
        # This is less efficient but necessary for ID-only lookups
        elif role_ref.get("id") is not None:
            logger.info(f"Refreshing role cache to find role by ID: {role_ref.get('id')}")
            get_roles()  # Refresh the entire cache
            return role_id_map.get(role_ref.get("id"))
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchEntity':
            logger.warning(f"Role does not exist in IAM: {role_ref}")
            return None
        else:
            logger.error(f"Error fetching role from IAM: {e}")
            raise
    
    return None
