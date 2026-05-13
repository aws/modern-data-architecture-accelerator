/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { ModelTrainingEnvironmentConfig } from '@aws-mdaa/sagemaker-model-training-l3-construct';
import { DeployEnvironmentConfig } from '@aws-mdaa/sagemaker-model-deploy-l3-construct';
import { SourceType, CodeStarConnectionConfig, BuildPolicyConfig } from '@aws-mdaa/sm-shared';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface SageMakerMLOpsTrainingConfig {
  /** SageMaker project name for training */
  readonly projectName: string;
  /** SageMaker domain ID (SSM reference from sm-studio-domain-app) */
  readonly domainId?: string;
  /** SageMaker domain ARN (SSM reference from sm-studio-domain-app) */
  readonly domainArn?: string;
  /** Enable network isolation for training jobs */
  readonly enableNetworkIsolation?: boolean;
  /** Enable inter-container traffic encryption */
  readonly enableInterContainerEncryption?: boolean;
  /** Dev environment config (VPC, subnets, security groups) */
  readonly devEnvironment?: ModelTrainingEnvironmentConfig;
  /** Pre-prod account ID for cross-account model registry access */
  readonly preProdAccountId?: string;
  /** Prod account ID for cross-account model registry access */
  readonly prodAccountId?: string;
  /** Path to training seed code directory or zip file */
  readonly seedCodePath?: string;
  /** Source repository type (default: CODECOMMIT) */
  readonly sourceType?: SourceType;
  /** CodeStar Connections config for the training repo */
  readonly codeStarConnection?: CodeStarConnectionConfig;
  /** Prefix used by seed code when naming SageMaker jobs (default: projectName). Used to scope IAM resource ARNs. */
  readonly baseJobPrefix?: string;
  /** Path to a local directory containing training data files to upload to the pipeline S3 bucket during deploy. */
  readonly trainingDataPath?: string;
  /** Additional IAM policies to attach to the build role. Use this to grant the build environment access to private registries (CodeArtifact, ECR), secrets, or other AWS services needed by the buildspec. */
  readonly buildPolicies?: BuildPolicyConfig[];
}

export interface SageMakerMLOpsDeployConfig {
  /** SageMaker project name for deployment */
  readonly projectName: string;
  /** SageMaker domain ID */
  readonly domainId?: string;
  /** SageMaker domain ARN */
  readonly domainArn?: string;
  /** Model Package Group name (optional — auto-wired from training when both are in same app) */
  readonly modelPackageGroupName?: string;
  /** Model bucket name (optional — auto-wired from training when both are in same app) */
  readonly modelBucketName?: string;
  /** Pipeline bucket name for CfnPipeline-based training (model artifacts may live here) */
  readonly pipelineBucketName?: string;
  /** KMS key ARN for pipeline bucket encryption (passed to endpoint execution role for decryption) */
  readonly pipelineKmsKeyArn?: string;
  /** Enable network isolation for endpoints */
  readonly enableNetworkIsolation?: boolean;
  /** Enable manual approval gate before production deployment */
  readonly enableManualApproval?: boolean;
  /** Enable EventBridge trigger on model package approval */
  readonly enableEventBridgeTrigger?: boolean;
  /** Enable data capture on deployed endpoints */
  readonly enableDataCapture?: boolean;
  /** Dev environment config */
  readonly devEnvironment?: DeployEnvironmentConfig;
  /** Pre-prod environment config */
  readonly preProdEnvironment?: DeployEnvironmentConfig;
  /** Prod environment config */
  readonly prodEnvironment?: DeployEnvironmentConfig;
  /** Path to deploy seed code directory or zip file */
  readonly seedCodePath?: string;
  /** Source repository type (default: CODECOMMIT) */
  readonly sourceType?: SourceType;
  /** CodeStar Connections config for the deploy repo */
  readonly codeStarConnection?: CodeStarConnectionConfig;
  /** CDK bootstrap qualifier for cross-account role ARNs */
  readonly cdkBootstrapQualifier?: string;
  /** Additional IAM policies to attach to the build roles. Use this to grant the build environment access to private registries (CodeArtifact, ECR), secrets, or other AWS services needed by the buildspec. */
  readonly buildPolicies?: BuildPolicyConfig[];
}

export interface SageMakerMLOpsConfigContents extends MdaaBaseConfigContents {
  /** Training pipeline configuration */
  readonly training: SageMakerMLOpsTrainingConfig;
  /** Deployment pipeline configuration */
  readonly deploy: SageMakerMLOpsDeployConfig;
}

export class SageMakerMLOpsConfigParser extends MdaaAppConfigParser<SageMakerMLOpsConfigContents> {
  public readonly training: SageMakerMLOpsTrainingConfig;
  public readonly deploy: SageMakerMLOpsDeployConfig;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.training = this.configContents.training;
    this.deploy = this.configContents.deploy;
  }
}
