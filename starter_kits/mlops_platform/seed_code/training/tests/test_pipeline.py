# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Unit tests for ml_pipelines.training.pipeline."""

from unittest.mock import MagicMock, patch

import pytest
from sagemaker.workflow.pipeline import Pipeline

_REGION = "us-east-1"
_ROLE = "arn:aws:iam::123456789012:role/SageMakerRole"
_BUCKET = "test-artifact-bucket"
_KMS_KEY = "arn:aws:kms:us-east-1:123456789012:key/test-key-id"
_PIPELINE_NAME = "TestTrainingPipeline"

_PIPELINE_MODULE = "ml_pipelines.training.pipeline"


def _make_mock_session():
    session = MagicMock()
    session.sagemaker_config = {}
    session.sagemaker_client.exceptions.ResourceNotFound = type("ResourceNotFound", (Exception,), {})
    session.sagemaker_client.describe_image_version.side_effect = (
        session.sagemaker_client.exceptions.ResourceNotFound()
    )
    return session


def _make_mock_step(name):
    step = MagicMock()
    step.name = name
    return step


def _default_kwargs(**overrides):
    base = dict(
        region=_REGION,
        role=_ROLE,
        default_bucket=_BUCKET,
    )
    base.update(overrides)
    return base


@pytest.fixture()
def _clear_session_cache():
    """Clear the lru_cache on get_pipeline_session before each test."""
    from ml_pipelines.training.pipeline import get_pipeline_session
    get_pipeline_session.cache_clear()
    yield
    get_pipeline_session.cache_clear()


@pytest.fixture()
def _mock_sagemaker():
    """Patch heavy SageMaker classes so get_pipeline runs without real SDK calls."""
    with (
        patch(f"{_PIPELINE_MODULE}.get_pipeline_session") as mock_session,
        patch(f"{_PIPELINE_MODULE}.sagemaker.image_uris.retrieve", return_value="test-image-uri"),
        patch(f"{_PIPELINE_MODULE}.ScriptProcessor") as mock_processor,
        patch(f"{_PIPELINE_MODULE}.Estimator") as mock_estimator,
        patch(f"{_PIPELINE_MODULE}.ProcessingStep") as mock_processing_step,
        patch(f"{_PIPELINE_MODULE}.TrainingStep") as mock_training_step,
        patch(f"{_PIPELINE_MODULE}.RegisterModel") as mock_register,
        patch(f"{_PIPELINE_MODULE}.ConditionStep") as mock_cond_step,
    ):
        mock_session.return_value = _make_mock_session()
        mock_processor.return_value = MagicMock()
        mock_estimator.return_value = MagicMock()

        mock_processing_step.side_effect = lambda **kwargs: _make_mock_step(kwargs["name"])
        mock_training_step.side_effect = lambda **kwargs: _make_mock_step(kwargs["name"])
        mock_register.side_effect = lambda **kwargs: _make_mock_step(kwargs["name"])
        mock_cond_step.side_effect = lambda **kwargs: _make_mock_step(kwargs["name"])

        yield {
            "session": mock_session,
            "processor": mock_processor,
            "estimator": mock_estimator,
            "processing_step": mock_processing_step,
            "training_step": mock_training_step,
            "register": mock_register,
            "cond_step": mock_cond_step,
        }


class TestGetPipelineSession:
    @patch(f"{_PIPELINE_MODULE}.PipelineSession")
    @patch(f"{_PIPELINE_MODULE}.boto3.Session")
    def test_creates_session_with_correct_region(self, mock_boto_session, mock_pipeline_session, _clear_session_cache):
        mock_boto = MagicMock()
        mock_boto_session.return_value = mock_boto

        from ml_pipelines.training.pipeline import get_pipeline_session
        get_pipeline_session(_REGION, _BUCKET)

        mock_boto_session.assert_called_once_with(region_name=_REGION)
        mock_boto.client.assert_called_once_with("sagemaker")
        mock_pipeline_session.assert_called_once_with(
            boto_session=mock_boto,
            sagemaker_client=mock_boto.client.return_value,
            default_bucket=_BUCKET,
        )

    @patch(f"{_PIPELINE_MODULE}.PipelineSession")
    @patch(f"{_PIPELINE_MODULE}.boto3.Session")
    def test_session_is_cached(self, mock_boto_session, mock_pipeline_session, _clear_session_cache):
        mock_boto_session.return_value = MagicMock()

        from ml_pipelines.training.pipeline import get_pipeline_session
        s1 = get_pipeline_session(_REGION, _BUCKET)
        s2 = get_pipeline_session(_REGION, _BUCKET)
        assert s1 is s2
        assert mock_boto_session.call_count == 1


class TestGetPipeline:
    def test_returns_pipeline_instance(self, _mock_sagemaker):
        from ml_pipelines.training.pipeline import get_pipeline
        result = get_pipeline(**_default_kwargs())
        assert isinstance(result, Pipeline)

    def test_pipeline_has_correct_name(self, _mock_sagemaker):
        from ml_pipelines.training.pipeline import get_pipeline
        pipeline = get_pipeline(**_default_kwargs(pipeline_name=_PIPELINE_NAME))
        assert pipeline.name == _PIPELINE_NAME

    def test_pipeline_has_expected_parameters(self, _mock_sagemaker):
        from ml_pipelines.training.pipeline import get_pipeline
        pipeline = get_pipeline(**_default_kwargs())
        param_names = {p.name for p in pipeline.parameters}
        expected = {
            "ProcessingInstanceType",
            "ProcessingInstanceCount",
            "TrainingInstanceType",
            "ModelApprovalStatus",
            "InputDataUrl",
        }
        assert param_names == expected

    def test_pipeline_has_four_steps(self, _mock_sagemaker):
        from ml_pipelines.training.pipeline import get_pipeline
        pipeline = get_pipeline(**_default_kwargs())
        assert len(pipeline.steps) == 4

    def test_pipeline_step_names(self, _mock_sagemaker):
        from ml_pipelines.training.pipeline import get_pipeline
        pipeline = get_pipeline(**_default_kwargs())
        step_names = [s.name for s in pipeline.steps]
        assert "PreprocessAbaloneData" in step_names
        assert "TrainAbaloneModel" in step_names
        assert "EvaluateAbaloneModel" in step_names
        assert "CheckMSEAbaloneEvaluation" in step_names

    def test_kms_key_passed_to_processors(self, _mock_sagemaker):
        from ml_pipelines.training.pipeline import get_pipeline
        get_pipeline(**_default_kwargs(bucket_kms_id=_KMS_KEY))
        for call in _mock_sagemaker["processor"].call_args_list:
            assert call[1]["output_kms_key"] == _KMS_KEY

    def test_kms_key_passed_to_estimator(self, _mock_sagemaker):
        from ml_pipelines.training.pipeline import get_pipeline
        get_pipeline(**_default_kwargs(bucket_kms_id=_KMS_KEY))
        call_kwargs = _mock_sagemaker["estimator"].call_args[1]
        assert call_kwargs["output_kms_key"] == _KMS_KEY
