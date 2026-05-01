# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Example workflow pipeline script for abalone pipeline.

                                               . -RegisterModel
                                              .
    Process-> Train -> Evaluate -> Condition .
                                              .
                                               . -(stop)

Implements a get_pipeline(**kwargs) method.
"""

import json
import logging
import os
from functools import lru_cache
from typing import Optional

import boto3
import sagemaker
from sagemaker.estimator import Estimator
from sagemaker.inputs import TrainingInput
from sagemaker.model_metrics import MetricsSource, ModelMetrics
from sagemaker.network import NetworkConfig
from sagemaker.processing import ProcessingInput, ProcessingOutput, ScriptProcessor
from sagemaker.workflow.condition_step import ConditionStep
from sagemaker.workflow.conditions import ConditionLessThanOrEqualTo
from sagemaker.workflow.functions import JsonGet
from sagemaker.workflow.parameters import ParameterInteger, ParameterString
from sagemaker.workflow.pipeline import Pipeline
from sagemaker.workflow.pipeline_context import PipelineSession
from sagemaker.workflow.properties import PropertyFile
from sagemaker.workflow.step_collections import RegisterModel
from sagemaker.workflow.steps import ProcessingStep, TrainingStep

logger = logging.getLogger(__name__)

DEFAULT_INSTANCE_TYPE = "ml.m5.xlarge"
CSV_CONTENT_TYPE = "text/csv"


@lru_cache(maxsize=1)
def get_pipeline_session(region: str, default_bucket: Optional[str]) -> PipelineSession:
    """Creates a SageMaker PipelineSession for deferred pipeline execution.

    Args:
        region: AWS region for the SageMaker session.
        default_bucket: S3 bucket for storing pipeline artifacts.

    Returns:
        A PipelineSession instance.
    """
    boto_session = boto3.Session(region_name=region)
    sagemaker_client = boto_session.client("sagemaker")

    return PipelineSession(
        boto_session=boto_session,
        sagemaker_client=sagemaker_client,
        default_bucket=default_bucket,
    )


def _resolve_image_uri(
    sagemaker_session: PipelineSession,
    image_name: str,
    region: str,
) -> str:
    """Resolves a SageMaker image URI, falling back to the default XGBoost image."""
    try:
        return sagemaker_session.sagemaker_client.describe_image_version(
            ImageName=image_name
        )["ContainerImage"]
    except sagemaker_session.sagemaker_client.exceptions.ResourceNotFound:
        return sagemaker.image_uris.retrieve(
            framework="xgboost",
            region=region,
            version="1.0-1",
            py_version="py3",
            instance_type=DEFAULT_INSTANCE_TYPE,
        )


def get_pipeline(
    region: str,
    role: str,
    default_bucket: Optional[str] = None,
    bucket_kms_id: Optional[str] = None,
    model_package_group_name: str = "AbalonePackageGroup",
    pipeline_name: str = "AbalonePipeline",
    base_job_prefix: str = "Abalone",
    project_id: str = "SageMakerProjectId",
    input_data_url: Optional[str] = None,
    enable_network_isolation: Optional[bool] = None,
    encrypt_inter_container_traffic: Optional[bool] = None,
    subnet_ids: Optional[list[str]] = None,
    security_group_ids: Optional[list[str]] = None,
) -> Pipeline:
    """Gets a SageMaker ML Pipeline instance working with on abalone data.

    Args:
        region: AWS region to create and run the pipeline.
        role: IAM role to create and run steps and pipeline.
        default_bucket: the bucket to use for storing the artifacts
        bucket_kms_id: Optional KMS key ID for encrypting pipeline outputs.
        model_package_group_name: Name of the model package group.
        pipeline_name: Name of the SageMaker pipeline.
        base_job_prefix: Prefix for SageMaker job names.
        project_id: SageMaker project ID for image name resolution.
        input_data_url: S3 URI for the training dataset. Defaults to
            s3://<default_bucket>/dataset/abalone-dataset.csv, which is uploaded
            during mdaa deploy via CDK BucketDeployment from the data/ directory.
            Can also be overridden at pipeline execution time via the InputDataUrl parameter.
        enable_network_isolation: Whether to enable network isolation. Falls back to
            ENABLE_NETWORK_ISOLATION env var (default true).
        encrypt_inter_container_traffic: Whether to encrypt inter-container traffic. Falls back to
            ENCRYPT_INTER_CONTAINER_TRAFFIC env var (default true).
        subnet_ids: VPC subnet IDs. Falls back to SUBNET_IDS env var.
        security_group_ids: VPC security group IDs. Falls back to SECURITY_GROUP_IDS env var.

    Returns:
        an instance of a pipeline
    """
    if enable_network_isolation is None:
        enable_network_isolation = os.getenv("ENABLE_NETWORK_ISOLATION", "true").lower() == "true"
    if encrypt_inter_container_traffic is None:
        encrypt_inter_container_traffic = os.getenv("ENCRYPT_INTER_CONTAINER_TRAFFIC", "true").lower() == "true"
    if subnet_ids is None:
        subnet_ids = json.loads(os.getenv("SUBNET_IDS", "[]"))
    if security_group_ids is None:
        security_group_ids = json.loads(os.getenv("SECURITY_GROUP_IDS", "[]"))

    sagemaker_session = get_pipeline_session(region, default_bucket)

    network_config = NetworkConfig(
        subnets=subnet_ids if subnet_ids else None,
        security_group_ids=security_group_ids if security_group_ids else None,
        enable_network_isolation=enable_network_isolation,
        encrypt_inter_container_traffic=encrypt_inter_container_traffic,
    )
    # network config without network isolation to allow S3 access for preprocessor
    network_config_without_isolation = NetworkConfig(
        subnets=subnet_ids if subnet_ids else None,
        security_group_ids=security_group_ids if security_group_ids else None,
        enable_network_isolation=False,
        encrypt_inter_container_traffic=encrypt_inter_container_traffic,
    )

    default_input_data = input_data_url or f"s3://{default_bucket}/dataset/abalone-dataset.csv"

    # parameters for pipeline execution
    processing_instance_count = ParameterInteger(name="ProcessingInstanceCount", default_value=1)
    processing_instance_type = ParameterString(name="ProcessingInstanceType", default_value=DEFAULT_INSTANCE_TYPE)
    training_instance_type = ParameterString(name="TrainingInstanceType", default_value=DEFAULT_INSTANCE_TYPE)
    model_approval_status = ParameterString(name="ModelApprovalStatus", default_value="PendingManualApproval")
    input_data = ParameterString(name="InputDataUrl", default_value=default_input_data)
    processing_image_name = f"sagemaker-{project_id}-processingimagebuild"
    training_image_name = f"sagemaker-{project_id}-trainingimagebuild"
    inference_image_name = f"sagemaker-{project_id}-inferenceimagebuild"

    # processing step for feature engineering
    processing_image_uri = _resolve_image_uri(sagemaker_session, processing_image_name, region)
    script_processor = ScriptProcessor(
        image_uri=processing_image_uri,
        instance_type=processing_instance_type,
        instance_count=processing_instance_count,
        base_job_name=f"{base_job_prefix}/sklearn-abalone-preprocess",
        command=["python3"],
        sagemaker_session=sagemaker_session,
        role=role,
        output_kms_key=bucket_kms_id,
        network_config=network_config_without_isolation,
    )
    step_process = ProcessingStep(
        name="PreprocessAbaloneData",
        processor=script_processor,
        inputs=[
            ProcessingInput(
                source=input_data,
                destination="/opt/ml/processing/input/data",
                input_name="input-data",
            ),
        ],
        outputs=[
            ProcessingOutput(output_name="train", source="/opt/ml/processing/train"),
            ProcessingOutput(output_name="validation", source="/opt/ml/processing/validation"),
            ProcessingOutput(output_name="test", source="/opt/ml/processing/test"),
        ],
        code="source_scripts/preprocessing.py",
    )

    # training step for generating model artifacts
    model_path = f"s3://{default_bucket}/{base_job_prefix}/AbaloneTrain"

    training_image_uri = _resolve_image_uri(sagemaker_session, training_image_name, region)

    xgb_train = Estimator(
        image_uri=training_image_uri,
        instance_type=training_instance_type,
        instance_count=1,
        output_path=model_path,
        base_job_name=f"{base_job_prefix}/abalone-train",
        sagemaker_session=sagemaker_session,
        role=role,
        output_kms_key=bucket_kms_id,
        subnets=subnet_ids if subnet_ids else None,
        security_group_ids=security_group_ids if security_group_ids else None,
        enable_network_isolation=enable_network_isolation,
        encrypt_inter_container_traffic=encrypt_inter_container_traffic,
    )
    xgb_train.set_hyperparameters(
        objective="reg:squarederror",
        num_round=50,
        max_depth=5,
        eta=0.2,
        gamma=4,
        min_child_weight=6,
        subsample=0.7,
        verbosity=1,
    )
    step_train = TrainingStep(
        name="TrainAbaloneModel",
        estimator=xgb_train,
        inputs={
            "train": TrainingInput(
                s3_data=step_process.properties.ProcessingOutputConfig.Outputs["train"].S3Output.S3Uri,
                content_type=CSV_CONTENT_TYPE,
            ),
            "validation": TrainingInput(
                s3_data=step_process.properties.ProcessingOutputConfig.Outputs["validation"].S3Output.S3Uri,
                content_type=CSV_CONTENT_TYPE,
            ),
        },
    )

    # processing step for evaluation
    script_eval = ScriptProcessor(
        image_uri=training_image_uri,
        command=["python3"],
        instance_type=processing_instance_type,
        instance_count=1,
        base_job_name=f"{base_job_prefix}/script-abalone-eval",
        sagemaker_session=sagemaker_session,
        role=role,
        output_kms_key=bucket_kms_id,
        network_config=network_config,
    )
    evaluation_report = PropertyFile(
        name="AbaloneEvaluationReport",
        output_name="evaluation",
        path="evaluation.json",
    )
    step_eval = ProcessingStep(
        name="EvaluateAbaloneModel",
        processor=script_eval,
        inputs=[
            ProcessingInput(
                source=step_train.properties.ModelArtifacts.S3ModelArtifacts,
                destination="/opt/ml/processing/model",
            ),
            ProcessingInput(
                source=step_process.properties.ProcessingOutputConfig.Outputs["test"].S3Output.S3Uri,
                destination="/opt/ml/processing/test",
            ),
        ],
        outputs=[
            ProcessingOutput(output_name="evaluation", source="/opt/ml/processing/evaluation"),
        ],
        code="source_scripts/evaluate.py",
        property_files=[evaluation_report],
    )

    # register model step that will be conditionally executed
    model_metrics = ModelMetrics(
        model_statistics=MetricsSource(
            s3_uri=f"{step_eval.arguments['ProcessingOutputConfig']['Outputs'][0]['S3Output']['S3Uri']}/evaluation.json",
            content_type="application/json",
        )
    )

    inference_image_uri = _resolve_image_uri(sagemaker_session, inference_image_name, region)
    step_register = RegisterModel(
        name="RegisterAbaloneModel",
        estimator=xgb_train,
        image_uri=inference_image_uri,
        model_data=step_train.properties.ModelArtifacts.S3ModelArtifacts,
        content_types=[CSV_CONTENT_TYPE],
        response_types=[CSV_CONTENT_TYPE],
        inference_instances=["ml.m5.large"],
        transform_instances=["ml.m5.large"],
        model_package_group_name=model_package_group_name,
        approval_status=model_approval_status,
        model_metrics=model_metrics,
    )

    # condition step for evaluating model quality and branching execution
    cond_lte = ConditionLessThanOrEqualTo(
        left=JsonGet(
            step_name=step_eval.name,
            property_file=evaluation_report,
            json_path="regression_metrics.mse.value",
        ),
        right=6.0,
    )
    step_cond = ConditionStep(
        name="CheckMSEAbaloneEvaluation",
        conditions=[cond_lte],
        if_steps=[step_register],
        else_steps=[],
    )

    # pipeline instance
    pipeline = Pipeline(
        name=pipeline_name,
        parameters=[
            processing_instance_type,
            processing_instance_count,
            training_instance_type,
            model_approval_status,
            input_data,
        ],
        steps=[step_process, step_train, step_eval, step_cond],
        sagemaker_session=sagemaker_session,
    )
    return pipeline
