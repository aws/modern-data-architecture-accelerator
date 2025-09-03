# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

"""
AWS Lambda function for managing Amazon Bedrock model invocation logging configuration.

This module provides a CloudFormation custom resource handler that configures
Bedrock logging to S3 and/or CloudWatch based on the provided parameters.
Supports Create, Update, and Delete operations for logging configurations.
"""

from __future__ import print_function
import json
import boto3
import urllib3

# CloudFormation response constants
SUCCESS = "SUCCESS"
FAILED = "FAILED"

# HTTP client for CloudFormation responses
http = urllib3.PoolManager()


def lambda_handler(event, context):
    """
    Main Lambda handler for Bedrock logging configuration custom resource.
    
    Processes CloudFormation custom resource events (Create/Update/Delete) to
    configure Amazon Bedrock model invocation logging to S3 and/or CloudWatch.
    
    Args:
        event (dict): CloudFormation custom resource event containing:
            - RequestType: 'Create', 'Update', or 'Delete'
            - ResourceProperties: Configuration parameters including:
                - enableAuditLoggingToS3: 'true'/'false'
                - enableAuditLoggingToCloudwatch: 'true'/'false'
                - s3Config: S3 bucket and prefix configuration
                - cloudwatchConfig: CloudWatch log group and role configuration
        context: Lambda context object
    
    Returns:
        None: Sends response directly to CloudFormation via HTTP
    """
    print("Received event: " + json.dumps(event))
    
    # Base logging configuration - enables all data types by default
    logging_config = {
        'textDataDeliveryEnabled': True,
        'imageDataDeliveryEnabled': True,
        'embeddingDataDeliveryEnabled': True,
        'videoDataDeliveryEnabled': True,
    }
    try:
        # Configure S3 logging if enabled
        if event.get('ResourceProperties').get('enableAuditLoggingToS3') == 'true':
            bucket_name = event.get('ResourceProperties').get('s3Config').get('s3Bucket')
            prefix = event.get('ResourceProperties').get('s3Config').get('s3Prefix')
            s3_config = {
                'bucketName': bucket_name,
                'keyPrefix': prefix
            }
            logging_config['s3Config'] = s3_config
        
        # Configure CloudWatch logging if enabled
        if event.get('ResourceProperties').get('enableAuditLoggingToCloudwatch') == 'true':
            log_group_name = event.get('ResourceProperties').get('cloudwatchConfig').get('cloudwatchLogGroupName')
            cloudwatch_role_arn = event.get('ResourceProperties').get('cloudwatchConfig').get('cloudwatchLoggingRoleArn')
            large_data_bucket_name = event.get('ResourceProperties').get('cloudwatchConfig').get('largeDataDeliveryS3Config').get('s3Bucket')
            large_data_prefix = event.get('ResourceProperties').get('cloudwatchConfig').get('largeDataDeliveryS3Config').get('s3Prefix')

            cloudwatch_config = {
                'logGroupName': log_group_name,
                'roleArn': cloudwatch_role_arn,
                'largeDataDeliveryS3Config': {
                    'bucketName': large_data_bucket_name,
                    'keyPrefix': large_data_prefix
                }
            }
            logging_config['cloudWatchConfig'] = cloudwatch_config

        request_type = event['RequestType'] if event.get('ResourceProperties').get('enableAuditLoggingToS3') != 'false' or event.get('ResourceProperties').get('enableAuditLoggingToCloudwatch') != 'false' else 'Delete'

        bedrock_logging(logging_config, request_type, event, context)

    except (KeyError, AttributeError, TypeError) as e:
        print(f"Configuration parsing error: {e}")
        response_data = {'message': f'Configuration parsing failed: {str(e)}'}
        send(event, context, FAILED, response_data)

def bedrock_logging(logging_config, request_type, event, context):
    """
    Configure Amazon Bedrock model invocation logging.
    
    Handles Create/Update operations by setting logging configuration and
    Delete operations by removing logging configuration.
    
    Args:
        logging_config (dict): Bedrock logging configuration including S3 and/or CloudWatch settings
        request_type (str): CloudFormation request type ('Create', 'Update', or 'Delete')
        event (dict): Original CloudFormation event
        context: Lambda context object
    
    Returns:
        None: Sends response to CloudFormation via send() function
    """
    import os
    
    # Get AWS region from environment or default to us-east-1
    region = os.environ.get('AWS_REGION', 'us-east-1')
    print(f"Using AWS region: {region}")
    print(f"Logging configuration: {json.dumps(logging_config)}")
    print(f"Request type: {request_type}")
    
    # Initialize Bedrock client for the specified region
    client = boto3.client('bedrock', region_name=region)
    
    if request_type == 'Create' or request_type == 'Update':
        # Enable or update Bedrock model invocation logging
        response = client.put_model_invocation_logging_configuration(
            loggingConfig=logging_config
        )
        message = f'Successfully {request_type.lower()}d Bedrock logging configuration'
        
    elif request_type == 'Delete':
        # Disable Bedrock model invocation logging
        response = client.delete_model_invocation_logging_configuration()
        message = 'Successfully disabled Bedrock logging configuration'
        
    else:
        # Unsupported request type
        error_msg = f'Unsupported CloudFormation request type: {request_type}'
        print(error_msg)
        send(event, context, FAILED, {'message': error_msg})
        return
    
    # Check response status and send appropriate result to CloudFormation
    status = SUCCESS if response['ResponseMetadata']['HTTPStatusCode'] == 200 else FAILED
    print(f"Bedrock API response status: {response['ResponseMetadata']['HTTPStatusCode']}")
    send(event, context, status, {'message': message})


def send(event, context, response_status, response_data, physical_resource_id=None, no_echo=False, reason=None):
    """
    Send response back to CloudFormation custom resource.
    
    Constructs and sends an HTTP PUT request to the CloudFormation response URL
    with the operation result and any associated data.
    
    Args:
        event (dict): Original CloudFormation event containing ResponseURL and identifiers
        context: Lambda context object providing log stream name
        response_status (str): SUCCESS or FAILED
        response_data (dict): Data to return to CloudFormation
        physical_resource_id (str, optional): Physical resource identifier
        no_echo (bool, optional): Whether to mask response data in CloudFormation logs
        reason (str, optional): Custom reason for the response status
    
    Returns:
        None: Sends HTTP response directly to CloudFormation
    """
    response_url = event['ResponseURL']
    print(f"Sending response to CloudFormation: {response_url}")
    
    # Construct CloudFormation custom resource response
    response_body = {
        'Status': response_status,
        'Reason': reason or f"See CloudWatch Log Stream: {context.log_stream_name}",
        'PhysicalResourceId': physical_resource_id or context.log_stream_name,
        'StackId': event['StackId'],
        'RequestId': event['RequestId'],
        'LogicalResourceId': event['LogicalResourceId'],
        'NoEcho': no_echo,
        'Data': response_data
    }
    
    json_response_body = json.dumps(response_body)
    print("CloudFormation response body:")
    print(json_response_body)
    
    # Prepare HTTP headers for the response
    headers = {
        'content-type': '',
        'content-length': str(len(json_response_body))
    }
    
    try:
        # Send HTTP PUT response to CloudFormation
        response = http.request('PUT', response_url, headers=headers, body=json_response_body)
        print(f"CloudFormation response status code: {response.status}")
    except (urllib3.exceptions.HTTPError, OSError) as e:
        print(f"Failed to send response to CloudFormation: {e}")