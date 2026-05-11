# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
CloudFormation Custom Resource: Update Cognito User Pool Client

This Lambda function is invoked by CloudFormation as a Custom Resource to update
Cognito User Pool Client callback and logout URLs after CloudFront distributions
are created. This is necessary because:

1. CloudFront distribution URLs are not known until after creation
2. Cognito User Pool Client needs these URLs for OAuth redirect flows
3. CDK/CloudFormation doesn't natively support this circular dependency

Lifecycle:
- Create: Updates callback/logout URLs with CloudFront domains + configured URLs
- Update: Same as Create (re-applies all URLs)
- Delete: No action (Cognito client is managed separately)

Resource Properties (from CloudFormation):
- UserPoolId: Cognito User Pool ID
- ClientId: Cognito User Pool Client ID  
- CloudfrontDomains: List of CloudFront domain names (without https://)
- OAuthCallbackUrls: Additional callback URLs from configuration
- OAuthLogoutUrls: Additional logout URLs from configuration

Returns:
- PhysicalResourceId: Composite ID for CloudFormation resource tracking

See Also:
- lib/authentication/authentication.ts: Where this Custom Resource is defined
"""

import json
import logging
import os

import boto3
from botocore.config import Config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
boto_config = Config(**user_agent_extra_param)

cognito_client = boto3.client('cognito-idp', config=boto_config)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("Cognito update user pool client")


def _redact_event_for_logging(event: dict) -> dict:
    """
    Redact sensitive fields from CloudFormation Custom Resource event for safe logging.
    
    The ResponseURL contains a pre-signed S3 URL with embedded credentials that should
    not be logged. Other fields are safe for debugging purposes.
    """
    redacted = event.copy()
    if 'ResponseURL' in redacted:
        redacted['ResponseURL'] = '[REDACTED - pre-signed S3 URL]'
    return redacted


def lambda_handler(event, context):
    logger.info("Starting")
    # Log full event with sensitive fields redacted (useful for debugging)
    logger.debug(json.dumps(_redact_event_for_logging(event), indent=2))
    
    request_type = event['RequestType']
    
    if request_type in ('Create', 'Update'):
        return handle_create_update(event, context)
    elif request_type == 'Delete':
        # Nothing to clean up - Cognito client is managed by CloudFormation separately
        # Return success with the existing PhysicalResourceId
        return {
            "Status": "SUCCESS",
            "PhysicalResourceId": event.get('PhysicalResourceId', 'delete-no-op')
        }
    else:
        raise ValueError(f"Unknown RequestType: {request_type}")


def handle_create_update(event, context):

    resource_config = event['ResourceProperties']
    user_pool_id = resource_config.get('UserPoolId', None)
    
    if user_pool_id is None:
        raise Exception("Unable to parse userPoolId from event.")
    client_id = resource_config.get('ClientId', None)
    
    if client_id is None:
        raise Exception("Unable to parse clientId from event.")
    
    cloudfront_domains = resource_config.get('CloudfrontDomains', [])
    # Create new array with HTTPS URLs
    cloud_https_domains = [f'https://{domain}' for domain in cloudfront_domains]
    o_auth_callback_urls = resource_config.get('OAuthCallbackUrls', [])
    o_auth_logout_urls = resource_config.get('OAuthLogoutUrls', [])
    
    
    logger.info(f"Updating UserPoolClient {user_pool_id}")

    # Get current config
    current = cognito_client.describe_user_pool_client(
        UserPoolId=user_pool_id,
        ClientId=client_id
    )['UserPoolClient']

    cognito_client.update_user_pool_client(
        UserPoolId=user_pool_id,
        ClientId=client_id,
        **{k: v for k, v in current.items()
           if k not in ['ClientId', 'UserPoolId', 'CreationDate', 'LastModifiedDate', 'CallbackURLs', 'LogoutURLs']},
        CallbackURLs=[
            *cloud_https_domains,
            *o_auth_callback_urls
        ],
        LogoutURLs=[
            *cloud_https_domains,
            *o_auth_logout_urls
        ]
    )

    return {
        "Status": "SUCCESS",
        "PhysicalResourceId": f"{user_pool_id}-{client_id}-{cloudfront_domains}-{o_auth_callback_urls}-{o_auth_logout_urls}"
    }
