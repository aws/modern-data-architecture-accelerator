# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Custom Resource to create a DataZone (SMUS) business glossary.

CreateGlossary requires the caller to be an owner/member of the owning project.
The CloudFormation execution role is only granted project-creation authorization
on the domain, so it cannot create glossaries directly (403). This handler runs
under the domain custom-resource role, which is made a PROJECT_OWNER of the
project, and creates the glossary via the DataZone API on its behalf.
"""

import os
import logging

import boto3
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = {"user_agent_extra": solution_identifier}
boto_config = config.Config(**user_agent_extra_param)

datazone_client = boto3.client("datazone", config=boto_config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
)
logger = logging.getLogger(__name__)


def get_required_param(resource_config, param_name):
    """Get required parameter or raise descriptive error."""
    value = resource_config.get(param_name)
    if value is None:
        raise ValueError(f"Unable to parse {param_name} from event.")
    return value


def create_glossary(resource_config):
    """Create the glossary."""
    domain_id = get_required_param(resource_config, "domainId")
    owning_project_id = get_required_param(resource_config, "owningProjectId")
    glossary_name = get_required_param(resource_config, "glossaryName")

    kwargs = {
        "domainIdentifier": domain_id,
        "name": glossary_name,
        "owningProjectIdentifier": owning_project_id,
        "status": resource_config.get("status", "ENABLED"),
    }
    description = resource_config.get("description")
    if description:
        kwargs["description"] = description

    try:
        response = datazone_client.create_glossary(**kwargs)
    except datazone_client.exceptions.ConflictException:
        raise ValueError(
            f"Glossary '{glossary_name}' already exists in domain '{domain_id}'. This can happen when a "
            "previous teardown's best-effort delete left it in place (for example, because a term was "
            "still attached). Delete the existing glossary in DataZone directly, or, if you are moving "
            "this glossary between projects, remove it from glossaries and deploy, then add it back."
        )
    logger.info(f"Created glossary {glossary_name}: {response.get('id')}")
    return response


def update_glossary(glossary_id, resource_config):
    """Update the glossary in place (name/description/status only; the owning project cannot change)."""
    domain_id = get_required_param(resource_config, "domainId")
    glossary_name = get_required_param(resource_config, "glossaryName")

    kwargs = {
        "domainIdentifier": domain_id,
        "identifier": glossary_id,
        "name": glossary_name,
        "status": resource_config.get("status", "ENABLED"),
        # Always sent (even empty) so a description removed from config is cleared in
        # DataZone too, instead of leaving the previous value stale.
        "description": resource_config.get("description", ""),
    }

    response = datazone_client.update_glossary(**kwargs)
    logger.info(f"Updated glossary {glossary_id}")
    return response


def delete_glossary(domain_id, glossary_id):
    """Delete the glossary. Never fails the stack; deletion is best-effort.

    DeleteGlossary requires the glossary to be DISABLED and have zero attached terms. Terms are
    deleted by their own custom resources first (CloudFormation deletes dependents before
    dependencies), so by the time this runs only the disable-then-delete sequence is needed.
    """
    if not domain_id or not glossary_id:
        logger.warning("Missing domainId/glossaryId on delete; nothing to do.")
        return
    try:
        datazone_client.update_glossary(domainIdentifier=domain_id, identifier=glossary_id, status="DISABLED")
        datazone_client.delete_glossary(domainIdentifier=domain_id, identifier=glossary_id)
        logger.info(f"Deleted glossary {glossary_id}")
    except datazone_client.exceptions.ResourceNotFoundException:
        logger.info(f"Glossary {glossary_id} already deleted")
    except Exception as e:  # noqa: BLE001 - deletion must not block stack teardown
        logger.warning(f"Failed to delete glossary {glossary_id}: {e}")


def lambda_handler(event, context):
    """Handle CloudFormation custom resource events for a DataZone glossary."""
    logger.info(f"RequestType: {event.get('RequestType')}")
    request_type = event["RequestType"]
    resource_config = event["ResourceProperties"]

    domain_id = resource_config.get("domainId")
    glossary_name = resource_config.get("glossaryName")

    if request_type == "Create":
        response = create_glossary(resource_config)
        physical_resource_id = response["id"]

    elif request_type == "Update":
        old_props = event.get("OldResourceProperties", {})
        domain_changed = old_props.get("domainId") != resource_config.get("domainId")
        owner_changed = old_props.get("owningProjectId") != resource_config.get("owningProjectId")

        if domain_changed or owner_changed:
            # Compare against the live glossary instead of OldResourceProperties: CloudFormation
            # redelivers the rollback of a failed Update with the two property sets reversed, so
            # a decision based on OldResourceProperties alone would raise again on rollback and
            # leave the stack in UPDATE_ROLLBACK_FAILED. The live glossary is looked up in the
            # domain the (possibly reversed) ResourceProperties claim it is in.
            target_domain_id = resource_config.get("domainId")
            try:
                existing = datazone_client.get_glossary(
                    domainIdentifier=target_domain_id, identifier=event["PhysicalResourceId"]
                )
            except datazone_client.exceptions.ResourceNotFoundException:
                # The glossary isn't in the domain ResourceProperties claims: DataZone can't
                # move a glossary between domains. Fail clearly instead of attempting a
                # same-named CreateGlossary there.
                raise ValueError(
                    f"Glossary '{glossary_name}' cannot move from domain '{old_props.get('domainId')}' to "
                    f"domain '{target_domain_id}': DataZone glossaries cannot change domain. Remove the "
                    "glossary from glossaries and deploy, then add it back."
                )

            existing_owner = existing["owningProjectId"]
            if existing_owner != resource_config.get("owningProjectId"):
                # The glossary name is still taken by the existing glossary in this domain, and
                # DataZone has no API to transfer a glossary's owning project; creating a
                # same-named glossary here would fail with ConflictException. Fail clearly.
                raise ValueError(
                    f"Glossary '{glossary_name}' is owned by project '{existing_owner}' and cannot move to "
                    f"project '{resource_config.get('owningProjectId')}': DataZone glossaries cannot change "
                    "owner. Remove the glossary from glossaries and deploy, then add it back."
                )

        response = update_glossary(event["PhysicalResourceId"], resource_config)
        physical_resource_id = event["PhysicalResourceId"]

    elif request_type == "Delete":
        delete_glossary(domain_id, event["PhysicalResourceId"])
        response = {}
        physical_resource_id = event["PhysicalResourceId"]

    else:
        raise ValueError(f"Unsupported RequestType: {request_type}")

    return {
        "PhysicalResourceId": physical_resource_id,
        "Data": {
            "glossaryName": glossary_name or "",
            "glossaryId": physical_resource_id,
        },
    }
