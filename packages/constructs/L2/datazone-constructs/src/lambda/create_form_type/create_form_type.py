# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Custom Resource to create a DataZone (SMUS) metadata form type.

CreateFormType requires the caller to be an owner/member of the owning project.
The CloudFormation execution role is only granted project-creation authorization
on the domain, so it cannot create form types directly (403). This handler runs
under the domain custom-resource role, which is made a PROJECT_OWNER of the
project, and creates the form type via the DataZone API on its behalf.
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


def build_smithy_model(domain_id, model_structure):
    """Assemble the full Smithy model, prepending the namespace.

    The DataZone form type namespace must equal the domain ID, but Smithy does not
    allow hyphens in namespaces while domain IDs may contain them (e.g. dzd-abc123).
    Replace hyphens with underscores so the namespace parses and matches the domain.
    """
    namespace = domain_id.replace("-", "_")
    return f"namespace {namespace}\n\n{model_structure}"


def get_owning_project(domain_id, form_name):
    """Return the owning project id of an existing form type, or None if it doesn't exist.

    Form type names are domain-scoped, so callers check ownership before mutating a name.
    """
    try:
        response = datazone_client.get_form_type(domainIdentifier=domain_id, formTypeIdentifier=form_name)
        return response.get("owningProjectId")
    except datazone_client.exceptions.ResourceNotFoundException:
        return None


def create_form_type(resource_config, previous_owner=None):
    """Create (or add a new revision of) the form type, only if no other project owns the name.

    previous_owner is the owning project from the prior properties of an Update, if any.
    """
    domain_id = get_required_param(resource_config, "domainId")
    owning_project_id = get_required_param(resource_config, "owningProjectId")
    form_name = get_required_param(resource_config, "formName")
    model_structure = get_required_param(resource_config, "modelStructure")

    existing_owner = get_owning_project(domain_id, form_name)
    if existing_owner is not None and existing_owner != owning_project_id:
        if existing_owner == previous_owner:
            # The owning project changed (e.g. the project was replaced) while the form still
            # exists under the old one; DataZone can't transfer a form type between projects.
            raise ValueError(
                f"Form type '{form_name}' is owned by project '{existing_owner}' and cannot move to project "
                f"'{owning_project_id}': DataZone form types cannot change owner. Remove the form from "
                "metadataForms and deploy, then add it back."
            )
        raise ValueError(
            f"Form type '{form_name}' already exists in domain '{domain_id}' owned by project "
            f"'{existing_owner}', not '{owning_project_id}'. Metadata form type names are "
            "domain-scoped: choose a different name, or declare the form under the project that "
            "already owns it."
        )

    kwargs = {
        "domainIdentifier": domain_id,
        "name": form_name,
        "owningProjectIdentifier": owning_project_id,
        "model": {"smithy": build_smithy_model(domain_id, model_structure)},
        "status": resource_config.get("status", "ENABLED"),
    }
    description = resource_config.get("description")
    if description:
        kwargs["description"] = description

    response = datazone_client.create_form_type(**kwargs)
    logger.info(f"Created form type {form_name}: revision {response.get('revision')}")
    return response


def delete_form_type(resource_config):
    """Delete the form type. Never fails the stack — deletion is best-effort."""
    domain_id = resource_config.get("domainId")
    owning_project_id = resource_config.get("owningProjectId")
    form_name = resource_config.get("formName")
    if not domain_id or not form_name:
        logger.warning("Missing domainId/formName on delete; nothing to do.")
        return
    try:
        # Only delete a form this project still owns. The check is inside the try so a
        # GetFormType error (throttling, missing permission) can't block teardown either.
        existing_owner = get_owning_project(domain_id, form_name)
        if existing_owner is None:
            logger.info(f"Form type {form_name} already deleted")
            return
        if owning_project_id and existing_owner != owning_project_id:
            logger.warning(
                f"Form type {form_name} is now owned by project {existing_owner}, not "
                f"{owning_project_id}; skipping delete."
            )
            return
        datazone_client.delete_form_type(
            domainIdentifier=domain_id,
            formTypeIdentifier=form_name,
        )
        logger.info(f"Deleted form type {form_name}")
    except datazone_client.exceptions.ResourceNotFoundException:
        logger.info(f"Form type {form_name} already deleted")
    except Exception as e:  # noqa: BLE001 - deletion must not block stack teardown
        logger.warning(f"Failed to delete form type {form_name}: {e}")


def lambda_handler(event, context):
    """Handle CloudFormation custom resource events for a DataZone form type."""
    logger.info(f"RequestType: {event.get('RequestType')}")
    request_type = event["RequestType"]
    resource_config = event["ResourceProperties"]

    domain_id = resource_config.get("domainId")
    owning_project_id = resource_config.get("owningProjectId")
    form_name = resource_config.get("formName")
    # Identity is domain + owning project + name: names are domain-scoped, so without the project
    # two projects declaring the same name would share a physical id.
    expected_physical_id = f"{domain_id}:{owning_project_id}:{form_name}"

    if request_type == "Create":
        response = create_form_type(resource_config)
        physical_resource_id = expected_physical_id

    elif request_type == "Update":
        previous_owner = event.get("OldResourceProperties", {}).get("owningProjectId")
        response = create_form_type(resource_config, previous_owner)
        # A changed domain or name yields a new physical id, so CloudFormation deletes the old form
        # after this update succeeds. A changed owning project can't be handled that way (the name
        # is still taken), which create_form_type reports. An unchanged id is a new revision.
        physical_resource_id = expected_physical_id

    elif request_type == "Delete":
        # A failed Create is rolled back with a generated physical id; deleting by name then
        # would remove a pre-existing form type with the same name.
        if event["PhysicalResourceId"] == expected_physical_id:
            delete_form_type(resource_config)
        else:
            logger.info(f"Physical id {event['PhysicalResourceId']} not issued by this resource; skipping delete")
        response = {}
        # Echo the incoming id; changing it on Delete leaves the stack stuck in ROLLBACK_FAILED.
        physical_resource_id = event["PhysicalResourceId"]

    else:
        raise ValueError(f"Unsupported RequestType: {request_type}")

    return {
        "PhysicalResourceId": physical_resource_id,
        "Data": {
            "formName": form_name or "",
            "revision": str(response.get("revision", "")),
        },
    }
