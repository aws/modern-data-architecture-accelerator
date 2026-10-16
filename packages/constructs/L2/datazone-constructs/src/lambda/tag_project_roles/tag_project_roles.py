# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Custom Resource to tag IAM roles with AmazonDataZoneProject=<projectId>.

SageMaker Unified Studio grants a consumer project's subscribed tables to every IAM
principal whose AmazonDataZoneProject tag holds the project's ID, so the tag authorizes
a role into the project's subscriptions. A tag holds one value, so the handler refuses
to overwrite another project's ID, and removes the tag only while it still holds this
project's ID.
"""

import logging
import os
import time
from collections.abc import Callable, Iterable
from typing import Any

import boto3
from botocore import config
from botocore.exceptions import BotoCoreError, ClientError

PROJECT_TAG_KEY = "AmazonDataZoneProject"

# SageMaker Unified Studio and DataZone create their project and environment user roles with
# this prefix and tag them with the project ID themselves, so removing the tag breaks the project.
SERVICE_MANAGED_ROLE_PREFIX = "datazone_usr_"

# IAM errors retried here because botocore's standard mode does not retry them. IAM is eventually
# consistent, so a handler policy attached or changed just before this invocation can still be
# denied for a few seconds, and concurrent changes to a role fail with ConcurrentModification.
TRANSIENT_ERROR_CODES = ("AccessDenied", "ConcurrentModification")
TRANSIENT_RETRY_DELAYS = (1, 2, 4, 8)

# Ends every physical ID Create returns, so a Delete for a Create this handler never answered stands out.
PHYSICAL_ID_SUFFIX = "-role-tags"

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = {"user_agent_extra": solution_identifier}
# Few attempts, so sustained throttling fails a request well within the handler timeout and
# leaves Create time to remove the tags it applied.
boto_config = config.Config(**user_agent_extra_param, retries={"mode": "standard", "max_attempts": 5})

iam_client = boto3.client("iam", config=boto_config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
)
logger = logging.getLogger(__name__)
# basicConfig does nothing in the Lambda runtime, which configures the root logger first.
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO").upper())


def get_required_param(resource_config: dict, param_name: str) -> Any:
    """Get required parameter or raise descriptive error."""
    value = resource_config.get(param_name)
    if value is None:
        raise ValueError(f"Unable to parse {param_name} from event.")
    return value


def call_iam(operation: Callable[..., dict], **kwargs: Any) -> dict:
    """Call an IAM operation, retrying the transient errors botocore does not retry."""
    for delay in TRANSIENT_RETRY_DELAYS:
        try:
            return operation(**kwargs)
        except ClientError as error:
            code = error.response.get("Error", {}).get("Code")
            if code not in TRANSIENT_ERROR_CODES:
                raise
            logger.warning("%s failed with %s; retrying in %ss", operation.__name__, code, delay)
            time.sleep(delay)
    return operation(**kwargs)


def role_names_from_arns(role_arns: Iterable[str]) -> list[str]:
    """Return de-duplicated role names in configured order.

    The IAM tag APIs take a role name, and an ARN may carry a path before it.
    """
    return list(dict.fromkeys(role_arn.rsplit("/", 1)[-1] for role_arn in role_arns))


def reject_service_managed_roles(role_names: list[str]) -> None:
    """Raise if any role is one SageMaker Unified Studio or DataZone created for a project.

    The service tags those roles itself. Listing one and later unlisting it would make this handler
    remove the service's tag and break the project.
    """
    managed = [name for name in role_names if name.startswith(SERVICE_MANAGED_ROLE_PREFIX)]
    if managed:
        raise ValueError(
            f"Cannot authorize roles {', '.join(managed)}: SageMaker Unified Studio and DataZone manage the "
            f"{PROJECT_TAG_KEY} tag on {SERVICE_MANAGED_ROLE_PREFIX}* roles, and removing it later would break "
            "their project."
        )


def get_project_tag(role_name: str) -> str | None:
    """Return the role's AmazonDataZoneProject value, or None if it has none."""
    # A role holds at most 50 tags, so one page covers them; a partial list could hide the tag.
    response = call_iam(iam_client.list_role_tags, RoleName=role_name, MaxItems=100)
    if response.get("IsTruncated"):
        raise RuntimeError(f"ListRoleTags returned a partial tag list for role {role_name}")
    for tag in response.get("Tags", []):
        if tag["Key"] == PROJECT_TAG_KEY:
            return tag["Value"]
    return None


def find_roles_to_tag(
    role_names: list[str], project_id: str, previous_project_id: str | None = None, skip_missing: bool = False
) -> list[str]:
    """Return the roles that still need this project's tag.

    Raises if any role carries another project's ID. previous_project_id is the project ID
    from the prior properties of an Update; a role carrying it is retagged rather than
    rejected, because this resource put it there. skip_missing skips a role that does not
    exist instead of raising, so an Update, including a rollback, is not blocked by a role
    deleted outside the stack. A deleted role holds no tag, so skipping it grants nothing.
    """
    to_tag = []
    conflicts = []
    for role_name in role_names:
        try:
            current = get_project_tag(role_name)
        except iam_client.exceptions.NoSuchEntityException:
            if not skip_missing:
                raise
            logger.warning(
                "Role %s does not exist, so it is not tagged. If it is recreated, it is tagged only when "
                "this resource's properties next change.",
                role_name,
            )
            continue
        if current == project_id:
            continue
        if current is not None and current != previous_project_id:
            conflicts.append(f"role '{role_name}' is tagged for project '{current}'")
            continue
        to_tag.append(role_name)
    if conflicts:
        raise ValueError(
            f"Cannot authorize roles into project '{project_id}': {'; '.join(conflicts)}. "
            f"A role can carry one {PROJECT_TAG_KEY} value, so it can be authorized into one project only."
        )
    return to_tag


def tag_role(role_name: str, project_id: str) -> None:
    """Tag the role with this project's ID."""
    call_iam(iam_client.tag_role, RoleName=role_name, Tags=[{"Key": PROJECT_TAG_KEY, "Value": project_id}])
    logger.info("Tagged role %s with %s=%s", role_name, PROJECT_TAG_KEY, project_id)


def untag_owned_roles(role_names: list[str], project_id: str, previous_project_id: str | None = None) -> None:
    """Remove the tag from each role that still holds this project's ID.

    previous_project_id is the project ID from the prior properties of an Update. The
    handler policy only allows removing the current project's ID, so a role still holding
    the previous one is reported rather than untagged. A failure on one role does not stop
    the others; the request fails afterwards, naming every role that may still hold the tag.
    """
    failed = []
    for role_name in role_names:
        try:
            current = get_project_tag(role_name)
            if current == project_id:
                call_iam(iam_client.untag_role, RoleName=role_name, TagKeys=[PROJECT_TAG_KEY])
                logger.info("Removed %s from role %s", PROJECT_TAG_KEY, role_name)
            elif current is not None and current == previous_project_id:
                logger.warning(
                    "Role %s still holds %s=%s from the project this one replaced. This handler can only remove "
                    "%s, so remove the tag manually before authorizing the role into another project.",
                    role_name,
                    PROJECT_TAG_KEY,
                    current,
                    project_id,
                )
            else:
                logger.info("Role %s holds %s=%s, not %s; leaving it", role_name, PROJECT_TAG_KEY, current, project_id)
        except iam_client.exceptions.NoSuchEntityException:
            logger.info("Role %s no longer exists; nothing to untag", role_name)
        except (BotoCoreError, ClientError):
            logger.exception("Could not check or remove %s on role %s", PROJECT_TAG_KEY, role_name)
            failed.append(role_name)
    if failed:
        raise RuntimeError(
            f"Could not remove {PROJECT_TAG_KEY}={project_id} from roles {', '.join(failed)}. They keep the "
            "project's subscriptions until the tag is removed."
        )


def remove_tags_after_failure(role_names: list[str]) -> None:
    """Remove the tags a failed Create applied, without replacing the failure being reported."""
    for role_name in role_names:
        try:
            call_iam(iam_client.untag_role, RoleName=role_name, TagKeys=[PROJECT_TAG_KEY])
        except Exception:  # noqa: BLE001 - the tagging failure must stay the reported cause
            logger.exception("Could not remove %s from role %s; remove it manually", PROJECT_TAG_KEY, role_name)


def create(role_names: list[str], project_id: str) -> None:
    """Tag the roles, removing this request's tags again if any of them fails.

    The Delete that CloudFormation sends after a failed Create never reaches this handler:
    the CDK provider framework answers it itself, because the physical ID is its
    CREATE_FAILED marker. Tags applied before the failure would otherwise keep their roles
    authorized.
    """
    tagged = []
    try:
        for role_name in find_roles_to_tag(role_names, project_id):
            tag_role(role_name, project_id)
            tagged.append(role_name)
    except Exception:
        logger.error("Tagging failed; removing the tags this request applied to %s", tagged)
        remove_tags_after_failure(tagged)
        raise


def update(role_names: list[str], project_id: str, old_resource_config: dict) -> None:
    """Tag added roles, retag roles carrying the previous project ID, and untag removed roles."""
    previous_project_id = old_resource_config.get("projectId")
    to_tag = find_roles_to_tag(role_names, project_id, previous_project_id, skip_missing=True)
    current = set(role_names)
    old_role_names = role_names_from_arns(old_resource_config.get("roleArns", []))
    untag_owned_roles([name for name in old_role_names if name not in current], project_id, previous_project_id)
    for role_name in to_tag:
        tag_role(role_name, project_id)


def lambda_handler(event: dict, context: object) -> dict:
    """Handle CloudFormation custom resource events for project role tagging."""
    request_type = event["RequestType"]
    logger.info("RequestType: %s", request_type)
    resource_config = event["ResourceProperties"]
    project_id = get_required_param(resource_config, "projectId")
    role_names = role_names_from_arns(get_required_param(resource_config, "roleArns"))

    if request_type == "Create":
        reject_service_managed_roles(role_names)
        create(role_names, project_id)
        physical_resource_id = f"{project_id}{PHYSICAL_ID_SUFFIX}"
    elif request_type == "Update":
        reject_service_managed_roles(role_names)
        update(role_names, project_id, event.get("OldResourceProperties", {}))
        # Kept stable so CloudFormation never sends a Delete for the previous properties;
        # update() reconciles them itself.
        physical_resource_id = event["PhysicalResourceId"]
    elif request_type == "Delete":
        physical_resource_id = event["PhysicalResourceId"]
        if not physical_resource_id.endswith(PHYSICAL_ID_SUFFIX):
            logger.warning(
                "Delete for physical ID %s, which this handler never returned. CloudFormation sends one after "
                "cancelling a Create, and if that Create is still running it may tag roles %s after this Delete; "
                "check them for %s=%s.",
                physical_resource_id,
                ", ".join(role_names),
                PROJECT_TAG_KEY,
                project_id,
            )
        untag_owned_roles(role_names, project_id)
    else:
        raise ValueError(f"Unsupported RequestType: {request_type}")

    return {"PhysicalResourceId": physical_resource_id}
