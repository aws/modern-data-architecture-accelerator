"""
Custom Resource handler that blocks CloudFormation updates which would cause
AWS::HealthLake::FHIRDatastore to replace (delete + recreate) a datastore.

HealthLake replaces the datastore on any change to DatastoreName, SseConfiguration
(kmsKeyArn), IdentityProviderConfiguration, or PreloadDataConfig (preloadSynthea) -
see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-healthlake-fhirdatastore.html.

On Update, this guard compares OldResourceProperties against ResourceProperties.
On Create, CloudFormation has no prior state to diff against - but the guard itself
may be new to a stack whose datastore already existed (e.g. this module version was
just adopted, or the guard was added alongside another config change on the same
deploy). In that case a config change would otherwise replace the pre-existing
datastore with no warning. To catch this, Create looks up any existing datastore
with the same name via ListFHIRDatastores and, if found, diffs its live properties
against the incoming config exactly as Update would.

Either path raises an exception (failing the deployment before the datastore is
touched) when a guarded field changed, unless the caller explicitly set
acknowledgeReplacement.
"""

import json
import logging

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

_healthlake_client = None


def get_healthlake_client():
    """Lazily create the HealthLake client on first use. Creating it at import time
    would require a region/credentials even for the Update/Delete paths that never
    call AWS (and would break unit-test collection)."""
    global _healthlake_client
    if _healthlake_client is None:
        _healthlake_client = boto3.client("healthlake")
    return _healthlake_client

GUARDED_FIELDS = ["datastoreName", "kmsKeyArn", "identityProviderConfiguration", "preloadSynthea"]

# DatastoreStatus values that represent a datastore this guard should protect.
# DELETED/CREATE_FAILED datastores are not live and cannot be replaced.
LIVE_DATASTORE_STATUSES = {"CREATING", "ACTIVE", "DELETING"}


def lambda_handler(event, context):
    safe_event = {
        "RequestType": event.get("RequestType"),
        "ResourceProperties": {
            k: v for k, v in event.get("ResourceProperties", {}).items() if k != "ServiceToken"
        },
        "OldResourceProperties": {
            k: v for k, v in event.get("OldResourceProperties", {}).items() if k != "ServiceToken"
        },
    }
    logger.info("Received event: %s", json.dumps(safe_event, indent=2))

    request_type = event["RequestType"]

    if request_type == "Create":
        return handle_create(event)
    elif request_type == "Update":
        return handle_update(event)
    elif request_type == "Delete":
        return {"Status": "200", "Data": {}}
    else:
        raise ValueError(f"Unexpected RequestType: {request_type}")


def handle_create(event):
    new_props = event["ResourceProperties"]
    existing_props = find_live_datastore_properties(new_props["datastoreName"])

    if existing_props is None:
        return {"Status": "200", "Data": {}}

    logger.info(
        "Found pre-existing live datastore '%s' not tracked by this Custom Resource's prior "
        "state. Diffing its live configuration against the incoming config.",
        new_props["datastoreName"],
    )
    return diff_and_enforce(existing_props, new_props)


def handle_update(event):
    old_props = event.get("OldResourceProperties", {})
    new_props = event["ResourceProperties"]
    return diff_and_enforce(old_props, new_props)


def diff_and_enforce(old_props, new_props):
    changed_fields = [
        field for field in GUARDED_FIELDS if _field_changed(field, old_props, new_props)
    ]

    if not changed_fields:
        return {"Status": "200", "Data": {}}

    acknowledged = str(new_props.get("acknowledgeReplacement", "false")).lower() == "true"
    if acknowledged:
        logger.warning(
            "Replacement acknowledged via acknowledgeReplacement=true. Changed fields: %s",
            changed_fields,
        )
        return {"Status": "200", "Data": {"AcknowledgedChangedFields": json.dumps(changed_fields)}}

    raise RuntimeError(
        "Blocked a change to HealthLake datastore field(s) that would cause "
        f"AWS::HealthLake::FHIRDatastore to be replaced (deleted and recreated): {changed_fields}. "
        "This is a documented AWS CloudFormation behavior "
        "(https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-healthlake-fhirdatastore.html) "
        "and would risk data loss. If this replacement is intentional, set "
        "'acknowledgeReplacement: true' on this datastore's configuration and redeploy."
    )


def _field_changed(field, old_props, new_props):
    """Compare a single guarded field between two property sets.

    identityProviderConfiguration is a JSON string on both sides, but the two
    sides are produced by different serializers (Python json.dumps vs the TS
    stableStringify), so a raw string compare would flag whitespace- and
    absent-vs-false-only differences as changes. Compare it structurally
    instead; all other guarded fields are plain scalars compared directly."""
    old_value = old_props.get(field)
    new_value = new_props.get(field)
    if field == "identityProviderConfiguration":
        return _normalized_idp(old_value) != _normalized_idp(new_value)
    return old_value != new_value


def _normalized_idp(value):
    """Parse an identityProviderConfiguration payload into a canonical dict so that
    JSON formatting differences and the absent-vs-`false` boolean asymmetry never
    register as changes.

    The optional boolean fineGrainedAuthorizationEnabled is the source of the
    asymmetry: JSON.stringify on the TS side omits it when unset, while the
    HealthLake API returns it as `false`. Coerce it to its default so both shapes
    compare equal."""
    if value is None:
        return None
    cfg = json.loads(value) if isinstance(value, str) else dict(value)
    cfg["fineGrainedAuthorizationEnabled"] = bool(cfg.get("fineGrainedAuthorizationEnabled", False))
    return cfg


def find_live_datastore_properties(datastore_name):
    """Look up a live (non-deleted) datastore by name via the HealthLake API and
    return its properties in the same shape as a Custom Resource's ResourceProperties,
    or None if no live datastore with this name exists.

    ListFHIRDatastores has no botocore paginator model, so get_paginator() would
    raise OperationNotPageableError; page manually via NextToken instead. The API's
    Filter.DatastoreName is not documented as an exact match and DatastoreName is not
    a unique identifier, so re-check the name client-side to avoid diffing against a
    prefix collision (e.g. 'store' matching 'store-v2')."""
    client = get_healthlake_client()
    next_token = None
    while True:
        kwargs = {"Filter": {"DatastoreName": datastore_name}}
        if next_token:
            kwargs["NextToken"] = next_token
        response = client.list_fhir_datastores(**kwargs)
        for datastore in response.get("DatastorePropertiesList", []):
            if datastore.get("DatastoreName") != datastore_name:
                continue
            if datastore.get("DatastoreStatus") not in LIVE_DATASTORE_STATUSES:
                continue
            return to_resource_properties(datastore)
        next_token = response.get("NextToken")
        if not next_token:
            return None


def to_resource_properties(datastore):
    """Translate a ListFHIRDatastores DatastoreProperties entry into the same field
    names/shapes used in this guard's ResourceProperties, so diff_and_enforce can
    compare them directly. The API returns PascalCase field names; ResourceProperties
    uses the module's camelCase config field names, so the identityProviderConfiguration
    object must be re-keyed, not just re-serialized."""
    sse_config = datastore.get("SseConfiguration", {}).get("KmsEncryptionConfig", {})
    idp_config = datastore.get("IdentityProviderConfiguration")
    preload_config = datastore.get("PreloadDataConfig")

    return {
        "datastoreName": datastore.get("DatastoreName"),
        "kmsKeyArn": sse_config.get("KmsKeyId"),
        "identityProviderConfiguration": (
            stable_json(idp_config_to_camel_case(idp_config)) if idp_config else None
        ),
        "preloadSynthea": str(bool(preload_config)).lower(),
    }


def idp_config_to_camel_case(idp_config):
    """Re-key an API IdentityProviderConfiguration response (PascalCase) to the
    module's config field names (camelCase), dropping unset fields so the result
    matches what stableStringify on the TypeScript side would produce for an
    equivalent config."""
    field_map = {
        "AuthorizationStrategy": "authorizationStrategy",
        "FineGrainedAuthorizationEnabled": "fineGrainedAuthorizationEnabled",
        "IdpLambdaArn": "idpLambdaArn",
        "Metadata": "metadata",
    }
    return {
        field_map[key]: value
        for key, value in idp_config.items()
        if key in field_map and value is not None
    }


def stable_json(value):
    """JSON-encode with sorted keys and compact separators so the output matches
    the TypeScript-side stableStringify (JSON.stringify, which emits no spaces) and
    key-order differences don't register as changes. Comparison is structural (see
    _normalized_idp), so this format is not load-bearing for the diff, but keeping
    the two serializers aligned avoids surprising divergence in logs and outputs."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"))
