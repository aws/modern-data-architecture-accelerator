"""Tests for update_feature_store.py Lambda — record transformation, processing, and handler."""

import json
import os
import pytest
from unittest.mock import MagicMock, patch, call
from moto import mock_aws
import boto3

from conftest import set_labeling_env


def test_transform_labeling_result_to_record_image():
    """Transforms an image labeling result into a feature store record."""
    set_labeling_env("test-bucket")
    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)

    labeling_result = {
        "source-ref": "s3://bucket/image.jpg",
        "label": 1,
        "label-metadata": {
            "creation-date": "2026-01-01T12:00:00.000",
            "job-name": "test-job",
        },
    }

    record = update_feature_store.transform_labeling_result_to_record(
        labeling_result=labeling_result,
        feature_group_definitions={},
    )

    assert len(record) == 3
    feature_names = {r["FeatureName"] for r in record}
    assert "source_ref" in feature_names
    assert "event_time" in feature_names
    assert "labeling_job" in feature_names

    source_record = next(r for r in record if r["FeatureName"] == "source_ref")
    assert source_record["ValueAsString"] == "s3://bucket/image.jpg"

    job_record = next(r for r in record if r["FeatureName"] == "labeling_job")
    assert job_record["ValueAsString"] == "test-job"


def test_transform_labeling_result_skips_failures():
    """Returns empty list when labeling result has a failure-reason."""
    set_labeling_env("test-bucket")
    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)

    labeling_result = {
        "source-ref": "s3://bucket/image.jpg",
        "label": 1,
        "label-metadata": {
            "creation-date": "2026-01-01T12:00:00.000",
            "job-name": "test-job",
            "failure-reason": "Worker timeout",
        },
    }

    record = update_feature_store.transform_labeling_result_to_record(
        labeling_result=labeling_result,
        feature_group_definitions={},
    )

    assert record == []


def test_transform_with_verification_approved():
    """With verification enabled, approved records include status feature."""
    import os

    os.environ["VERIFICATION_ATTRIBUTE_NAME"] = "verification"
    set_labeling_env("test-bucket")
    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)

    labeling_result = {
        "source-ref": "s3://bucket/image.jpg",
        "label": 1,
        "label-metadata": {
            "creation-date": "2026-01-01T12:00:00.000",
            "job-name": "test-job",
        },
        "verification": 0,  # 0 = approved
        "verification-metadata": {
            "creation-date": "2026-01-02T12:00:00.000",
            "job-name": "verify-job",
        },
    }

    record = update_feature_store.transform_labeling_result_to_record(
        labeling_result=labeling_result,
        feature_group_definitions={},
    )

    assert len(record) == 4
    status_record = next(r for r in record if r["FeatureName"] == "status")
    assert status_record["ValueAsString"] == "APPROVED"

    # Cleanup
    del os.environ["VERIFICATION_ATTRIBUTE_NAME"]


def test_transform_with_verification_rejected():
    """With verification enabled, rejected records return empty list."""
    import os

    os.environ["VERIFICATION_ATTRIBUTE_NAME"] = "verification"
    set_labeling_env("test-bucket")
    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)

    labeling_result = {
        "source-ref": "s3://bucket/image.jpg",
        "label": 1,
        "label-metadata": {
            "creation-date": "2026-01-01T12:00:00.000",
            "job-name": "test-job",
        },
        "verification": 1,  # 1 = rejected
        "verification-metadata": {
            "creation-date": "2026-01-02T12:00:00.000",
            "job-name": "verify-job",
        },
    }

    record = update_feature_store.transform_labeling_result_to_record(
        labeling_result=labeling_result,
        feature_group_definitions={},
    )

    assert record == []

    # Cleanup
    del os.environ["VERIFICATION_ATTRIBUTE_NAME"]


def test_transform_with_additional_feature_definitions():
    """Additional feature definitions extract nested values from labeling result."""
    set_labeling_env("test-bucket")
    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)

    labeling_result = {
        "source-ref": "s3://bucket/image.jpg",
        "label": {"class": "cat", "confidence": 0.95},
        "label-metadata": {
            "creation-date": "2026-01-01T12:00:00.000",
            "job-name": "test-job",
        },
    }

    # feature_group_definitions maps feature_name → key path to extract value
    record = update_feature_store.transform_labeling_result_to_record(
        labeling_result=labeling_result,
        feature_group_definitions={"class_name": ["label", "class"]},
    )

    assert len(record) == 4
    class_record = next(r for r in record if r["FeatureName"] == "class_name")
    assert class_record["ValueAsString"] == "cat"


def test_create_record_feature():
    """create_record_feature returns correct dict structure."""
    set_labeling_env("test-bucket")
    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)

    feature = update_feature_store.create_record_feature("my_feature", "my_value")
    assert feature == {"FeatureName": "my_feature", "ValueAsString": "my_value"}


def test_put_record_to_feature_store_propagates_errors():
    """put_record_to_feature_store raises on failure (no silent swallowing)."""
    set_labeling_env("test-bucket")
    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)

    mock_client = MagicMock()
    mock_client.put_record.side_effect = Exception("Feature store unavailable")
    update_feature_store.sagemaker_featurestore = mock_client

    with pytest.raises(Exception, match="Feature store unavailable"):
        update_feature_store.put_record_to_feature_store(
            feature_group_name="test-fg",
            record=[{"FeatureName": "source_ref", "ValueAsString": "test"}],
        )


@mock_aws
def test_process_labeling_job_output_image(aws_credentials):
    """process_labeling_job_output deletes SQS messages and saves to feature store for image tasks."""
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    # Send messages and get receipt handles
    for i in range(2):
        sqs.send_message(QueueUrl=queue_url, MessageBody=f"msg-{i}")
    resp = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=10)
    messages = resp["Messages"]

    mapping = {}
    for i, msg in enumerate(messages):
        mapping[f"s3://bucket/img{i}.jpg"] = msg["ReceiptHandle"]

    set_labeling_env("test-output", queue_url)

    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)
    update_feature_store.sqs = sqs

    mock_fs = MagicMock()
    update_feature_store.sagemaker_featurestore = mock_fs

    lines = []
    for i in range(2):
        lines.append(json.dumps({
            "source-ref": f"s3://bucket/img{i}.jpg",
            "label": i,
            "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1"},
        }))

    remaining = update_feature_store.process_labeling_job_output(
        feature_group_name="test-fg",
        queue_url=queue_url,
        labeling_job_output="\n".join(lines),
        record_source_to_receipt_handle=mapping.copy(),
        feature_group_definitions={},
        task_media_type="image",
    )

    assert len(remaining) == 0
    assert mock_fs.put_record.call_count == 2


@mock_aws
def test_process_labeling_job_output_text(aws_credentials):
    """process_labeling_job_output uses line index as ID for text tasks."""
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    sqs.send_message(QueueUrl=queue_url, MessageBody="msg-0")
    resp = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=10)

    set_labeling_env("test-output", queue_url)
    os.environ["SOURCE_KEY"] = "source"
    os.environ["TASK_MEDIA_TYPE"] = "text"

    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)
    update_feature_store.sqs = sqs

    mock_fs = MagicMock()
    update_feature_store.sagemaker_featurestore = mock_fs

    mapping = {"The quick brown fox": resp["Messages"][0]["ReceiptHandle"]}
    line = json.dumps({
        "source": "The quick brown fox",
        "label": 0,
        "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1"},
    })

    remaining = update_feature_store.process_labeling_job_output(
        feature_group_name="test-fg",
        queue_url=queue_url,
        labeling_job_output=line,
        record_source_to_receipt_handle=mapping.copy(),
        feature_group_definitions={},
        task_media_type="text",
    )

    assert len(remaining) == 0
    mock_fs.put_record.assert_called_once()

    # Restore
    os.environ["SOURCE_KEY"] = "source-ref"
    os.environ["TASK_MEDIA_TYPE"] = "image"


def test_process_labeling_job_output_unsupported_media_type(aws_credentials):
    """process_labeling_job_output raises for unsupported media types."""
    set_labeling_env("test-bucket")

    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)
    update_feature_store.sqs = MagicMock()
    update_feature_store.sagemaker_featurestore = MagicMock()

    line = json.dumps({
        "source-ref": "s3://bucket/video.mp4",
        "label": 0,
        "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1"},
    })
    mapping = {"s3://bucket/video.mp4": "handle1"}

    with pytest.raises(ValueError, match="Unsupported task media type"):
        update_feature_store.process_labeling_job_output(
            feature_group_name="test-fg",
            queue_url="http://queue",
            labeling_job_output=line,
            record_source_to_receipt_handle=mapping,
            feature_group_definitions={},
            task_media_type="video",
        )


def test_process_skips_failed_records(aws_credentials):
    """process_labeling_job_output skips records with failure-reason (no SQS delete or FS write)."""
    set_labeling_env("test-bucket")

    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)

    mock_sqs = MagicMock()
    mock_fs = MagicMock()
    update_feature_store.sqs = mock_sqs
    update_feature_store.sagemaker_featurestore = mock_fs

    line = json.dumps({
        "source-ref": "s3://bucket/img.jpg",
        "label": 0,
        "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1", "failure-reason": "timeout"},
    })
    mapping = {"s3://bucket/img.jpg": "handle1"}

    remaining = update_feature_store.process_labeling_job_output(
        feature_group_name="test-fg",
        queue_url="http://queue",
        labeling_job_output=line,
        record_source_to_receipt_handle=mapping.copy(),
        feature_group_definitions={},
        task_media_type="image",
    )

    # Failed record not processed — original mapping unchanged
    assert len(remaining) == 1
    mock_sqs.delete_message_batch.assert_not_called()
    mock_fs.put_record.assert_not_called()


@mock_aws
def test_handler_orchestration(aws_credentials):
    """Handler downloads output and mapping from S3, processes, and uploads rejected mapping."""
    s3 = boto3.client("s3", region_name="us-east-1")
    sqs = boto3.client("sqs", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    queue = sqs.create_queue(QueueName="test-queue")
    queue_url = queue["QueueUrl"]

    # Send message to get receipt handle
    sqs.send_message(QueueUrl=queue_url, MessageBody="msg")
    resp = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=1)
    receipt_handle = resp["Messages"][0]["ReceiptHandle"]

    set_labeling_env("test-output", queue_url)

    import importlib
    import update_feature_store
    import _utils

    importlib.reload(update_feature_store)
    update_feature_store.sqs = sqs
    _utils.s3 = s3

    mock_fs = MagicMock()
    update_feature_store.sagemaker_featurestore = mock_fs

    # Upload labeling output
    line = json.dumps({
        "source-ref": "s3://bucket/img.jpg",
        "label": 1,
        "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1"},
    })
    s3.put_object(Bucket="test-output", Key="runs/exec-1/output.manifest", Body=line)

    # Upload mapping
    mapping = {"s3://bucket/img.jpg": receipt_handle}
    s3.put_object(Bucket="test-output", Key="runs/exec-1/mapping.json", Body=json.dumps(mapping))

    result = update_feature_store.handler(
        {
            "ExecutionId": "arn:aws:states:us-east-1:123:execution:sfn:exec-1",
            "LabelingJobOutputUri": "s3://test-output/runs/exec-1/output.manifest",
            "RecordSourceToReceiptHandleS3Key": "runs/exec-1/mapping.json",
        },
        None,
    )

    assert "RejectedLabelsRecordSourceToReceiptHandleS3Key" in result
    mock_fs.put_record.assert_called_once()

    # Verify rejected mapping was uploaded (should be empty — record was successful)
    rejected_obj = s3.get_object(Bucket="test-output", Key=result["RejectedLabelsRecordSourceToReceiptHandleS3Key"])
    rejected = json.loads(rejected_obj["Body"].read().decode("utf-8"))
    assert len(rejected) == 0


def test_batch_delete_raises_on_sqs_failures(aws_credentials):
    """batch_delete_message_from_sqs_and_save_to_feature_store raises RuntimeError on SQS delete failures."""
    import concurrent.futures

    set_labeling_env("test-bucket")
    import importlib
    import update_feature_store

    importlib.reload(update_feature_store)

    mock_sqs = MagicMock()
    mock_sqs.delete_message_batch.return_value = {
        "Successful": [],
        "Failed": [{"Id": "img_jpg", "Code": "InternalError", "Message": "test error"}],
    }
    update_feature_store.sqs = mock_sqs
    update_feature_store.sagemaker_featurestore = MagicMock()

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        with pytest.raises(RuntimeError, match="Failed to delete 1 SQS messages"):
            update_feature_store.batch_delete_message_from_sqs_and_save_to_feature_store(
                queue_url="http://queue",
                feature_group_name="test-fg",
                delete_entries=[{"Id": "img_jpg", "ReceiptHandle": "handle"}],
                feature_store_records={"img_jpg": [{"FeatureName": "source_ref", "ValueAsString": "test"}]},
                executor=executor,
            )
