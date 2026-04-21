"""Tests for _utils.py shared helpers."""

import json
import pytest
from moto import mock_aws
import boto3

from conftest import set_labeling_env


@mock_aws
def test_upload_json_to_s3(aws_credentials):
    """upload_json_to_s3 writes JSON to S3 and returns the key."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    set_labeling_env("test-bucket")
    import _utils

    # Re-create client inside mock context
    _utils.s3 = boto3.client("s3", region_name="us-east-1")

    data = {"key1": "value1", "key2": "value2"}
    key = _utils.upload_json_to_s3(data, "test-bucket", "prefix", "test.json")

    assert key == "prefix/test.json"
    response = s3.get_object(Bucket="test-bucket", Key=key)
    body = json.loads(response["Body"].read().decode("utf-8"))
    assert body == data


@mock_aws
def test_download_json_dict_from_s3(aws_credentials):
    """download_json_dict_from_s3 reads and parses JSON from S3."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")
    data = {"source1": "handle1", "source2": "handle2"}
    s3.put_object(Bucket="test-bucket", Key="test.json", Body=json.dumps(data))

    set_labeling_env("test-bucket")
    import _utils

    _utils.s3 = boto3.client("s3", region_name="us-east-1")

    result = _utils.download_json_dict_from_s3("test.json", "test-bucket")
    assert result == data


@mock_aws
def test_download_json_dict_from_s3_non_dict_raises(aws_credentials):
    """download_json_dict_from_s3 raises ValueError for non-dict JSON."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")
    s3.put_object(Bucket="test-bucket", Key="test.json", Body=json.dumps([1, 2, 3]))

    set_labeling_env("test-bucket")
    import _utils

    _utils.s3 = boto3.client("s3", region_name="us-east-1")

    with pytest.raises(ValueError, match="not a dictionary"):
        _utils.download_json_dict_from_s3("test.json", "test-bucket")


@mock_aws
def test_get_s3_string_object_from_uri(aws_credentials):
    """get_s3_string_object_from_uri reads a string from an S3 URI."""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")
    s3.put_object(Bucket="test-bucket", Key="path/to/file.txt", Body="hello world")

    set_labeling_env("test-bucket")
    import _utils

    _utils.s3 = boto3.client("s3", region_name="us-east-1")

    result = _utils.get_s3_string_object_from_uri("s3://test-bucket/path/to/file.txt")
    assert result == "hello world"


def test_create_labeling_job_with_human_task_ui_arn(aws_credentials):
    """create_labeling_job passes HumanTaskUiArn in UiConfig when provided."""
    from unittest.mock import MagicMock

    set_labeling_env("test-bucket")
    import _utils

    mock_sagemaker = MagicMock()
    _utils.sagemaker = mock_sagemaker

    _utils.create_labeling_job(
        human_task_config={"NumberOfHumanWorkersPerDataObject": 1},
        prehuman_arn="arn:aws:lambda:us-east-1:432418664414:function:PRE-BoundingBox",
        acs_arn="arn:aws:lambda:us-east-1:432418664414:function:ACS-BoundingBox",
        task_title="Test",
        task_description="Test desc",
        task_keywords=["test"],
        workteam_arn="arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/team",
        task_price={},
        manifest_uri="s3://bucket/manifest.json",
        output_uri="s3://bucket/output/",
        job_name="test-job",
        ground_truth_role_arn="arn:aws:iam::123456789012:role/role",
        label_attribute_name="label",
        label_categories_s3_uri="s3://bucket/categories.json",
        human_task_ui_arn="arn:aws:sagemaker:us-east-1:394669845002:human-task-ui/BoundingBox",
    )

    mock_sagemaker.create_labeling_job.assert_called_once()
    call_kwargs = mock_sagemaker.create_labeling_job.call_args[1]
    assert call_kwargs["HumanTaskConfig"]["UiConfig"]["HumanTaskUiArn"] == \
        "arn:aws:sagemaker:us-east-1:394669845002:human-task-ui/BoundingBox"
    assert call_kwargs["HumanTaskConfig"]["PreHumanTaskLambdaArn"] == \
        "arn:aws:lambda:us-east-1:432418664414:function:PRE-BoundingBox"
    assert call_kwargs["HumanTaskConfig"]["WorkteamArn"] == \
        "arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/team"


def test_create_labeling_job_with_template_s3_uri(aws_credentials):
    """create_labeling_job passes UiTemplateS3Uri when instructions_template_s3_uri is provided."""
    from unittest.mock import MagicMock

    set_labeling_env("test-bucket")
    import _utils

    mock_sagemaker = MagicMock()
    _utils.sagemaker = mock_sagemaker

    _utils.create_labeling_job(
        human_task_config={"NumberOfHumanWorkersPerDataObject": 1},
        prehuman_arn="arn:pre",
        acs_arn="arn:acs",
        task_title="Test",
        task_description="Desc",
        task_keywords=["test"],
        workteam_arn="arn:workteam",
        task_price={},
        manifest_uri="s3://bucket/manifest.json",
        output_uri="s3://bucket/output/",
        job_name="test-job",
        ground_truth_role_arn="arn:role",
        label_attribute_name="label",
        label_categories_s3_uri="s3://bucket/categories.json",
        instructions_template_s3_uri="s3://templates/custom.liquid.html",
    )

    call_kwargs = mock_sagemaker.create_labeling_job.call_args[1]
    assert call_kwargs["HumanTaskConfig"]["UiConfig"]["UiTemplateS3Uri"] == "s3://templates/custom.liquid.html"
    assert "HumanTaskUiArn" not in call_kwargs["HumanTaskConfig"]["UiConfig"]


def test_create_labeling_job_no_ui_raises(aws_credentials):
    """create_labeling_job raises ValueError when neither UI option is provided."""
    set_labeling_env("test-bucket")
    import _utils

    with pytest.raises(ValueError, match="Either human_task_ui_arn or instructions_template_s3_uri"):
        _utils.create_labeling_job(
            human_task_config={},
            prehuman_arn="arn:pre",
            acs_arn="arn:acs",
            task_title="Test",
            task_description="Desc",
            task_keywords=[],
            workteam_arn="arn:workteam",
            task_price={},
            manifest_uri="s3://m",
            output_uri="s3://o",
            job_name="j",
            ground_truth_role_arn="arn:r",
            label_attribute_name="l",
            label_categories_s3_uri="s3://c",
        )


def test_create_labeling_job_with_task_price(aws_credentials):
    """create_labeling_job includes PublicWorkforceTaskPrice when task_price is non-empty."""
    from unittest.mock import MagicMock

    set_labeling_env("test-bucket")
    import _utils

    mock_sagemaker = MagicMock()
    _utils.sagemaker = mock_sagemaker

    price = {"AmountInUsd": {"Dollars": 0, "Cents": 3, "TenthFractionsOfACent": 6}}
    _utils.create_labeling_job(
        human_task_config={"NumberOfHumanWorkersPerDataObject": 1},
        prehuman_arn="arn:pre",
        acs_arn="arn:acs",
        task_title="Test",
        task_description="Desc",
        task_keywords=["test"],
        workteam_arn="arn:workteam",
        task_price=price,
        manifest_uri="s3://m",
        output_uri="s3://o",
        job_name="j",
        ground_truth_role_arn="arn:r",
        label_attribute_name="l",
        label_categories_s3_uri="s3://c",
        human_task_ui_arn="arn:ui",
    )

    call_kwargs = mock_sagemaker.create_labeling_job.call_args[1]
    assert call_kwargs["HumanTaskConfig"]["PublicWorkforceTaskPrice"] == price


def test_create_labeling_job_does_not_mutate_input(aws_credentials):
    """create_labeling_job does not mutate the input human_task_config dict."""
    from unittest.mock import MagicMock

    set_labeling_env("test-bucket")
    import _utils

    mock_sagemaker = MagicMock()
    _utils.sagemaker = mock_sagemaker

    original = {"NumberOfHumanWorkersPerDataObject": 1}
    original_copy = original.copy()

    _utils.create_labeling_job(
        human_task_config=original,
        prehuman_arn="arn:pre",
        acs_arn="arn:acs",
        task_title="Test",
        task_description="Desc",
        task_keywords=[],
        workteam_arn="arn:wt",
        task_price={},
        manifest_uri="s3://m",
        output_uri="s3://o",
        job_name="j",
        ground_truth_role_arn="arn:r",
        label_attribute_name="l",
        label_categories_s3_uri="s3://c",
        human_task_ui_arn="arn:ui",
    )

    assert original == original_copy
