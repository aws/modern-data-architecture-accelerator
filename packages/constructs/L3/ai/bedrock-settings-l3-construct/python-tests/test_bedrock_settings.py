"""
Unit tests for the Bedrock Settings custom resource handler.
"""
import copy
import logging
from typing import Iterator
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

import bedrock_settings
from conftest import RESOURCE_PROPERTIES, RESPONSE_URL, make_event

EXPECTED_S3_CONFIG = {
    'bucketName': 'test-bucket',
    'keyPrefix': 'bedrock-model-invocation-logs/bedrock-model-invocation',
}

EXPECTED_CLOUDWATCH_CONFIG = {
    'logGroupName': '/aws/bedrock/model-invocation-logs/test-log-group',
    'roleArn': 'arn:aws:iam::123456789012:role/test-logging-role',
    'largeDataDeliveryS3Config': {
        'bucketName': 'test-bucket',
        'keyPrefix': 'bedrock-model-invocation-logs/bedrock-model-invocation/cloudwatch-logs-large-data-delivery/',
    },
}

# Keys a Create or Update needs when both destinations are enabled, as paths into ResourceProperties
REQUIRED_PROPERTY_PATHS = [
    ('enableAuditLoggingToS3',),
    ('enableAuditLoggingToCloudwatch',),
    ('s3Config',),
    ('s3Config', 's3Bucket'),
    ('s3Config', 's3Prefix'),
    ('cloudwatchConfig',),
    ('cloudwatchConfig', 'cloudwatchLogGroupName'),
    ('cloudwatchConfig', 'cloudwatchLoggingRoleArn'),
    ('cloudwatchConfig', 'largeDataDeliveryS3Config'),
    ('cloudwatchConfig', 'largeDataDeliveryS3Config', 's3Bucket'),
    ('cloudwatchConfig', 'largeDataDeliveryS3Config', 's3Prefix'),
]


def properties_without(path: tuple) -> dict:
    """Returns a copy of the resource properties with the key at `path` removed."""
    props = copy.deepcopy(RESOURCE_PROPERTIES)
    parent = props
    for key in path[:-1]:
        parent = parent[key]
    del parent[path[-1]]
    return props


@pytest.fixture
def bedrock_client() -> Iterator[MagicMock]:
    """Patches boto3.client so the handler talks to a mock Bedrock client."""
    client = MagicMock()
    with patch('bedrock_settings.boto3.client', return_value=client):
        yield client


@pytest.fixture
def no_http() -> Iterator[MagicMock]:
    """Fails the test if anything opens an HTTP connection through urllib3."""
    with patch(
        'urllib3.connectionpool.HTTPConnectionPool.urlopen',
        side_effect=AssertionError('unexpected HTTP request'),
    ) as urlopen:
        yield urlopen
    urlopen.assert_not_called()


class TestCreateAndUpdate:
    """Create and Update apply the logging configuration."""

    @pytest.mark.parametrize('request_type', ['Create', 'Update'])
    @pytest.mark.usefixtures('no_http')
    def test_applies_both_destinations(self, request_type, bedrock_client, lambda_context):
        result = bedrock_settings.lambda_handler(make_event(request_type), lambda_context)

        assert result is None
        bedrock_client.put_model_invocation_logging_configuration.assert_called_once_with(
            loggingConfig={
                **bedrock_settings.BASE_LOGGING_CONFIG,
                's3Config': EXPECTED_S3_CONFIG,
                'cloudWatchConfig': EXPECTED_CLOUDWATCH_CONFIG,
            }
        )
        bedrock_client.delete_model_invocation_logging_configuration.assert_not_called()

    def test_s3_only_omits_cloudwatch_config(self, bedrock_client, lambda_context):
        props = copy.deepcopy(RESOURCE_PROPERTIES)
        props['enableAuditLoggingToCloudwatch'] = 'false'
        # The L3 passes an undefined log group name when CloudWatch is disabled
        del props['cloudwatchConfig']['cloudwatchLogGroupName']

        bedrock_settings.lambda_handler(make_event('Create', props), lambda_context)

        bedrock_client.put_model_invocation_logging_configuration.assert_called_once_with(
            loggingConfig={**bedrock_settings.BASE_LOGGING_CONFIG, 's3Config': EXPECTED_S3_CONFIG}
        )

    def test_cloudwatch_only_omits_s3_config(self, bedrock_client, lambda_context):
        props = copy.deepcopy(RESOURCE_PROPERTIES)
        props['enableAuditLoggingToS3'] = 'false'
        del props['s3Config']

        bedrock_settings.lambda_handler(make_event('Update', props), lambda_context)

        bedrock_client.put_model_invocation_logging_configuration.assert_called_once_with(
            loggingConfig={**bedrock_settings.BASE_LOGGING_CONFIG, 'cloudWatchConfig': EXPECTED_CLOUDWATCH_CONFIG}
        )

    @pytest.mark.usefixtures('bedrock_client')
    def test_does_not_log_response_url(self, lambda_context, caplog):
        with caplog.at_level(logging.INFO):
            bedrock_settings.lambda_handler(make_event('Create'), lambda_context)

        assert 'Received event' in caplog.text
        assert RESPONSE_URL not in caplog.text

    def test_propagates_api_errors(self, bedrock_client, lambda_context):
        bedrock_client.put_model_invocation_logging_configuration.side_effect = ClientError(
            {'Error': {'Code': 'ValidationException', 'Message': 'bad config'}},
            'PutModelInvocationLoggingConfiguration',
        )

        with pytest.raises(ClientError):
            bedrock_settings.lambda_handler(make_event('Create'), lambda_context)


class TestInvalidEvents:
    """Malformed events raise so the Provider framework reports FAILED."""

    @pytest.mark.parametrize('request_type', ['Create', 'Update'])
    @pytest.mark.parametrize('path', REQUIRED_PROPERTY_PATHS, ids=lambda path: '.'.join(path))
    def test_missing_required_property_raises(self, request_type, path, bedrock_client, lambda_context):
        event = make_event(request_type, properties_without(path))

        with pytest.raises(KeyError):
            bedrock_settings.lambda_handler(event, lambda_context)
        bedrock_client.put_model_invocation_logging_configuration.assert_not_called()

    @pytest.mark.usefixtures('bedrock_client')
    def test_missing_resource_properties_raises(self, lambda_context):
        event = make_event('Create')
        del event['ResourceProperties']

        with pytest.raises(KeyError):
            bedrock_settings.lambda_handler(event, lambda_context)

    @pytest.mark.usefixtures('bedrock_client')
    def test_missing_request_type_raises(self, lambda_context):
        event = make_event('Create')
        del event['RequestType']

        with pytest.raises(KeyError):
            bedrock_settings.lambda_handler(event, lambda_context)

    def test_unsupported_request_type_raises(self, bedrock_client, lambda_context):
        with pytest.raises(ValueError, match='Unsupported CloudFormation request type: Replace'):
            bedrock_settings.lambda_handler(make_event('Replace'), lambda_context)
        bedrock_client.put_model_invocation_logging_configuration.assert_not_called()
        bedrock_client.delete_model_invocation_logging_configuration.assert_not_called()

    @pytest.mark.usefixtures('bedrock_client')
    def test_non_boolean_flag_raises(self, lambda_context):
        props = copy.deepcopy(RESOURCE_PROPERTIES)
        props['enableAuditLoggingToS3'] = 'yes'

        with pytest.raises(ValueError, match="enableAuditLoggingToS3 must be 'true' or 'false'"):
            bedrock_settings.lambda_handler(make_event('Create', props), lambda_context)

    def test_no_destination_enabled_raises(self, bedrock_client, lambda_context):
        props = copy.deepcopy(RESOURCE_PROPERTIES)
        props['enableAuditLoggingToS3'] = 'false'
        props['enableAuditLoggingToCloudwatch'] = 'false'

        with pytest.raises(ValueError, match='At least one of'):
            bedrock_settings.lambda_handler(make_event('Update', props), lambda_context)
        bedrock_client.delete_model_invocation_logging_configuration.assert_not_called()


class TestDelete:
    """Delete removes the logging configuration."""

    @pytest.mark.usefixtures('no_http')
    def test_deletes_configuration(self, bedrock_client, lambda_context):
        result = bedrock_settings.lambda_handler(make_event('Delete'), lambda_context)

        assert result is None
        bedrock_client.delete_model_invocation_logging_configuration.assert_called_once_with()
        bedrock_client.put_model_invocation_logging_configuration.assert_not_called()

    def test_does_not_read_destination_config(self, bedrock_client, lambda_context):
        bedrock_settings.lambda_handler(make_event('Delete', {}), lambda_context)

        bedrock_client.delete_model_invocation_logging_configuration.assert_called_once_with()

    def test_propagates_api_errors(self, bedrock_client, lambda_context):
        bedrock_client.delete_model_invocation_logging_configuration.side_effect = ClientError(
            {'Error': {'Code': 'AccessDeniedException', 'Message': 'denied'}},
            'DeleteModelInvocationLoggingConfiguration',
        )

        with pytest.raises(ClientError):
            bedrock_settings.lambda_handler(make_event('Delete'), lambda_context)
