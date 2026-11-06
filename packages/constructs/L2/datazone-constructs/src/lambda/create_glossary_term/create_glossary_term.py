# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Custom Resource to create a DataZone (SMUS) business glossary term.

CreateGlossaryTerm requires the caller to be an owner/member of the project that owns
the term's glossary. The CloudFormation execution role is only granted project-creation
authorization on the domain, so it cannot create glossary terms directly (403). This
handler runs under the domain custom-resource role, which is made a PROJECT_OWNER of the
project, and creates the term via the DataZone API on its behalf.
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


def create_term(resource_config):
    """Create the glossary term."""
    domain_id = get_required_param(resource_config, "domainId")
    glossary_id = get_required_param(resource_config, "glossaryId")
    term_name = get_required_param(resource_config, "termName")

    kwargs = {
        "domainIdentifier": domain_id,
        "glossaryIdentifier": glossary_id,
        "name": term_name,
        "status": resource_config.get("status", "ENABLED"),
    }
    short_description = resource_config.get("shortDescription")
    if short_description:
        kwargs["shortDescription"] = short_description
    long_description = resource_config.get("longDescription")
    if long_description:
        kwargs["longDescription"] = long_description

    response = datazone_client.create_glossary_term(**kwargs)
    logger.info(f"Created glossary term {term_name}: {response.get('id')}")
    return response


def update_term(term_id, resource_config):
    """Update the glossary term in place (name/descriptions/status only; the glossary cannot change)."""
    domain_id = get_required_param(resource_config, "domainId")
    term_name = get_required_param(resource_config, "termName")

    kwargs = {
        "domainIdentifier": domain_id,
        "identifier": term_id,
        "name": term_name,
        "status": resource_config.get("status", "ENABLED"),
    }
    short_description = resource_config.get("shortDescription")
    if short_description:
        kwargs["shortDescription"] = short_description
    long_description = resource_config.get("longDescription")
    if long_description:
        kwargs["longDescription"] = long_description

    response = datazone_client.update_glossary_term(**kwargs)
    logger.info(f"Updated glossary term {term_id}")
    return response


def delete_term(domain_id, term_id):
    """Delete the glossary term. Never fails the stack; deletion is best-effort."""
    if not domain_id or not term_id:
        logger.warning("Missing domainId/termId on delete; nothing to do.")
        return
    try:
        datazone_client.delete_glossary_term(domainIdentifier=domain_id, identifier=term_id)
        logger.info(f"Deleted glossary term {term_id}")
    except datazone_client.exceptions.ResourceNotFoundException:
        logger.info(f"Glossary term {term_id} already deleted")
    except Exception as e:  # noqa: BLE001 - deletion must not block stack teardown
        logger.warning(f"Failed to delete glossary term {term_id}: {e}")


def lambda_handler(event, context):
    """Handle CloudFormation custom resource events for a DataZone glossary term."""
    logger.info(f"RequestType: {event.get('RequestType')}")
    request_type = event["RequestType"]
    resource_config = event["ResourceProperties"]

    domain_id = resource_config.get("domainId")
    term_name = resource_config.get("termName")

    if request_type == "Create":
        response = create_term(resource_config)
        physical_resource_id = response["id"]

    elif request_type == "Update":
        old_props = event.get("OldResourceProperties", {})
        # A term's glossaryId changes when its declared glossary is replaced (e.g. the
        # glossary's construct key was renamed, giving it a new physical ID). A domain change
        # alone is guarded at the glossary level before it can ever reach here, so it is not
        # treated as a replace trigger; it flows through to an in-place update below.
        glossary_changed = old_props.get("glossaryId") != resource_config.get("glossaryId")

        if glossary_changed:
            # Compare against the live term instead of OldResourceProperties: CloudFormation
            # redelivers the rollback of a failed replace with the two property sets reversed,
            # so a decision based on OldResourceProperties alone would attempt a same-named
            # create again instead of finding the term already under the target glossary.
            try:
                existing = datazone_client.get_glossary_term(
                    domainIdentifier=resource_config.get("domainId"), identifier=event["PhysicalResourceId"]
                )
                already_in_place = existing.get("glossaryId") == resource_config.get("glossaryId")
            except datazone_client.exceptions.ResourceNotFoundException:
                already_in_place = False

            if already_in_place:
                response = update_term(event["PhysicalResourceId"], resource_config)
                physical_resource_id = event["PhysicalResourceId"]
            else:
                # The term isn't already under the target glossary: create a replacement there
                # (CloudFormation deletes the old physical resource once this succeeds).
                response = create_term(resource_config)
                physical_resource_id = response["id"]
        else:
            response = update_term(event["PhysicalResourceId"], resource_config)
            physical_resource_id = event["PhysicalResourceId"]

    elif request_type == "Delete":
        delete_term(domain_id, event["PhysicalResourceId"])
        response = {}
        physical_resource_id = event["PhysicalResourceId"]

    else:
        raise ValueError(f"Unsupported RequestType: {request_type}")

    return {
        "PhysicalResourceId": physical_resource_id,
        "Data": {
            "termName": term_name or "",
            "termId": physical_resource_id,
        },
    }
