# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Custom Resource to set a DataZone (SMUS) business glossary term's `relatesTo`
("Is A Type of") relationships.

Term relationships are resolved and wired after every glossary/term in a project has been
created (a related term may belong to a different glossary than the one being related, which
may not exist yet when its own glossary is constructed). This resource is therefore separate
from the term's own create_glossary_term custom resource: it only ever calls
UpdateGlossaryTerm with `identifier` and `termRelations`, which this codebase's own
create_glossary_term.update_term() already established leaves every other field (name,
descriptions, status) untouched when omitted, so it cannot clobber the term's own state.

DataZone's `termRelations.isA`/`termRelations.classifies` lists require 1-10 entries when
present (never 0): an empty list is rejected client-side by botocore's own parameter
validation before any request reaches the service. So `isA` is only ever sent with the
caller-provided, already-validated 1-10 entries; clearing a relationship on delete can only
omit the `isA` key (there is no way to send an explicit empty list).
"""

import os
import logging
from typing import Any

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


def get_required_param(resource_config: dict[str, Any], param_name: str) -> Any:
    """Get required parameter or raise descriptive error."""
    value = resource_config.get(param_name)
    if not value:
        raise ValueError(f"Unable to parse {param_name} from event.")
    return value


def set_relations(resource_config: dict[str, Any]) -> None:
    """Set the term's `isA` relationships. Also re-sends the term's existing `classifies`
    (if any), read via GetGlossaryTerm, since it's not confirmed whether UpdateGlossaryTerm
    merges termRelations or replaces it outright; re-sending the current value is safe
    either way and avoids silently wiping a `classifies` relationship set elsewhere (e.g.
    the console, or another term's own isA pointing at this one).

    `relatedTermIds` is required (not defaulted to `[]`): the caller (`glossary-term-
    relations.ts`) always validates it to 1-10 entries before this resource is ever
    created, and an empty list here would otherwise reach `update_glossary_term` as
    `isA: []`, which DataZone's own min-length-1 constraint always rejects."""
    domain_id = get_required_param(resource_config, "domainId")
    term_id = get_required_param(resource_config, "termId")
    related_term_ids = get_required_param(resource_config, "relatedTermIds")

    existing = datazone_client.get_glossary_term(domainIdentifier=domain_id, identifier=term_id)
    existing_classifies = existing.get("termRelations", {}).get("classifies", [])

    term_relations = {"isA": related_term_ids}
    if existing_classifies:
        term_relations["classifies"] = existing_classifies

    datazone_client.update_glossary_term(
        domainIdentifier=domain_id,
        identifier=term_id,
        termRelations=term_relations,
    )
    logger.info(f"Set termRelations.isA for glossary term {term_id}: {related_term_ids}")


def clear_relations(domain_id: str, term_id: str) -> None:
    """Clear this resource's `isA` relationship by omitting the `isA` key (there is no
    valid empty-list representation; see module docstring), then read the term back to
    confirm the relationship actually cleared.

    This resource depends on both the owning term and every related term (see
    glossary-term-relations.ts), so CloudFormation always deletes it before either of
    them - both still exist whenever this runs. A ResourceNotFoundException here means
    the term was removed out-of-band (e.g. deleted directly in DataZone, or this is a
    retry of a delete that already succeeded), so treating it as a no-op is still safe.
    Any other failure - including the clear silently not taking effect - must fail the
    Delete so CloudFormation can retry, instead of leaving a relationship (and an
    undeletable term/glossary - DeleteGlossaryTerm/DeleteGlossary both require zero
    relationships/terms) behind while reporting success."""
    if not domain_id or not term_id:
        logger.warning("Missing domainId/termId on delete; nothing to do.")
        return
    try:
        datazone_client.update_glossary_term(
            domainIdentifier=domain_id,
            identifier=term_id,
            termRelations={},
        )
        updated = datazone_client.get_glossary_term(domainIdentifier=domain_id, identifier=term_id)
        remaining = updated.get("termRelations", {}).get("isA", [])
        if remaining:
            raise RuntimeError(
                f"termRelations.isA for glossary term {term_id} is still {remaining} after clearing; "
                "DataZone did not clear the relationship."
            )
        logger.info(f"Cleared termRelations.isA for glossary term {term_id}")
    except datazone_client.exceptions.ResourceNotFoundException:
        logger.info(f"Glossary term {term_id} already deleted; nothing to clear")


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Handle CloudFormation custom resource events for a DataZone glossary term's relations."""
    logger.info(f"RequestType: {event.get('RequestType')}")
    request_type = event["RequestType"]
    resource_config = event["ResourceProperties"]

    domain_id = resource_config.get("domainId")
    term_id = resource_config.get("termId")

    if request_type in ("Create", "Update"):
        set_relations(resource_config)
        physical_resource_id = term_id
    elif request_type == "Delete":
        physical_resource_id = event.get("PhysicalResourceId", term_id)
        clear_relations(domain_id, physical_resource_id)
    else:
        raise ValueError(f"Unsupported RequestType: {request_type}")

    return {
        "PhysicalResourceId": physical_resource_id,
        "Data": {},
    }
