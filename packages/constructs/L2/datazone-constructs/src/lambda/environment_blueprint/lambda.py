# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import os
from urllib.parse import urlparse
import logging
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = {"user_agent_extra": solution_identifier}
config = config.Config(**user_agent_extra_param)

datazone_client = boto3.client('datazone', config=config)
s3_client = boto3.client('s3', config=config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger(__name__)


def get_required_param(resource_config, param_name):
    """Get required parameter or raise descriptive error."""
    value = resource_config.get(param_name)
    if value is None:
        raise ValueError(f"Unable to parse {param_name} from event.")
    return value


def convert_dict_string_booleans(data_dict):
    """
    Converts string representations of booleans within a dictionary to actual boolean values.
    Handles nested dictionaries and lists containing dictionaries.
    """
    converted_dict = {}
    for key, value in data_dict.items():
        if isinstance(value, dict):
            converted_dict[key] = convert_dict_string_booleans(value)
        elif isinstance(value, list):
            converted_list = []
            for item in value:
                if isinstance(item, dict):
                    converted_list.append(convert_dict_string_booleans(item))
                elif isinstance(item, str):
                    converted_list.append(_convert_string_boolean(item))
                else:
                    converted_list.append(item)
            converted_dict[key] = converted_list
        elif isinstance(value, str):
            converted_dict[key] = _convert_string_boolean(value)
        else:
            converted_dict[key] = value
    return converted_dict


def _convert_string_boolean(value):
    """Convert string 'true'/'false' to boolean, otherwise return original."""
    if value.lower() == 'true':
        return True
    elif value.lower() == 'false':
        return False
    return value


def get_s3_bucket_obj_from_url(s3_url):
    """
    Extracts the S3 bucket name and object key from an S3 HTTP URL.

    Returns:
        tuple: (bucket_name, object_key) or (None, None) if not found.
    """
    parsed_url = urlparse(s3_url)
    path_segments = parsed_url.path.lstrip("/").split("/")
    if len(path_segments) >= 2:
        return path_segments[0], path_segments[1]
    return None, None


def copy_template(template_source_url, template_bucket, template_bucket_region_domain_name, template_key):
    """Copy template from CDK bucket to Domain bucket."""
    template_source_bucket, template_source_obj = get_s3_bucket_obj_from_url(template_source_url)
    s3_client.copy_object(
        CopySource={
            'Bucket': template_source_bucket,
            'Key': template_source_obj
        },
        Bucket=template_bucket,
        Key=template_key
    )
    template_url = f'https://{template_bucket_region_domain_name}/{template_key}'
    logger.info(f"Staged template from {template_source_url} to {template_url}")
    return template_url


def lambda_handler(event, context):
    """Main Lambda handler for environment blueprint operations."""
    logger.info(f"Received event: {json.dumps(event, indent=2)}")
    logger.info("Sleeping 30 seconds to allow for IAM permission propagation")
    # nosemgrep
    time.sleep(30)

    resource_config = event['ResourceProperties']
    domain_id = get_required_param(resource_config, 'domain_id')

    request_type = event['RequestType']
    if request_type == 'Create':
        return handle_create(event, domain_id, resource_config)
    elif request_type == 'Update':
        return handle_update(event, domain_id, resource_config)
    elif request_type == 'Delete':
        return handle_delete(event, domain_id)


def _get_common_params(resource_config):
    """Extract common parameters used by create and update."""
    return {
        'template_source_url': get_required_param(resource_config, 'template_source_url'),
        'template_bucket': get_required_param(resource_config, 'template_bucket'),
        'template_key': get_required_param(resource_config, 'template_key'),
        'template_bucket_region_domain_name': get_required_param(resource_config, 'template_bucket_region_domain_name'),
        'enabled_regions': get_required_param(resource_config, 'enabled_regions'),
        'provisioning_role_arn': get_required_param(resource_config, 'provisioning_role_arn'),
    }


def _get_user_parameters(resource_config):
    """Get and convert user parameters if present."""
    user_parameters = resource_config.get('user_parameters')
    if user_parameters is not None:
        return [convert_dict_string_booleans(x) for x in user_parameters]
    return None


def handle_create(event, domain_id, resource_config):
    """Handle Create request for environment blueprint."""
    blueprint_name = get_required_param(resource_config, 'blueprint_name')
    params = _get_common_params(resource_config)
    user_parameters = _get_user_parameters(resource_config)

    template_url = copy_template(
        params['template_source_url'],
        params['template_bucket'],
        params['template_bucket_region_domain_name'],
        params['template_key']
    )

    logger.info(f"Creating Environment Blueprint {blueprint_name} for domain {domain_id}")

    create_kwargs = {
        'domainIdentifier': domain_id,
        'name': blueprint_name,
        'provisioningProperties': {
            'cloudFormation': {'templateUrl': template_url}
        }
    }
    if user_parameters is not None:
        create_kwargs['userParameters'] = user_parameters

    create_response = datazone_client.create_environment_blueprint(**create_kwargs)
    identifier = create_response['id']

    datazone_client.put_environment_blueprint_configuration(
        domainIdentifier=domain_id,
        environmentBlueprintIdentifier=identifier,
        enabledRegions=params['enabled_regions'],
        provisioningRoleArn=params['provisioning_role_arn']
    )

    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": identifier,
        "Data": {"BlueprintId": identifier}
    }


def handle_update(event, domain_id, resource_config):
    """Handle Update request for environment blueprint."""
    identifier = event.get('PhysicalResourceId')
    if identifier is None:
        raise ValueError("Unable to parse PhysicalResourceId from event.")

    params = _get_common_params(resource_config)
    user_parameters = _get_user_parameters(resource_config)

    template_url = copy_template(
        params['template_source_url'],
        params['template_bucket'],
        params['template_bucket_region_domain_name'],
        params['template_key']
    )

    logger.info(f"Updating Environment Blueprint {identifier} for domain {domain_id}")

    update_kwargs = {
        'domainIdentifier': domain_id,
        'identifier': identifier,
        'provisioningProperties': {
            'cloudFormation': {'templateUrl': template_url}
        }
    }
    if user_parameters is not None:
        update_kwargs['userParameters'] = user_parameters

    datazone_client.update_environment_blueprint(**update_kwargs)

    datazone_client.put_environment_blueprint_configuration(
        domainIdentifier=domain_id,
        environmentBlueprintIdentifier=identifier,
        enabledRegions=params['enabled_regions'],
        provisioningRoleArn=params['provisioning_role_arn']
    )

    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": identifier,
        "Data": {"BlueprintId": identifier}
    }


def handle_delete(event, domain_id):
    """Handle Delete request for environment blueprint."""
    identifier = event.get('PhysicalResourceId')
    if identifier is None:
        raise ValueError("Unable to parse PhysicalResourceId from event.")

    logger.info(f"Deleting Environment Blueprint {identifier} for domain {domain_id}")

    datazone_client.delete_environment_blueprint(
        domainIdentifier=domain_id,
        identifier=identifier
    )

    return {"Status": "SUCCESS"}
