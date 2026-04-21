"""Tests for run_verification_job.py Lambda."""

import json
import os
import pytest
from unittest.mock import MagicMock
from moto import mock_aws
import boto3

from conftest import set_labeling_env


def _set_verification_env():
    """Set env vars specific to verification Lambda."""
    os.environ["VERIFICATION_JOB_NAME"] = "test-verification-job"
    os.environ["VERIFICATION_ATTRIBUTE_NAME"] = "verification"
    os.environ["HUMAN_TASK_UI_NAME"] = "BoundingBox"


def _cleanup_verification_env():
    for key in ["VERIFICATION_JOB_NAME", "VERIFICATION_ATTRIBUTE_NAME"]:
        os.environ.pop(key, None)


@mock_aws
def test_parse_labeling_job_output_splits_labeled_and_unlabeled(aws_credentials):
    """parse_labeling_job_output separates labeled from failed records."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    set_labeling_env("test-output")
    _set_verification_env()

    import importlib
    import run_verification_job

    importlib.reload(run_verification_job)

    labeled_line = json.dumps({
        "source-ref": "s3://bucket/img1.jpg",
        "label": 1,
        "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1"},
    })
    failed_line = json.dumps({
        "source-ref": "s3://bucket/img2.jpg",
        "label": 0,
        "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1", "failure-reason": "timeout"},
    })

    output = f"{labeled_line}\n{failed_line}"
    mapping = {
        "s3://bucket/img1.jpg": "handle1",
        "s3://bucket/img2.jpg": "handle2",
    }

    labeled_records, unlabeled, remaining = run_verification_job.parse_labeling_job_output(
        labeling_job_output=output,
        record_source_to_receipt_handle=mapping,
    )

    assert len(labeled_records) == 1
    assert json.loads(labeled_records[0])["source-ref"] == "s3://bucket/img1.jpg"
    assert unlabeled == {"s3://bucket/img2.jpg": "handle2"}
    assert "s3://bucket/img1.jpg" in remaining
    assert "s3://bucket/img2.jpg" not in remaining

    _cleanup_verification_env()


@mock_aws
def test_parse_labeling_job_output_all_labeled(aws_credentials):
    """All records labeled — no unlabeled entries."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    set_labeling_env("test-output")
    _set_verification_env()

    import importlib
    import run_verification_job

    importlib.reload(run_verification_job)

    lines = []
    mapping = {}
    for i in range(5):
        line = json.dumps({
            "source-ref": f"s3://bucket/img{i}.jpg",
            "label": i,
            "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1"},
        })
        lines.append(line)
        mapping[f"s3://bucket/img{i}.jpg"] = f"handle{i}"

    labeled, unlabeled, remaining = run_verification_job.parse_labeling_job_output(
        labeling_job_output="\n".join(lines),
        record_source_to_receipt_handle=mapping,
    )

    assert len(labeled) == 5
    assert len(unlabeled) == 0
    assert len(remaining) == 5

    _cleanup_verification_env()


@mock_aws
def test_parse_labeling_job_output_all_failed(aws_credentials):
    """All records failed — all moved to unlabeled."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    set_labeling_env("test-output")
    _set_verification_env()

    import importlib
    import run_verification_job

    importlib.reload(run_verification_job)

    lines = []
    mapping = {}
    for i in range(3):
        line = json.dumps({
            "source-ref": f"s3://bucket/img{i}.jpg",
            "label": 0,
            "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1", "failure-reason": "timeout"},
        })
        lines.append(line)
        mapping[f"s3://bucket/img{i}.jpg"] = f"handle{i}"

    labeled, unlabeled, remaining = run_verification_job.parse_labeling_job_output(
        labeling_job_output="\n".join(lines),
        record_source_to_receipt_handle=mapping,
    )

    assert len(labeled) == 0
    assert len(unlabeled) == 3
    assert len(remaining) == 0

    _cleanup_verification_env()


@mock_aws
def test_create_and_upload_manifest(aws_credentials):
    """create_and_upload_manifest writes JSONL manifest to S3."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    set_labeling_env("test-output")
    _set_verification_env()

    import importlib
    import run_verification_job

    importlib.reload(run_verification_job)
    run_verification_job.s3 = s3

    records = [
        json.dumps({"source-ref": "s3://b/img1.jpg", "label": 1}),
        json.dumps({"source-ref": "s3://b/img2.jpg", "label": 2}),
    ]

    uri = run_verification_job.create_and_upload_manifest(
        labeled_records=records,
        bucket="test-output",
        prefix="runs/exec-1",
    )

    assert uri == "s3://test-output/runs/exec-1/verification.manifest"

    obj = s3.get_object(Bucket="test-output", Key="runs/exec-1/verification.manifest")
    content = obj["Body"].read().decode("utf-8")
    lines = content.strip().split("\n")
    assert len(lines) == 2
    assert json.loads(lines[0])["source-ref"] == "s3://b/img1.jpg"

    _cleanup_verification_env()


@mock_aws
def test_handler_full_flow(aws_credentials):
    """Handler orchestrates download, parse, manifest upload, labeling job, and mapping uploads."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    set_labeling_env("test-output")
    _set_verification_env()

    import importlib
    import run_verification_job
    import _utils

    importlib.reload(run_verification_job)
    run_verification_job.s3 = s3
    _utils.s3 = s3

    mock_sagemaker = MagicMock()
    _utils.sagemaker = mock_sagemaker

    # Upload receipt handle mapping
    mapping = {"s3://bucket/img1.jpg": "handle1", "s3://bucket/img2.jpg": "handle2"}
    s3.put_object(Bucket="test-output", Key="runs/exec-1/mapping.json", Body=json.dumps(mapping))

    # Upload labeling job output (1 labeled, 1 failed)
    labeled_line = json.dumps({
        "source-ref": "s3://bucket/img1.jpg",
        "label": 1,
        "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1"},
    })
    failed_line = json.dumps({
        "source-ref": "s3://bucket/img2.jpg",
        "label": 0,
        "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1", "failure-reason": "timeout"},
    })
    s3.put_object(
        Bucket="test-output",
        Key="runs/exec-1/output.manifest",
        Body=f"{labeled_line}\n{failed_line}",
    )

    result = run_verification_job.handler(
        {
            "ExecutionId": "arn:aws:states:us-east-1:123:execution:sfn:exec-1",
            "RecordSourceToReceiptHandleS3Key": "runs/exec-1/mapping.json",
            "LabelingJobOutputUri": "s3://test-output/runs/exec-1/output.manifest",
        },
        None,
    )

    assert result["LabelingJobName"].startswith("test-verification-job-")
    assert "UnlabeledRecordSourceToReceiptHandleS3Key" in result
    assert "RecordSourceToReceiptHandleS3Key" in result

    # Verify SageMaker was called with verification ARNs
    mock_sagemaker.create_labeling_job.assert_called_once()
    call_kwargs = mock_sagemaker.create_labeling_job.call_args[1]
    assert "PRE-VerificationBoundingBox" in call_kwargs["HumanTaskConfig"]["PreHumanTaskLambdaArn"]
    assert "ACS-VerificationBoundingBox" in call_kwargs["HumanTaskConfig"]["AnnotationConsolidationConfig"]["AnnotationConsolidationLambdaArn"]

    # Verify unlabeled mapping uploaded
    unlabeled_obj = s3.get_object(Bucket="test-output", Key=result["UnlabeledRecordSourceToReceiptHandleS3Key"])
    unlabeled = json.loads(unlabeled_obj["Body"].read().decode("utf-8"))
    assert "s3://bucket/img2.jpg" in unlabeled

    # Verify remaining mapping uploaded (only labeled remain)
    remaining_obj = s3.get_object(Bucket="test-output", Key=result["RecordSourceToReceiptHandleS3Key"])
    remaining = json.loads(remaining_obj["Body"].read().decode("utf-8"))
    assert "s3://bucket/img1.jpg" in remaining
    assert "s3://bucket/img2.jpg" not in remaining

    _cleanup_verification_env()


@mock_aws
def test_handler_with_custom_template(aws_credentials):
    """Handler uses custom template URI when INSTRUCTIONS_TEMPLATE_S3_URI is set."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")
    set_labeling_env("test-output")
    _set_verification_env()
    os.environ["INSTRUCTIONS_TEMPLATE_S3_URI"] = "s3://templates/custom.liquid.html"
    os.environ.pop("HUMAN_TASK_UI_NAME", None)

    import importlib
    import run_verification_job
    import _utils

    importlib.reload(run_verification_job)
    run_verification_job.s3 = s3
    _utils.s3 = s3

    mock_sagemaker = MagicMock()
    _utils.sagemaker = mock_sagemaker

    mapping = {"s3://bucket/img1.jpg": "handle1"}
    s3.put_object(Bucket="test-output", Key="runs/exec-1/mapping.json", Body=json.dumps(mapping))

    labeled_line = json.dumps({
        "source-ref": "s3://bucket/img1.jpg",
        "label": 1,
        "label-metadata": {"creation-date": "2026-01-01T12:00:00.000", "job-name": "job1"},
    })
    s3.put_object(Bucket="test-output", Key="runs/exec-1/output.manifest", Body=labeled_line)

    run_verification_job.handler(
        {
            "ExecutionId": "arn:aws:states:us-east-1:123:execution:sfn:exec-1",
            "RecordSourceToReceiptHandleS3Key": "runs/exec-1/mapping.json",
            "LabelingJobOutputUri": "s3://test-output/runs/exec-1/output.manifest",
        },
        None,
    )

    call_kwargs = mock_sagemaker.create_labeling_job.call_args[1]
    assert "UiTemplateS3Uri" in call_kwargs["HumanTaskConfig"]["UiConfig"]
    assert call_kwargs["HumanTaskConfig"]["UiConfig"]["UiTemplateS3Uri"] == "s3://templates/custom.liquid.html"

    os.environ.pop("INSTRUCTIONS_TEMPLATE_S3_URI", None)
    os.environ["HUMAN_TASK_UI_NAME"] = "BoundingBox"
    _cleanup_verification_env()
