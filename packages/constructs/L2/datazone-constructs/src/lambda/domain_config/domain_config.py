#!/usr/bin/env python3

import json
import logging
from collections import deque
import boto3

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DataZone client
datazone_client = boto3.client('datazone')

def lambda_handler(event, context):
    """
    Lambda function to perform domain configuration lookups
    """
        
    logger.info(f"Received event: {json.dumps(event, default=str)}")
    if event['RequestType'] == 'Create' or event['RequestType'] == 'Update':
        return on_create_update(event)

def on_create_update(event):
    # Extract properties from event
    resource_config = event['ResourceProperties']
    domain_id = resource_config.get('domain_id')

    if not domain_id:
        raise ValueError("domain_id is required")

    # These limit the response to only the keys the calling stack(s) actually requested via
    # getDomainUnitId()/getBlueprintId(), keeping the response under the CloudFormation custom
    # resource 4096-byte limit regardless of how large the domain grows. Missing/absent is
    # treated the same as an empty list (rather than "return everything") so that a rollback to
    # pre-fix properties can't reproduce the unscoped, oversized response.
    requested_unit_paths = resource_config.get('domain_unit_paths') or []
    # Full 'blueprint_id/<name>' keys, same shape as requested_unit_paths - not bare names.
    requested_blueprint_keys = resource_config.get('blueprint_names') or []

    logger.info(f"Loading domain: {domain_id}")

    domain_response = datazone_client.get_domain(
        identifier=domain_id
    )

    domain_unit_ids = get_domain_unit_ids(domain_id,domain_response['rootDomainUnitId'],'domain_unit_id/root')
    domain_unit_ids = {k: v for k, v in domain_unit_ids.items() if k in set(requested_unit_paths)}

    managed_env_bp_response = paginated_list(datazone_client.list_environment_blueprints,domainIdentifier=domain_id, managed=True,maxResults=25)
    managed_env_bp_ids = {f"blueprint_id/{env_bp['name']}":env_bp['id'] for env_bp in managed_env_bp_response}
    unmanaged_env_bp_response = paginated_list(datazone_client.list_environment_blueprints,domainIdentifier=domain_id, managed=False,maxResults=25)
    unmanaged_env_bp_ids = {f"blueprint_id/{env_bp['name']}":env_bp['id'] for env_bp in unmanaged_env_bp_response}

    requested_bp_keys = set(requested_blueprint_keys)
    managed_env_bp_ids = {k: v for k, v in managed_env_bp_ids.items() if k in requested_bp_keys}
    unmanaged_env_bp_ids = {k: v for k, v in unmanaged_env_bp_ids.items() if k in requested_bp_keys}

    # arn, kmsKeyIdentifier and project_id/* are never read by any caller of this custom
    # resource (those values come from SSM params / other sources) and are dropped so they
    # don't count against the response size.
    data = {
            'name': domain_response['name'],
            'domainVersion': domain_response['domainVersion'],
            **domain_unit_ids,
            **managed_env_bp_ids,
            **unmanaged_env_bp_ids,
        }

    logger.info(f"Returning data: {json.dumps(data,indent=2)}")

    return {
        'PhysicalResourceId': domain_id,
        'Data': data

    }

def get_domain_unit_ids(domain_id,parent_id,parent_path):
    domain_unit_ids = {}
    queue = deque([(parent_id, parent_path)])
    while queue:
        current_id, current_path = queue.popleft()
        domain_unit_ids[current_path] = current_id

        domain_unit_list_response = paginated_list(datazone_client.list_domain_units_for_parent,
            domainIdentifier=domain_id,
            parentDomainUnitIdentifier=current_id,
        )
        for domain_unit in domain_unit_list_response:
            queue.append((domain_unit['id'], f"{current_path}/{domain_unit['name']}"))

    return domain_unit_ids
    
def paginated_list(list_function, **kwargs):
    items = []
    response = list_function(**kwargs)

    items.extend(response['items'])
    while 'nextToken' in response:
        response = list_function(nextToken=response['nextToken'], **kwargs)
        items.extend(response['items'])

    return items   

  
