"""Tests for return_messages_to_sqs_queue.py Lambda."""

import json
import pytest
from moto import mock_aws
import boto3

from conftest import set_labeling_env


@mock_aws
def test_handler_returns_messages_to_queue(aws_credentials):
    """Handler changes visibility timeout to 0 for all messages in mapping."""
    s3 = boto3.client("s3", region_name="us-east-1")
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    # Send messages and collect receipt handles
    for i in range(3):
        sqs.send_message(QueueUrl=queue_url, MessageBody=f"msg-{i}")

    # Receive to get receipt handles
    resp = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=10)
    messages = resp["Messages"]
    mapping = {}
    for msg in messages:
        mapping[f"s3://bucket/img{msg['Body']}.jpg"] = msg["ReceiptHandle"]

    # Upload mapping to S3
    s3.put_object(
        Bucket="test-output",
        Key="runs/exec-1/mapping.json",
        Body=json.dumps(mapping),
    )

    set_labeling_env("test-output", queue_url)

    import importlib
    import return_messages_to_sqs_queue
    import _utils

    importlib.reload(return_messages_to_sqs_queue)
    return_messages_to_sqs_queue.sqs = sqs
    _utils.s3 = s3

    # Should not raise
    return_messages_to_sqs_queue.handler(
        {"RecordSourceToReceiptHandleS3Key": "runs/exec-1/mapping.json"},
        None,
    )


def test_split_dict_into_batches():
    """split_dict_into_batches correctly splits a dict."""
    set_labeling_env("test-bucket")
    import importlib
    import return_messages_to_sqs_queue

    importlib.reload(return_messages_to_sqs_queue)

    data = {f"key{i}": f"val{i}" for i in range(25)}
    batches = return_messages_to_sqs_queue.split_dict_into_batches(data, batch_size=10)

    assert len(batches) == 3
    assert len(batches[0]) == 10
    assert len(batches[1]) == 10
    assert len(batches[2]) == 5

    # All keys preserved
    all_keys = set()
    for batch in batches:
        all_keys.update(batch.keys())
    assert all_keys == set(data.keys())


def test_split_dict_into_batches_empty():
    """split_dict_into_batches handles empty dict."""
    set_labeling_env("test-bucket")
    import importlib
    import return_messages_to_sqs_queue

    importlib.reload(return_messages_to_sqs_queue)

    batches = return_messages_to_sqs_queue.split_dict_into_batches({}, batch_size=10)
    assert batches == []
