# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

"""
CloudFormation custom resource handler for the account's Amazon Bedrock model invocation logging
configuration (one setting per account and Region).

Runs under the CDK Provider framework, which sends the CloudFormation response: the handler returns
on success and raises on failure. It never returns a PhysicalResourceId, so the framework keeps the
existing ID on every update and CloudFormation never sees a replacement (which would send Delete
and switch logging off).
"""

import json
import logging
import os

import boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Data types delivered to every enabled destination
BASE_LOGGING_CONFIG = {
    'textDataDeliveryEnabled': True,
    'imageDataDeliveryEnabled': True,
    'embeddingDataDeliveryEnabled': True,
    'videoDataDeliveryEnabled': True,
}


def lambda_handler(event: dict, context: object) -> None:
    """
    Applies (Create/Update) or removes (Delete) the Bedrock model invocation logging configuration.

    Args:
        event: CloudFormation custom resource event. Create and Update read ResourceProperties:
            - enableAuditLoggingToS3 / enableAuditLoggingToCloudwatch: 'true' or 'false'
            - s3Config: s3Bucket and s3Prefix (when S3 logging is enabled)
            - cloudwatchConfig: cloudwatchLogGroupName, cloudwatchLoggingRoleArn and
              largeDataDeliveryS3Config (s3Bucket, s3Prefix) (when CloudWatch logging is enabled)
        context: Lambda context object (unused)

    Raises:
        KeyError: a required event or ResourceProperties key is missing
        ValueError: the request type or a destination flag is invalid
        botocore.exceptions.ClientError: the Bedrock API call failed
    """
    # The ResponseURL is a pre-signed URL that can submit this resource's CloudFormation response.
    logger.info('Received event: %s', json.dumps({**event, 'ResponseURL': '...'}))

    request_type = event['RequestType']
    client = boto3.client('bedrock')

    if request_type in ('Create', 'Update'):
        logging_config = build_logging_config(event['ResourceProperties'])
        logger.info('Applying logging configuration: %s', json.dumps(logging_config))
        client.put_model_invocation_logging_configuration(loggingConfig=logging_config)
    elif request_type == 'Delete':
        # Delete needs no destination config, so a malformed property cannot block stack deletion.
        client.delete_model_invocation_logging_configuration()
        logger.info('Deleted logging configuration')
    else:
        raise ValueError(f'Unsupported CloudFormation request type: {request_type}')


def build_logging_config(props: dict) -> dict:
    """
    Builds the PutModelInvocationLoggingConfiguration loggingConfig from the resource properties.

    Args:
        props: the custom resource's ResourceProperties

    Returns:
        The loggingConfig request parameter

    Raises:
        KeyError: a destination flag, or a key required by an enabled destination, is missing
        ValueError: a destination flag is not 'true'/'false', or no destination is enabled
    """
    s3_enabled = is_enabled(props, 'enableAuditLoggingToS3')
    cloudwatch_enabled = is_enabled(props, 'enableAuditLoggingToCloudwatch')
    if not s3_enabled and not cloudwatch_enabled:
        raise ValueError('At least one of enableAuditLoggingToS3 or enableAuditLoggingToCloudwatch must be true')

    logging_config = dict(BASE_LOGGING_CONFIG)
    if s3_enabled:
        s3_config = props['s3Config']
        logging_config['s3Config'] = {
            'bucketName': s3_config['s3Bucket'],
            'keyPrefix': s3_config['s3Prefix'],
        }
    if cloudwatch_enabled:
        cloudwatch_config = props['cloudwatchConfig']
        large_data_config = cloudwatch_config['largeDataDeliveryS3Config']
        logging_config['cloudWatchConfig'] = {
            'logGroupName': cloudwatch_config['cloudwatchLogGroupName'],
            'roleArn': cloudwatch_config['cloudwatchLoggingRoleArn'],
            'largeDataDeliveryS3Config': {
                'bucketName': large_data_config['s3Bucket'],
                'keyPrefix': large_data_config['s3Prefix'],
            },
        }
    return logging_config


def is_enabled(props: dict, key: str) -> bool:
    """
    Reads a destination flag. CloudFormation delivers boolean properties as strings.

    Args:
        props: the custom resource's ResourceProperties
        key: the flag's property name

    Returns:
        True for 'true', False for 'false'

    Raises:
        KeyError: the flag is missing
        ValueError: the flag is neither 'true' nor 'false'
    """
    value = props[key]
    if value not in ('true', 'false'):
        raise ValueError(f"{key} must be 'true' or 'false', got {value!r}")
    return value == 'true'
