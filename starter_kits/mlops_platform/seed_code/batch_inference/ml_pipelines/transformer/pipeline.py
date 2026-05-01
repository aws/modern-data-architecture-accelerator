# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging

import boto3
import sagemaker
import sagemaker.session
from sagemaker import ModelPackage
from sagemaker.inputs import TransformInput
from sagemaker.network import NetworkConfig
from sagemaker.processing import ProcessingInput, ProcessingOutput
from sagemaker.sklearn.processing import SKLearnProcessor
from sagemaker.transformer import Transformer
from sagemaker.workflow.execution_variables import ExecutionVariables
from sagemaker.workflow.functions import Join
from sagemaker.workflow.model_step import ModelStep
from sagemaker.workflow.parameters import ParameterInteger, ParameterString
from sagemaker.workflow.pipeline import Pipeline
from sagemaker.workflow.pipeline_context import PipelineSession
from sagemaker.workflow.retry import (
    SageMakerJobExceptionTypeEnum,
    SageMakerJobStepRetryPolicy,
    StepExceptionTypeEnum,
    StepRetryPolicy,
)
from sagemaker.workflow.steps import ProcessingStep, TransformStep

logger = logging.getLogger(__name__)


def get_pipeline_session(region_name: str, default_bucket_name: str) -> PipelineSession:
    """Creates a SageMaker PipelineSession for deferred pipeline execution.

    Args:
        region_name: AWS region for the SageMaker session.
        default_bucket_name: S3 bucket for storing pipeline artifacts.

    Returns:
        A PipelineSession instance.
    """
    boto_session = boto3.Session(region_name=region_name)
    sagemaker_client = boto_session.client("sagemaker")

    return PipelineSession(
        boto_session=boto_session,
        sagemaker_client=sagemaker_client,
        default_bucket=default_bucket_name,
    )


def get_pipeline(
    region: str,
    role_arn: str,
    artifact_bucket: str,
    pipeline_name: str,
    base_job_prefix: str,
    model_package_arn: str,
    bucket_kms_id: str | None = None,
    enable_network_isolation: bool = False,
    encrypt_inter_container_traffic: bool = True,
    subnet_ids: list[str] | None = None,
    security_group_ids: list[str] | None = None,
) -> Pipeline:
    """Creates a SageMaker batch inference pipeline: CreateModel → Preprocess → Transform.

    Retrieves a registered model from the Model Registry, runs SKLearn preprocessing
    on the input data, then executes a batch transform job.

    Args:
        region: AWS region to create and run the pipeline.
        role_arn: IAM role ARN for pipeline execution.
        artifact_bucket: S3 bucket for storing pipeline artifacts.
        pipeline_name: Name of the SageMaker pipeline.
        base_job_prefix: Prefix for SageMaker job names.
        model_package_arn: ARN of the approved model package from the Model Registry.
        bucket_kms_id: Optional KMS key ID for encrypting pipeline outputs.
        enable_network_isolation: Whether to enable network isolation for SageMaker containers.
        encrypt_inter_container_traffic: Whether to encrypt inter-container traffic.
        subnet_ids: VPC subnet IDs for running SageMaker jobs.
        security_group_ids: VPC security group IDs for running SageMaker jobs.

    Returns:
        A SageMaker Pipeline instance ready for upsert and execution.
    """
    pipeline_session = get_pipeline_session(region, artifact_bucket)

    network_config = NetworkConfig(
        subnets=subnet_ids if subnet_ids else None,
        security_group_ids=security_group_ids if security_group_ids else None,
        enable_network_isolation=enable_network_isolation,
        encrypt_inter_container_traffic=encrypt_inter_container_traffic,
    )

    ############################################
    # Pipeline Parameters for pipeline execution
    ############################################
    processing_instance_type = ParameterString(name="ProcessingInstanceType", default_value="ml.m5.large")
    processing_instance_count = ParameterInteger(name="ProcessingInstanceCount", default_value=1)
    transform_instance_type = ParameterString(name="TransformInstanceType", default_value="ml.m5.large")
    transform_instance_count = ParameterInteger(name="TransformInstanceCount", default_value=1)
    max_concurrent_transforms = ParameterInteger(name="MaxConcurrentTransforms", default_value=64)

    # Default input data uses the pipeline's own artifact bucket.
    # When networkIsolation=true, SageMaker can only access buckets the execution role has permissions for.
    input_data = ParameterString(
        name="InputDataUrl",
        default_value=f"s3://{artifact_bucket}/dataset/abalone-dataset.csv",
    )

    outputs_bucket = ParameterString(name="OutputsBucketName", default_value=artifact_bucket)

    # Retry policies
    # https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-retry-policy.html
    retry_policies = [
        # override the default
        StepRetryPolicy(
            exception_types=[StepExceptionTypeEnum.SERVICE_FAULT, StepExceptionTypeEnum.THROTTLING],
            max_attempts=3,
            interval_seconds=10,
            backoff_rate=2.0,
        ),
        # retry when resource limit quota gets exceeded
        SageMakerJobStepRetryPolicy(
            exception_types=[SageMakerJobExceptionTypeEnum.RESOURCE_LIMIT],
            max_attempts=3,
            interval_seconds=60,
            backoff_rate=2.0,
        ),
        # retry when job failed due to transient error or EC2 ICE.
        SageMakerJobStepRetryPolicy(
            failure_reason_types=[
                SageMakerJobExceptionTypeEnum.INTERNAL_ERROR,
                SageMakerJobExceptionTypeEnum.CAPACITY_ERROR,
            ],
            max_attempts=3,
            interval_seconds=30,
            backoff_rate=2.0,
        ),
    ]

    ############################################
    # Pipeline Steps definition
    ############################################

    # Create a model from latest model package in SM Model Registry
    model_package = ModelPackage(
        role=role_arn,
        model_package_arn=model_package_arn,
        sagemaker_session=pipeline_session,
        vpc_config={
            "Subnets": subnet_ids,
            "SecurityGroupIds": security_group_ids,
        } if subnet_ids and security_group_ids else None,
    )

    step_create_model = ModelStep(
        name="CreateModel",
        step_args=model_package.create(instance_type=transform_instance_type),
    )

    # Processing step for feature engineering
    sklearn_processor = SKLearnProcessor(
        framework_version="1.2-1",
        instance_type=processing_instance_type,
        instance_count=processing_instance_count,
        base_job_name=f"{base_job_prefix}/sklearn-abalone-preprocess",
        sagemaker_session=pipeline_session,
        role=role_arn,
        network_config=network_config,
        output_kms_key=bucket_kms_id,
    )
    step_process = ProcessingStep(
        name="PreprocessData",
        processor=sklearn_processor,
        inputs=[
            ProcessingInput(
                source=input_data,
                destination="/opt/ml/processing/input/data",
                input_name="input-data",
            ),
        ],
        outputs=[
            ProcessingOutput(output_name="output_data", source="/opt/ml/processing/output_data"),
        ],
        code="source_scripts/preprocessing.py",
        job_arguments=[
            "--do-train-test-split",
            "False",
        ],
    )

    # Define qgen transformer and TransformStep
    output_transform = Join(
        on="/", values=["s3:/", outputs_bucket, base_job_prefix, ExecutionVariables.PIPELINE_EXECUTION_ID, "batch/"]
    )

    transformer = Transformer(
        model_name=step_create_model.properties.ModelName,
        instance_count=transform_instance_count,
        instance_type=transform_instance_type,
        max_concurrent_transforms=max_concurrent_transforms,
        max_payload=1,
        strategy="SingleRecord",
        assemble_with="Line",
        output_path=output_transform,
        output_kms_key=bucket_kms_id,
        volume_kms_key=bucket_kms_id,
    )

    input_path_transform_step = step_process.properties.ProcessingOutputConfig.Outputs["output_data"].S3Output.S3Uri

    step_transformer = TransformStep(
        name="Transformer",
        transformer=transformer,
        inputs=TransformInput(data=input_path_transform_step, content_type="text/csv", split_type="Line"),
        retry_policies=retry_policies,
        # cache_config=cache_config
    )

    ############################################
    # Pipeline Definition
    ############################################
    pipeline = Pipeline(
        sagemaker_session=pipeline_session,
        name=pipeline_name,
        parameters=[
            input_data,
            outputs_bucket,
            transform_instance_count,
            transform_instance_type,
            processing_instance_count,
            processing_instance_type,
            max_concurrent_transforms,
        ],
        steps=[
            step_create_model,
            step_process,
            step_transformer,
        ],
    )
    return pipeline
