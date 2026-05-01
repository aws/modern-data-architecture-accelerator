# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Unit tests for ml_pipelines.transformer.pipeline."""

from unittest.mock import MagicMock, patch

import pytest
from sagemaker.workflow.pipeline import Pipeline

from ml_pipelines.transformer.pipeline import get_pipeline, get_pipeline_session


_REGION = "us-east-1"
_ROLE_ARN = "arn:aws:iam::123456789012:role/SageMakerRole"
_BUCKET = "test-artifact-bucket"
_PIPELINE_NAME = "test-batch-pipeline"
_BASE_JOB_PREFIX = "TestBatch"
_MODEL_PACKAGE_ARN = "arn:aws:sagemaker:us-east-1:123456789012:model-package/test-group/1"
_KMS_KEY = "arn:aws:kms:us-east-1:123456789012:key/test-key-id"
_SUBNET_IDS = ["subnet-abc123"]
_SG_IDS = ["sg-abc123"]

_PIPELINE_MODULE = "ml_pipelines.transformer.pipeline"


def _make_mock_pipeline_session():
    session = MagicMock()
    session.sagemaker_config = {}
    return session


def _default_kwargs(**overrides):
    base = dict(
        region=_REGION,
        role_arn=_ROLE_ARN,
        artifact_bucket=_BUCKET,
        pipeline_name=_PIPELINE_NAME,
        base_job_prefix=_BASE_JOB_PREFIX,
        model_package_arn=_MODEL_PACKAGE_ARN,
    )
    base.update(overrides)
    return base


@pytest.fixture()
def _mock_sagemaker():
    """Patch heavy SageMaker classes so get_pipeline runs without real SDK calls."""
    with (
        patch(f"{_PIPELINE_MODULE}.get_pipeline_session") as mock_session,
        patch(f"{_PIPELINE_MODULE}.ModelPackage") as mock_model_pkg,
        patch(f"{_PIPELINE_MODULE}.ModelStep") as mock_model_step,
        patch(f"{_PIPELINE_MODULE}.SKLearnProcessor") as mock_processor,
        patch(f"{_PIPELINE_MODULE}.Transformer") as mock_transformer,
        patch(f"{_PIPELINE_MODULE}.NetworkConfig") as mock_network_config,
    ):
        mock_session.return_value = _make_mock_pipeline_session()
        mock_model_pkg.return_value = MagicMock()
        mock_model_step.return_value = MagicMock(name="CreateModel")
        mock_model_step.return_value.name = "CreateModel"
        mock_processor.return_value = MagicMock()
        mock_transformer.return_value = MagicMock()
        mock_network_config.return_value = MagicMock()

        yield {
            "session": mock_session,
            "model_package": mock_model_pkg,
            "model_step": mock_model_step,
            "processor": mock_processor,
            "transformer": mock_transformer,
            "network_config": mock_network_config,
        }


class TestGetPipelineSession:
    @patch(f"{_PIPELINE_MODULE}.PipelineSession")
    @patch(f"{_PIPELINE_MODULE}.boto3.Session")
    def test_creates_session_with_correct_region(self, mock_boto_session, mock_pipeline_session):
        mock_boto = MagicMock()
        mock_boto_session.return_value = mock_boto

        get_pipeline_session(_REGION, _BUCKET)

        mock_boto_session.assert_called_once_with(region_name=_REGION)
        mock_boto.client.assert_called_once_with("sagemaker")
        mock_pipeline_session.assert_called_once_with(
            boto_session=mock_boto,
            sagemaker_client=mock_boto.client.return_value,
            default_bucket=_BUCKET,
        )


class TestGetPipeline:
    def test_returns_pipeline_instance(self, _mock_sagemaker):
        result = get_pipeline(**_default_kwargs())
        assert isinstance(result, Pipeline)

    def test_pipeline_has_correct_name(self, _mock_sagemaker):
        pipeline = get_pipeline(**_default_kwargs())
        assert pipeline.name == _PIPELINE_NAME

    def test_pipeline_has_expected_parameters(self, _mock_sagemaker):
        pipeline = get_pipeline(**_default_kwargs())
        param_names = {p.name for p in pipeline.parameters}
        expected = {
            "InputDataUrl",
            "OutputsBucketName",
            "TransformInstanceCount",
            "TransformInstanceType",
            "ProcessingInstanceCount",
            "ProcessingInstanceType",
            "MaxConcurrentTransforms",
        }
        assert param_names == expected

    def test_pipeline_has_three_steps(self, _mock_sagemaker):
        pipeline = get_pipeline(**_default_kwargs())
        assert len(pipeline.steps) == 3

    def test_vpc_config_passed_to_model_package(self, _mock_sagemaker):
        get_pipeline(**_default_kwargs(subnet_ids=_SUBNET_IDS, security_group_ids=_SG_IDS))
        call_kwargs = _mock_sagemaker["model_package"].call_args[1]
        assert call_kwargs["vpc_config"] == {
            "Subnets": _SUBNET_IDS,
            "SecurityGroupIds": _SG_IDS,
        }

    def test_vpc_config_none_when_no_subnets(self, _mock_sagemaker):
        get_pipeline(**_default_kwargs())
        call_kwargs = _mock_sagemaker["model_package"].call_args[1]
        assert call_kwargs["vpc_config"] is None

    def test_kms_key_passed_to_transformer(self, _mock_sagemaker):
        get_pipeline(**_default_kwargs(bucket_kms_id=_KMS_KEY))
        call_kwargs = _mock_sagemaker["transformer"].call_args[1]
        assert call_kwargs["output_kms_key"] == _KMS_KEY
        assert call_kwargs["volume_kms_key"] == _KMS_KEY

    def test_kms_key_passed_to_processor(self, _mock_sagemaker):
        get_pipeline(**_default_kwargs(bucket_kms_id=_KMS_KEY))
        call_kwargs = _mock_sagemaker["processor"].call_args[1]
        assert call_kwargs["output_kms_key"] == _KMS_KEY

    def test_network_config_receives_all_params(self, _mock_sagemaker):
        get_pipeline(**_default_kwargs(
            enable_network_isolation=True,
            encrypt_inter_container_traffic=True,
            subnet_ids=_SUBNET_IDS,
            security_group_ids=_SG_IDS,
        ))
        _mock_sagemaker["network_config"].assert_called_once_with(
            subnets=_SUBNET_IDS,
            security_group_ids=_SG_IDS,
            enable_network_isolation=True,
            encrypt_inter_container_traffic=True,
        )

    def test_network_config_passed_to_processor(self, _mock_sagemaker):
        get_pipeline(**_default_kwargs())
        call_kwargs = _mock_sagemaker["processor"].call_args[1]
        assert call_kwargs["network_config"] is _mock_sagemaker["network_config"].return_value
