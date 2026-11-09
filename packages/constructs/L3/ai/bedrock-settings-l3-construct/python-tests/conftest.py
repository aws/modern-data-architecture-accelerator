"""
Shared pytest fixtures for the Bedrock Settings Lambda tests.
"""
import copy
import os
import sys
from typing import Optional

import pytest

os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_SECURITY_TOKEN'] = 'testing'
os.environ['AWS_SESSION_TOKEN'] = 'testing'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

src_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'python', 'bedrock-settings')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

RESPONSE_URL = 'https://cloudformation-custom-resource-response.s3.amazonaws.com/presigned-test-url'

RESOURCE_PROPERTIES = {
    'ServiceToken': 'arn:aws:lambda:us-east-1:123456789012:function:provider',
    'enableAuditLoggingToS3': 'true',
    's3Config': {
        's3Bucket': 'test-bucket',
        's3Prefix': 'bedrock-model-invocation-logs/bedrock-model-invocation',
    },
    'enableAuditLoggingToCloudwatch': 'true',
    'cloudwatchConfig': {
        'cloudwatchLogGroupName': '/aws/bedrock/model-invocation-logs/test-log-group',
        'cloudwatchLoggingRoleArn': 'arn:aws:iam::123456789012:role/test-logging-role',
        'largeDataDeliveryS3Config': {
            's3Bucket': 'test-bucket',
            's3Prefix': 'bedrock-model-invocation-logs/bedrock-model-invocation/cloudwatch-logs-large-data-delivery/',
        },
    },
}


def make_event(request_type: str, resource_properties: Optional[dict] = None) -> dict:
    """Builds a CloudFormation custom resource event as the Provider framework delivers it."""
    event = {
        'RequestType': request_type,
        'ResponseURL': RESPONSE_URL,
        'StackId': 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/guid',
        'RequestId': 'test-request-id',
        'LogicalResourceId': 'bedrocksettingscr',
        'ResourceType': 'Custom::logs-model-invocation',
        'ResourceProperties': copy.deepcopy(
            RESOURCE_PROPERTIES if resource_properties is None else resource_properties
        ),
    }
    if request_type != 'Create':
        event['PhysicalResourceId'] = 'test-physical-id'
    return event


@pytest.fixture
def lambda_context() -> object:
    """Mock Lambda context."""
    class MockContext:
        function_name = 'logs-model-invocation-handler'
        log_stream_name = '2026/10/31/[$LATEST]0123456789abcdef'
        aws_request_id = 'test-aws-request-id'

    return MockContext()
