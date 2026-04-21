"""Tests for run_labeling_job.py Lambda."""

import json
import os
import pytest
from unittest.mock import MagicMock, patch
from moto import mock_aws
import boto3

from conftest import set_labeling_env, AC_ARN_MAP


@mock_aws
def test_handler_creates_manifest_and_calls_create_labeling_job(aws_credentials):
    """Handler creates manifest in S3 and calls SageMaker create_labeling_job."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")

    # Upload receipt handle mapping
    mapping = {"s3://bucket/img1.jpg": "handle1", "s3://bucket/img2.jpg": "handle2"}
    s3.put_object(
        Bucket="test-output",
        Key="runs/exec-123/record_source_to_receipt_handle.json",
        Body=json.dumps(mapping),
    )

    set_labeling_env("test-output")

    import importlib
    import run_labeling_job

    importlib.reload(run_labeling_job)
    run_labeling_job.s3 = s3

    import _utils
    _utils.s3 = s3

    # Mock the SageMaker create_labeling_job call
    mock_sagemaker = MagicMock()
    _utils.sagemaker = mock_sagemaker

    result = run_labeling_job.handler(
        {
            "ExecutionId": "arn:aws:states:us-east-1:123:execution:sfn:exec-123",
            "RecordSourceToReceiptHandleS3Key": "runs/exec-123/record_source_to_receipt_handle.json",
        },
        None,
    )

    assert "LabelingJobName" in result
    assert result["LabelingJobName"].startswith("test-labeling-job-")

    # Verify manifest was uploaded
    manifest_obj = s3.get_object(
        Bucket="test-output", Key="runs/exec-123/labeling.manifest"
    )
    manifest_content = manifest_obj["Body"].read().decode("utf-8")
    lines = manifest_content.strip().split("\n")
    assert len(lines) == 2

    # Verify SageMaker was called
    mock_sagemaker.create_labeling_job.assert_called_once()


@mock_aws
def test_handler_uses_built_in_ui_when_no_template(aws_credentials):
    """Handler uses SageMaker-managed HumanTaskUi ARN when no custom template."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-output")

    mapping = {"s3://bucket/img.jpg": "handle"}
    s3.put_object(
        Bucket="test-output",
        Key="runs/exec-1/record_source_to_receipt_handle.json",
        Body=json.dumps(mapping),
    )

    set_labeling_env("test-output")
    # Ensure no custom template
    os.environ.pop("INSTRUCTIONS_TEMPLATE_S3_URI", None)
    os.environ["HUMAN_TASK_UI_NAME"] = "BoundingBox"

    import importlib
    import run_labeling_job

    importlib.reload(run_labeling_job)
    run_labeling_job.s3 = s3

    import _utils
    _utils.s3 = s3

    mock_sagemaker = MagicMock()
    _utils.sagemaker = mock_sagemaker

    run_labeling_job.handler(
        {
            "ExecutionId": "arn:aws:states:us-east-1:123:execution:sfn:exec-1",
            "RecordSourceToReceiptHandleS3Key": "runs/exec-1/record_source_to_receipt_handle.json",
        },
        None,
    )

    call_args = mock_sagemaker.create_labeling_job.call_args
    ui_config = call_args[1]["HumanTaskConfig"]["UiConfig"]
    assert "HumanTaskUiArn" in ui_config
    assert "394669845002" in ui_config["HumanTaskUiArn"]
    assert "BoundingBox" in ui_config["HumanTaskUiArn"]


def test_region_validation_fails_for_unsupported_region():
    """Lambda raises ValueError at import time for unsupported regions."""
    os.environ["AWS_REGION"] = "af-south-1"  # Not in AC_ARN_MAP
    set_labeling_env("test-bucket")

    import importlib

    with pytest.raises(ValueError, match="not supported"):
        import run_labeling_job
        importlib.reload(run_labeling_job)

    # Cleanup
    os.environ["AWS_REGION"] = "us-east-1"
