#!/usr/bin/env python3

import json
import logging
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
           
    logger.info(f"Loading domain: {domain_id}")
    
    domain_response = datazone_client.get_domain(
        identifier=domain_id
    )
    
    domain_unit_ids = get_domain_unit_ids(domain_id,domain_response['rootDomainUnitId'],'domain_unit_id/root')

    if domain_response['domainVersion'] == 'V2' :
        project_ids = {f"project_id/{project['name']}":project['id'] for project in paginated_list(datazone_client.list_projects,domainIdentifier=domain_id)}
    else:
        project_ids = {}

    managed_env_bp_response = paginated_list(datazone_client.list_environment_blueprints,domainIdentifier=domain_id, managed=True,maxResults=25)
    managed_env_bp_ids = {f"blueprint_id/{env_bp['name']}":env_bp['id'] for env_bp in managed_env_bp_response}
    unmanaged_env_bp_response = paginated_list(datazone_client.list_environment_blueprints,domainIdentifier=domain_id, managed=False,maxResults=25)
    unmanaged_env_bp_ids = {f"blueprint_id/{env_bp['name']}":env_bp['id'] for env_bp in unmanaged_env_bp_response}

    data = {
            'name': domain_response['name'],
            'domainVersion': domain_response['domainVersion'],
            'arn': domain_response['arn'],
            'kmsKeyIdentifier': domain_response['kmsKeyIdentifier'],
            **domain_unit_ids,
            **managed_env_bp_ids,
            **unmanaged_env_bp_ids,
            **project_ids
        }

    logger.info(f"Returning data: {json.dumps(data,indent=2)}")

    return {
        'PhysicalResourceId': domain_id,
        'Data': data

    }

def get_domain_unit_ids(domain_id,parent_id,parent_path):
    domain_unit_list_response = paginated_list(datazone_client.list_domain_units_for_parent,
        domainIdentifier=domain_id,
        parentDomainUnitIdentifier=parent_id,
    )
    
    child_domain_units = {}
    for domain_unit in domain_unit_list_response:
        child_domain_units.update(get_domain_unit_ids(domain_id, domain_unit['id'], f"{parent_path}/{domain_unit['name']}") )

    return {
        parent_path: parent_id,
        **child_domain_units
    }
    
def paginated_list(list_function, **kwargs):
    items = []
    response = list_function(**kwargs)

    items.extend(response['items'])
    while 'nextToken' in response:
        response = list_function(nextToken=response['nextToken'], **kwargs)
        items.extend(response['items'])

    return items   

  
