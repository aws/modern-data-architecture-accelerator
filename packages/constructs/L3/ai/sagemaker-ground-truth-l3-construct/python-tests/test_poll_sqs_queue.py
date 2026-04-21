"""Tests for poll_sqs_queue.py Lambda."""

import json
import pytest
from moto import mock_aws
import boto3

from conftest import set_labeling_env


@mock_aws
def test_poll_image_messages(aws_credentials):
    """Poll retrieves image S3 event messages and maps source to receipt handle."""
    s3 = boto3.client("s3", region_name="us-east-1")
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    set_labeling_env("test-output", queue_url)

    # Send 3 image S3 event messages
    for i in range(3):
        body = {
            "detail": {
                "bucket": {"name": "upload-bucket"},
                "object": {"key": f"images/img{i}.jpg"},
            }
        }
        sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(body))

    # Force reimport with fresh env
    import importlib
    import poll_sqs_queue

    poll_sqs_queue.sqs = sqs
    importlib.reload(poll_sqs_queue)
    poll_sqs_queue.sqs = sqs

    result = poll_sqs_queue.poll_sqs_queue(
        sqs_queue_url=queue_url,
        item_limit=100,
        messages_per_batch=10,
        wait_time_seconds=0,
        task_media_type="image",
    )

    assert len(result) == 3
    for i in range(3):
        assert f"s3://upload-bucket/images/img{i}.jpg" in result


@mock_aws
def test_poll_text_messages(aws_credentials):
    """Poll retrieves text messages directly from SQS body."""
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    set_labeling_env("test-output", queue_url)

    sqs.send_message(QueueUrl=queue_url, MessageBody="This is a text document")
    sqs.send_message(QueueUrl=queue_url, MessageBody="Another document")

    import importlib
    import poll_sqs_queue

    importlib.reload(poll_sqs_queue)
    poll_sqs_queue.sqs = sqs

    result = poll_sqs_queue.poll_sqs_queue(
        sqs_queue_url=queue_url,
        item_limit=100,
        messages_per_batch=10,
        wait_time_seconds=0,
        task_media_type="text",
    )

    assert len(result) == 2
    assert "This is a text document" in result
    assert "Another document" in result


@mock_aws
def test_poll_empty_queue(aws_credentials):
    """Poll returns empty dict when queue has no messages."""
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    set_labeling_env("test-output", queue_url)

    import importlib
    import poll_sqs_queue

    importlib.reload(poll_sqs_queue)
    poll_sqs_queue.sqs = sqs

    result = poll_sqs_queue.poll_sqs_queue(
        sqs_queue_url=queue_url,
        item_limit=100,
        messages_per_batch=10,
        wait_time_seconds=0,
        task_media_type="image",
    )

    assert len(result) == 0


@mock_aws
def test_poll_respects_item_limit(aws_credentials):
    """Poll stops when item_limit is reached."""
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    set_labeling_env("test-output", queue_url)

    for i in range(10):
        body = {
            "detail": {
                "bucket": {"name": "upload-bucket"},
                "object": {"key": f"images/img{i}.jpg"},
            }
        }
        sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(body))

    import importlib
    import poll_sqs_queue

    importlib.reload(poll_sqs_queue)
    poll_sqs_queue.sqs = sqs

    result = poll_sqs_queue.poll_sqs_queue(
        sqs_queue_url=queue_url,
        item_limit=3,
        messages_per_batch=10,
        wait_time_seconds=0,
        task_media_type="image",
    )

    assert len(result) == 3


@mock_aws
def test_poll_deduplicates_messages(aws_credentials):
    """Poll deduplicates messages with same source."""
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    set_labeling_env("test-output", queue_url)

    # Send same source twice
    body = {"detail": {"bucket": {"name": "b"}, "object": {"key": "same.jpg"}}}
    sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(body))
    sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(body))

    import importlib
    import poll_sqs_queue

    importlib.reload(poll_sqs_queue)
    poll_sqs_queue.sqs = sqs

    result = poll_sqs_queue.poll_sqs_queue(
        sqs_queue_url=queue_url,
        item_limit=100,
        messages_per_batch=10,
        wait_time_seconds=0,
        task_media_type="image",
    )

    assert len(result) == 1
    assert "s3://b/same.jpg" in result


@mock_aws
def test_poll_skips_malformed_messages(aws_credentials):
    """Poll skips messages with missing bucket/key."""
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    set_labeling_env("test-output", queue_url)

    # Malformed message (no detail.bucket.name)
    sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps({"detail": {}}))
    # Valid message
    body = {"detail": {"bucket": {"name": "b"}, "object": {"key": "valid.jpg"}}}
    sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(body))

    import importlib
    import poll_sqs_queue

    importlib.reload(poll_sqs_queue)
    poll_sqs_queue.sqs = sqs

    result = poll_sqs_queue.poll_sqs_queue(
        sqs_queue_url=queue_url,
        item_limit=100,
        messages_per_batch=10,
        wait_time_seconds=0,
        task_media_type="image",
    )

    assert len(result) == 1
    assert "s3://b/valid.jpg" in result


@mock_aws
def test_handler_uploads_mapping_to_s3(aws_credentials):
    """Handler uploads receipt handle mapping to S3 and returns correct structure."""
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    set_labeling_env("test-output", queue_url)

    body = {"detail": {"bucket": {"name": "b"}, "object": {"key": "img.jpg"}}}
    sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(body))

    import importlib
    import poll_sqs_queue

    importlib.reload(poll_sqs_queue)
    poll_sqs_queue.sqs = sqs
    # Patch the module-level s3 client
    import _utils
    _utils.s3 = s3

    result = poll_sqs_queue.handler(
        {"ExecutionId": "arn:aws:states:us-east-1:123:execution:sfn:exec-123"},
        None,
    )

    assert result["MessagesCount"] == 1
    assert "RecordSourceToReceiptHandleS3Key" in result

    # Verify the S3 object was created
    s3_key = result["RecordSourceToReceiptHandleS3Key"]
    obj = s3.get_object(Bucket="test-output", Key=s3_key)
    mapping = json.loads(obj["Body"].read().decode("utf-8"))
    assert "s3://b/img.jpg" in mapping
