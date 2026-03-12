# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import boto3
import os
from botocore.exceptions import ClientError
import logging
from botocore import config
from urllib.parse import urlparse

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
config = config.Config(**user_agent_extra_param)

datazone_client = boto3.client('datazone', config=config)
s3_client = boto3.client('s3', config=config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger(__name__)
logger.info("Environment Blueprint")

def convert_dict_string_booleans(data_dict):
    """
    Converts string representations of booleans within a dictionary to actual boolean values.
    This function handles nested dictionaries and lists containing dictionaries.

    Args:
        data_dict (dict): The dictionary to process.

    Returns:
        dict: A new dictionary with string booleans converted to actual booleans.
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
                    if item.lower() == 'true':
                        converted_list.append(True)
                    elif item.lower() == 'false':
                        converted_list.append(False)
                    else:
                        converted_list.append(item)
                else:
                    converted_list.append(item)
            converted_dict[key] = converted_list
        elif isinstance(value, str):
            if value.lower() == 'true':
                converted_dict[key] = True
            elif value.lower() == 'false':
                converted_dict[key] = False
            else:
                converted_dict[key] = value
        else:
            converted_dict[key] = value
    return converted_dict

def get_s3_bucket_obj_from_url(s3_url):
    """
    Extracts the S3 bucket name from an S3 HTTP URL.

    Args:
        s3_url (str): The S3 HTTP URL.

    Returns:
        str or None: The S3 bucket name if found, otherwise None.
    """
    parsed_url = urlparse(s3_url)
    
    # The first segment of the path is the bucket name
    path_segments = parsed_url.path.lstrip("/").split("/")
    if path_segments:
        return path_segments[0],path_segments[1]
            
    return None

def lambda_handler(event, context):
    logger.info("Starting")
    logger.info(json.dumps(event, indent=2))
    logger.info("Sleeping 30 seconds to allow for IAM permission propagation")
    # nosemgrep
    time.sleep(30)
    resource_config = event['ResourceProperties']
    domainId = resource_config.get('domain_id', None)
    if(domainId is None):
        raise Exception("Unable to parse domain_id from event.")
    
    if event['RequestType'] == 'Create':
        return handle_create(event,domainId,resource_config, context)
    elif event['RequestType'] == 'Update':
        return handle_update(event,domainId,resource_config, context)
    elif event['RequestType'] == 'Delete':
        return handle_delete(event,domainId,resource_config, context)
    
def copy_template(templateSourceUrl,templateBucket,templateBucketRegionDomainName,templateKey):
    # Copy template from CDK bucket to Domain bucket
    templateSourceBucket,templateSourceObj = get_s3_bucket_obj_from_url(templateSourceUrl)
    s3_client.copy_object(
        CopySource = {
            'Bucket': templateSourceBucket,
            'Key': templateSourceObj
        },
        Bucket=templateBucket,
        Key=templateKey
    )
    templateUrl = f'https://{templateBucketRegionDomainName}/{templateKey}'
    logger.info(f"Staged template from {templateSourceUrl} to {templateUrl}")
    return templateUrl

def handle_create(event,domainId,resource_config, context):

    blueprintName = resource_config.get('blueprint_name', None)
    if blueprintName is None:
        raise Exception("Unable to parse blueprint_name from event.")
    
    templateSourceUrl = resource_config.get('template_source_url', None)
    if templateSourceUrl is None:
        raise Exception("Unable to parse template_source_url from event.")
    
    templateBucket = resource_config.get('template_bucket', None)
    if templateBucket is None:
        raise Exception("Unable to parse template_bucket from event.")
    
    templateKey = resource_config.get('template_key', None)
    if templateKey is None:
        raise Exception("Unable to parse template_key from event.")
    
    templateBucketRegionDomainName = resource_config.get('template_bucket_region_domain_name', None)
    if templateBucketRegionDomainName is None:
        raise Exception("Unable to parse template_bucket_region from event.")

    userParameters = resource_config.get('user_parameters', None)
    if userParameters is not None:
        userParameters = [convert_dict_string_booleans(x) for x in userParameters]

    templateUrl = copy_template(templateSourceUrl,templateBucket,templateBucketRegionDomainName,templateKey)
    logger.info(f"Creating Environment Blueprint {blueprintName} for domain {domainId}")
    
    create_kwargs = {
        'domainIdentifier': domainId,
        'name': blueprintName,
        'provisioningProperties': {
            'cloudFormation': {
                'templateUrl': templateUrl
            }
        }
    }
    if userParameters is not None:
        create_kwargs['userParameters'] = userParameters

    create_response = datazone_client.create_environment_blueprint(**create_kwargs)
    
    identifier = create_response['id']

    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": identifier,
        "Data": {
            "BlueprintId": identifier
        }
    }

def handle_update(event,domainId,resource_config, context):

    identifier = event.get('PhysicalResourceId', None)
    if identifier is None:
        raise Exception("Unable to parse identifier from event.")

    templateSourceUrl = resource_config.get('template_source_url', None)
    if templateSourceUrl is None:
        raise Exception("Unable to parse template_source_url from event.")
    templateBucket = resource_config.get('template_bucket', None)
    if templateBucket is None:
        raise Exception("Unable to parse template_bucket from event.")
    templateKey = resource_config.get('template_key', None)
    if templateKey is None:
        raise Exception("Unable to parse template_key from event.")
    templateBucketRegionDomainName = resource_config.get('template_bucket_region_domain_name', None)
    if templateBucketRegionDomainName is None:
        raise Exception("Unable to parse template_bucket_region from event.")
    
    userParameters = resource_config.get('user_parameters', None)
    if userParameters is not None:
        userParameters = [convert_dict_string_booleans(x) for x in userParameters]

    templateUrl = copy_template(templateSourceUrl,templateBucket,templateBucketRegionDomainName,templateKey)

    logger.info(f"Update Environment Blueprint {identifier} for domain {domainId}")

    update_kwargs = {
        'domainIdentifier': domainId,
        'identifier': identifier,
        'provisioningProperties': {
            'cloudFormation': {
                'templateUrl': templateUrl
            }
        }
    }
    if userParameters is not None:
        update_kwargs['userParameters'] = userParameters

    datazone_client.update_environment_blueprint(**update_kwargs)

    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": identifier,
        "Data": {
            "BlueprintId": identifier
        }
    }

def handle_delete(event,domainId,resource_config, context):

    identifier = event.get('PhysicalResourceId', None)
    if(identifier is None):
        raise Exception("Unable to parse identifier from event.")
   
    logger.info(f"Delete Environment Blueprint {identifier} for domain {domainId}")

    datazone_client.delete_environment_blueprint(
        domainIdentifier=domainId,
        identifier=identifier,
    )
    return {
        "Status": "SUCCESS",
    }
