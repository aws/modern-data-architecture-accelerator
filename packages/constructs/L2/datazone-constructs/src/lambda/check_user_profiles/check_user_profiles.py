#!/usr/bin/env python3

import json
import logging
import boto3

from user_profile_checker import check_user_profile

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize clients
datazone_client = boto3.client('datazone')


def lambda_handler(event, context):
    """
    Lambda function to check if a user profile exists
    """
    logger.info(f"Received event: {json.dumps(event, default=str)}")

    # Extract properties from event
    resource_config = event['ResourceProperties']
    domain_id = resource_config['domain_id']
    user_identifier = resource_config['user_identifier']

    # user_identifier is already resolved by CloudFormation (if it was an SSM parameter)
    # or is a direct SSO ID/IAM ARN
    logger.info(f"Checking user profile for identifier: {user_identifier}")
    if  event['RequestType'] == 'Create' or event['RequestType'] == 'Update':
        logger.info("Create request - checking user profile")
        # Check user profile
        id = check_user_profile(domain_id, user_identifier, datazone_client)
        return {    
            'Data': {
                'id': id
            }
        }
