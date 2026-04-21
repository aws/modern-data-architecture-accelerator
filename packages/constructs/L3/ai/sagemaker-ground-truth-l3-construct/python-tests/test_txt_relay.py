"""Tests for txt_file_s3_to_sqs_relay.py Lambda."""

import json
import pytest
from moto import mock_aws
import boto3
import os

from conftest import set_labeling_env


@mock_aws
def test_relay_sends_lines_to_sqs(aws_credentials):
    """Relay Lambda reads a txt file from S3 and sends each line as an SQS message."""
    s3 = boto3.client("s3", region_name="us-east-1")
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3.create_bucket(Bucket="upload-bucket")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    # Upload a text file with 3 lines
    s3.put_object(
        Bucket="upload-bucket",
        Key="data/texts.txt",
        Body="First document\nSecond document\nThird document\n",
    )

    os.environ["SQS_QUEUE_URL"] = queue_url

    import importlib
    import txt_file_s3_to_sqs_relay

    importlib.reload(txt_file_s3_to_sqs_relay)
    txt_file_s3_to_sqs_relay.s3 = s3
    txt_file_s3_to_sqs_relay.sqs = sqs

    # EventBridge S3 Object Created event
    event = {
        "detail": {
            "bucket": {"name": "upload-bucket"},
            "object": {"key": "data/texts.txt"},
        }
    }

    txt_file_s3_to_sqs_relay.handler(event, None)

    # Verify messages were sent to SQS
    messages = []
    while True:
        resp = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=10, WaitTimeSeconds=0)
        if "Messages" not in resp:
            break
        messages.extend(resp["Messages"])

    bodies = [m["Body"] for m in messages]
    assert "First document" in bodies
    assert "Second document" in bodies
    assert "Third document" in bodies


@mock_aws
def test_relay_skips_empty_lines(aws_credentials):
    """Relay Lambda skips empty lines in the text file."""
    s3 = boto3.client("s3", region_name="us-east-1")
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3.create_bucket(Bucket="upload-bucket")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    s3.put_object(
        Bucket="upload-bucket",
        Key="data/texts.txt",
        Body="Line one\n\n\nLine two\n",
    )

    os.environ["SQS_QUEUE_URL"] = queue_url

    import importlib
    import txt_file_s3_to_sqs_relay

    importlib.reload(txt_file_s3_to_sqs_relay)
    txt_file_s3_to_sqs_relay.s3 = s3
    txt_file_s3_to_sqs_relay.sqs = sqs

    event = {
        "detail": {
            "bucket": {"name": "upload-bucket"},
            "object": {"key": "data/texts.txt"},
        }
    }

    txt_file_s3_to_sqs_relay.handler(event, None)

    messages = []
    while True:
        resp = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=10, WaitTimeSeconds=0)
        if "Messages" not in resp:
            break
        messages.extend(resp["Messages"])

    # Should only have 2 non-empty lines
    assert len(messages) == 2
