# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import os
import logging
from typing import Any, Optional
from botocore import config
from botocore.exceptions import ClientError

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = {"user_agent_extra": solution_identifier}
config = config.Config(**user_agent_extra_param)

datazone_client = boto3.client('datazone', config=config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger(__name__)

# Best-effort bookkeeping: resolved IDs are published to SSM for later reuse via
# an `environmentId` config override, not consumed synchronously by this deploy.
# Keep this short so a slow/not-yet-provisioned environment never blocks a deploy.
POLL_INTERVAL_SECONDS = 5
MAX_POLL_ATTEMPTS = 12  # 1 minute max wait

# Written to SSM when the environment can't be resolved in time, so the parameter
# always holds a valid, non-empty, non-ID value rather than being left unset -
# AWS::SSM::Parameter rejects an empty Value.
UNRESOLVED_PLACEHOLDER = "UNRESOLVED"


def get_required_param(resource_config: dict, param_name: str) -> Any:
    """Get required parameter or raise descriptive error."""
    value = resource_config.get(param_name)
    if value is None:
        raise ValueError(f"Unable to parse {param_name} from event.")
    return value


def lambda_handler(event: dict, context: Any) -> Optional[dict]:
    """Resolves and publishes the given environment configuration's live ID."""
    logger.info("Received event: %s", json.dumps(event, indent=2))

    if event['RequestType'] not in ('Create', 'Update'):
        return None

    resource_config = event['ResourceProperties']
    domain_id = get_required_param(resource_config, 'domainId')
    project_id = get_required_param(resource_config, 'projectId')
    env_config_name = get_required_param(resource_config, 'envConfigName')

    environment_id = resolve_environment_id(domain_id, project_id, env_config_name)
    return {
        "Status": "200",
        "Data": {"environmentId": environment_id},
    }


def list_all_environments(domain_id: str, project_id: str, env_config_name: str) -> list:
    """Lists all environments matching env_config_name, following pagination."""
    items = []
    next_token = None
    while True:
        kwargs = {'domainIdentifier': domain_id, 'projectIdentifier': project_id, 'name': env_config_name}
        if next_token:
            kwargs['nextToken'] = next_token
        response = datazone_client.list_environments(**kwargs)
        items.extend(response.get('items', []))
        next_token = response.get('nextToken')
        if not next_token:
            return items


def resolve_environment_id(
    domain_id: str, project_id: str, env_config_name: str, max_attempts: int = MAX_POLL_ATTEMPTS
) -> str:
    """
    Looks up the ID of the environment created from the given configuration name.

    Never raises: this is best-effort bookkeeping for a later deploy's `environmentId`
    override, not a gate on the current deploy. Returns UNRESOLVED_PLACEHOLDER if the
    environment isn't found (e.g. still provisioning), is ambiguous, or the lookup
    errors out in a way that retrying within this call's short budget won't fix.

    AccessDeniedException is retried rather than treated as terminal: ListEnvironments
    requires the caller to already be a DataZone project member, and a caller granted
    that membership in the same deploy (e.g. MdaaSageMakerProject's crRoleProjectMembership)
    may not have it propagated yet on the first attempt.
    """
    for attempt in range(max_attempts):
        try:
            items = list_all_environments(domain_id, project_id, env_config_name)
        except ClientError as e:
            if e.response.get('Error', {}).get('Code') != 'AccessDeniedException':
                logger.exception("Error listing environments for %s", env_config_name)
                return UNRESOLVED_PLACEHOLDER
            logger.info(
                "Access denied listing environments for %s (attempt %d/%d); project membership may not have "
                "propagated yet. Waiting...",
                env_config_name, attempt + 1, max_attempts,
            )
            if attempt + 1 < max_attempts:
                time.sleep(POLL_INTERVAL_SECONDS)
            continue
        except Exception:
            logger.exception("Error listing environments for %s", env_config_name)
            return UNRESOLVED_PLACEHOLDER

        if len(items) == 1:
            env_id = items[0]['id']
            logger.info("Resolved environment %s to %s", env_config_name, env_id)
            return env_id

        if len(items) > 1:
            logger.warning(
                "Found %d environments matching %s; expected exactly 1. Not resolving.",
                len(items), env_config_name,
            )
            return UNRESOLVED_PLACEHOLDER

        logger.info("Environment %s not found yet (attempt %d/%d). Waiting...", env_config_name, attempt + 1, max_attempts)
        if attempt + 1 < max_attempts:
            time.sleep(POLL_INTERVAL_SECONDS)

    logger.warning("Environment %s was not found within %d seconds", env_config_name, max_attempts * POLL_INTERVAL_SECONDS)
    return UNRESOLVED_PLACEHOLDER
