/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SageMakerMLOpsConfigParser } from './sagemaker-mlops-config';
import {
  SageMakerModelTrainingL3Construct,
  SageMakerModelTrainingL3ConstructProps,
} from '@aws-mdaa/sagemaker-model-training-l3-construct';
import {
  SageMakerModelDeployL3Construct,
  SageMakerModelDeployL3ConstructProps,
} from '@aws-mdaa/sagemaker-model-deploy-l3-construct';

/**
 * SageMaker MLOps App — unified training and deployment pipeline.
 *
 * Combines the SageMaker Model Training and Model Deploy L3 constructs
 * into a single CDK app with a merged configuration.
 *
 * Training creates:
 * - Model Package Group for model versioning
 * - S3 bucket for model artifacts (KMS encrypted)
 * - CodeCommit repository with seed code
 * - CodeBuild + CodePipeline for training CI/CD
 *
 * Deploy creates:
 * - CDK self-mutating CodeBuild project for endpoint deployment
 * - EventBridge triggers on model package approval
 * - Multi-account deployment with optional manual approval gates
 */
export class SageMakerMLOpsApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const config = new SageMakerMLOpsConfigParser(stack, parserProps);

    const trainingProps: SageMakerModelTrainingL3ConstructProps = {
      ...l3ConstructProps,
      projectName: config.training.projectName,
      domainId: config.training.domainId,
      domainArn: config.training.domainArn,
      enableNetworkIsolation: config.training.enableNetworkIsolation,
      enableInterContainerEncryption: config.training.enableInterContainerEncryption,
      devEnvironment: config.training.devEnvironment,
      preProdAccountId: config.training.preProdAccountId,
      prodAccountId: config.training.prodAccountId,
      seedCodePath: config.training.seedCodePath,
      sourceType: config.training.sourceType,
      codeStarConnection: config.training.codeStarConnection,
      baseJobPrefix: config.training.baseJobPrefix,
      trainingDataPath: config.training.trainingDataPath,
    };

    const training = new SageMakerModelTrainingL3Construct(stack, 'training', trainingProps);

    // When training and deploy are in the same stack, wire outputs directly
    // instead of using SSM references (which aren't available during initial deploy).
    const deployModelPackageGroupName = config.deploy.modelPackageGroupName ?? training.modelPackageGroupName;
    const deployModelBucketName = config.deploy.modelBucketName ?? training.modelBucketName;
    const deployPipelineBucketName = config.deploy.pipelineBucketName ?? training.pipelineBucketName;
    const deployPipelineKmsKeyArn = config.deploy.pipelineKmsKeyArn ?? training.pipelineKmsKeyArn;

    const deployProps: SageMakerModelDeployL3ConstructProps = {
      ...l3ConstructProps,
      projectName: config.deploy.projectName,
      domainId: config.deploy.domainId,
      domainArn: config.deploy.domainArn,
      modelPackageGroupName: deployModelPackageGroupName,
      modelBucketName: deployModelBucketName,
      pipelineBucketName: deployPipelineBucketName,
      pipelineKmsKeyArn: deployPipelineKmsKeyArn,
      enableNetworkIsolation: config.deploy.enableNetworkIsolation,
      enableManualApproval: config.deploy.enableManualApproval,
      enableEventBridgeTrigger: config.deploy.enableEventBridgeTrigger,
      enableDataCapture: config.deploy.enableDataCapture,
      devEnvironment: config.deploy.devEnvironment,
      preProdEnvironment: config.deploy.preProdEnvironment,
      prodEnvironment: config.deploy.prodEnvironment,
      seedCodePath: config.deploy.seedCodePath,
      sourceType: config.deploy.sourceType,
      codeStarConnection: config.deploy.codeStarConnection,
      cdkBootstrapQualifier: config.deploy.cdkBootstrapQualifier,
    };

    new SageMakerModelDeployL3Construct(stack, 'deploy', deployProps);
    return [stack];
  }
}
