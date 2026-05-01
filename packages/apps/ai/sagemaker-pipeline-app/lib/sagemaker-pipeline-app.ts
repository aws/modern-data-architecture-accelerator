/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SageMakerPipelineConfigParser } from './sagemaker-pipeline-config';
import {
  SageMakerPipelineL3Construct,
  SageMakerPipelineL3ConstructProps,
  PIPELINE_ROLE_PLACEHOLDER,
  PIPELINE_KMS_PLACEHOLDER,
} from '@aws-mdaa/sagemaker-model-training-l3-construct';
import { buildPipelineSteps } from './pipeline-step-builder';

/**
 * SageMaker Pipeline App — creates a SageMaker Pipeline via CfnPipeline.
 *
 * This app defines the ML pipeline (preprocessing, training, evaluation,
 * model registration) entirely in CDK/CloudFormation, with full MDAA compliance.
 *
 * Unlike the CodeBuild-based SageMakerModelTrainingApp which delegates pipeline
 * creation to seed code, this app creates the SageMaker Pipeline definition
 * directly as a CloudFormation resource.
 *
 * Creates:
 * - CfnPipeline with pipeline definition JSON
 * - Pipeline execution role (MdaaRole)
 * - KMS key for artifact encryption (MdaaKmsKey)
 * - S3 bucket for model artifacts (MdaaBucket)
 * - Model Package Group (optional)
 *
 * Exports via SSM:
 * - pipeline-name, pipeline-arn, execution-role-arn, model-bucket-name, kms-key-id
 * - model-package-group-name, model-package-group-arn (if configured)
 */
export class SageMakerPipelineApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const config = new SageMakerPipelineConfigParser(stack, parserProps);

    // Build steps with placeholder values for roleArn and kmsKeyId.
    // The L3 construct resolves these via CloudFormation Fn::Sub after creating
    // the actual execution role and KMS key.
    const pipelineSteps = buildPipelineSteps(
      config.pipeline.steps,
      PIPELINE_ROLE_PLACEHOLDER,
      PIPELINE_KMS_PLACEHOLDER,
      config.pipeline.networkConfig,
      config.modelPackageGroupName,
    );

    const constructProps: SageMakerPipelineL3ConstructProps = {
      ...l3ConstructProps,
      projectName: config.projectName,
      pipelineName: config.pipelineName,
      domainId: config.domainId,
      domainArn: config.domainArn,
      modelPackageGroupName: config.modelPackageGroupName,
      createModelPackageGroup: config.createModelPackageGroup,
      preProdAccountId: config.preProdAccountId,
      prodAccountId: config.prodAccountId,
      additionalReadBucketNames: config.additionalReadBucketNames,
      baseJobPrefix: config.baseJobPrefix,
      pipelineBucketName: config.pipelineBucketName,
      pipelineKmsKeyArn: config.pipelineKmsKeyArn,
      pipelineParameters: config.pipeline.parameters,
      pipelineSteps,
      networkConfig: config.pipeline.networkConfig,
    };

    new SageMakerPipelineL3Construct(stack, 'sm-pipeline', constructProps);
    return [stack];
  }
}
