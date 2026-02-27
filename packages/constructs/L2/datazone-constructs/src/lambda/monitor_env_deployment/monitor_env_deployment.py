# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import os
import logging
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = {"user_agent_extra": solution_identifier}
config = config.Config(**user_agent_extra_param)

datazone_client = boto3.client('datazone', config=config)
iam_client = boto3.client("iam")

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger(__name__)

# Configuration constants
INITIAL_SLEEP_SECONDS = 30
POLL_INTERVAL_SECONDS = 5
MAX_POLL_ATTEMPTS = 120  # 10 minutes max wait


def get_required_param(resource_config, param_name):
    """Get required parameter or raise descriptive error."""
    value = resource_config.get(param_name)
    if value is None:
        raise ValueError(f"Unable to parse {param_name} from event.")
    return value


def lambda_handler(event, context):
    """Main Lambda handler for monitoring environment deployment."""
    logger.info(f"Received event: {json.dumps(event, indent=2)}")
    logger.info(f"Sleeping {INITIAL_SLEEP_SECONDS} seconds to allow for IAM permission propagation")
    # nosemgrep
    time.sleep(INITIAL_SLEEP_SECONDS)

    if event['RequestType'] in ('Create', 'Update'):
        return handle_create_update(event)
    return None


def wait_for_environment_active(domain_id, project_id, env_name, max_attempts=MAX_POLL_ATTEMPTS):
    """
    Poll for environment to reach ACTIVE status.
    
    Returns:
        dict: Environment details from get_environment API.
    Raises:
        Exception: If environment enters FAILED state or max attempts exceeded.
    """
    for attempt in range(max_attempts):
        list_response = datazone_client.list_environments(
            domainIdentifier=domain_id,
            projectIdentifier=project_id,
            name=env_name
        )

        items = list_response.get('items', [])
        
        if len(items) == 1:
            status = items[0].get('status', '')
            if status == 'ACTIVE':
                logger.info(f"Environment {env_name} is ACTIVE")
                env_id = items[0]['id']
                return datazone_client.get_environment(
                    domainIdentifier=domain_id,
                    identifier=env_id
                )
            if 'FAILED' in status:
                raise RuntimeError(f"Environment is in {status} state")

        logger.info(f"Environment status not ACTIVE (attempt {attempt + 1}/{max_attempts}). Waiting...")
        time.sleep(POLL_INTERVAL_SECONDS)

    raise TimeoutError(f"Environment {env_name} did not become ACTIVE within {max_attempts * POLL_INTERVAL_SECONDS} seconds")


def wait_for_connection(domain_id, project_id, env_id, connection_name, max_attempts=MAX_POLL_ATTEMPTS):
    """
    Poll for connection to be created.
    
    Returns:
        str: Connection ID.
    Raises:
        Exception: If max attempts exceeded.
    """
    for attempt in range(max_attempts):
        response = datazone_client.list_connections(
            domainIdentifier=domain_id,
            projectIdentifier=project_id,
            environmentIdentifier=env_id,
            name=connection_name
        )

        items = response.get('items', [])
        if len(items) == 1:
            logger.info(f"Connection {connection_name} created")
            return items[0]['connectionId']

        logger.info(f"Connection not found (attempt {attempt + 1}/{max_attempts}). Waiting...")
        time.sleep(POLL_INTERVAL_SECONDS)

    raise TimeoutError(f"Connection {connection_name} not found within {max_attempts * POLL_INTERVAL_SECONDS} seconds")


def handle_create_update(event):
    """Handle Create/Update request for environment deployment monitoring."""
    resource_config = event['ResourceProperties']

    domain_id = get_required_param(resource_config, 'domainId')
    project_id = get_required_param(resource_config, 'projectId')
    env_name = get_required_param(resource_config, 'envName')
    connection_name = get_required_param(resource_config, 'connectionName')
    kms_policy_arn = get_required_param(resource_config, 'kmsPolicyArn')

    env = wait_for_environment_active(domain_id, project_id, env_name)
    provisioned_resources = {
        resource['name']: resource['value'] 
        for resource in env.get('provisionedResources', [])
    }
    env_id = env['id']

    connection_id = wait_for_connection(domain_id, project_id, env_id, connection_name)

    user_arn = provisioned_resources.get('userRoleArn')
    if user_arn:
        role_name = user_arn.split('/')[-1]
        iam_client.attach_role_policy(
            RoleName=role_name,
            PolicyArn=kms_policy_arn
        )
        logger.info(f"Attached KMS policy to role {role_name}")

    return {
        "Status": "200",
        "Data": {
            'environmentId': env_id,
            'connectionId': connection_id,
            **provisioned_resources
        }
    }
