/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

/** Processing step input configuration. */
export interface ProcessingInputConfig {
  readonly inputName: string;
  readonly s3Uri?: string | { parameter: string };
  /** Reference a previous step's output: "<stepName>.<outputName>" */
  readonly stepOutput?: string;
  /** Reference a pipeline parameter by name (e.g. "InputDataUrl") */
  readonly parameter?: string;
}

/** Processing step output configuration. */
export interface ProcessingOutputConfig {
  readonly outputName: string;
  readonly localPath?: string;
}

/** Property file for metric extraction. */
export interface PropertyFileConfigYaml {
  readonly propertyFileName: string;
  readonly outputName: string;
  readonly filePath: string;
}

/** Processing step config. */
export interface ProcessingStepConfig {
  readonly imageUri: string;
  readonly instanceType: string;
  readonly instanceCount?: number;
  readonly scriptS3Uri?: string;
  readonly inputs?: ProcessingInputConfig[];
  readonly outputs?: ProcessingOutputConfig[];
  readonly propertyFiles?: PropertyFileConfigYaml[];
  readonly enableNetworkIsolation?: boolean;
  readonly arguments?: string[];
}

/** Training input channel configuration. */
export interface TrainingInputChannelConfig {
  readonly channelName: string;
  readonly s3Uri?: string;
  /** Reference a previous step's output: "<stepName>.<outputName>" */
  readonly stepOutput?: string;
  /** Reference a pipeline parameter by name (e.g. "InputDataUrl") */
  readonly parameter?: string;
  readonly contentType?: string;
}

/** Training step config. */
export interface TrainingStepConfig {
  readonly imageUri: string;
  readonly instanceType: string;
  readonly instanceCount?: number;
  readonly hyperparameters?: { [key: string]: string };
  readonly inputChannels: TrainingInputChannelConfig[];
  readonly outputPath: string;
}

/** RegisterModel step config. */
export interface RegisterModelStepConfig {
  readonly imageUri: string;
  /** S3 URI or step reference "<stepName>.modelArtifacts" */
  readonly modelData?: string;
  /** Step name to get model artifacts from */
  readonly modelDataStep?: string;
  /** Model package group name (overrides top-level if set) */
  readonly modelPackageGroupName?: string;
  /** Initial approval status or parameter reference (e.g. {parameter: "ModelApprovalStatus"}) */
  readonly approvalStatus?: string | { parameter: string };
  readonly contentTypes?: string[];
  readonly responseTypes?: string[];
  readonly inferenceInstanceTypes?: string[];
  readonly transformInstanceTypes?: string[];
}

/** Condition clause config. */
export interface ConditionClauseConfig {
  readonly operator: string;
  readonly stepName: string;
  readonly propertyFile: string;
  readonly jsonPath: string;
  readonly threshold: number;
}

/** Condition step config. */
export interface ConditionStepConfig {
  readonly conditions: ConditionClauseConfig[];
  readonly ifSteps: string[];
  readonly elseSteps?: string[];
}

/** Model step config (batch inference). */
export interface ModelStepConfig {
  readonly modelPackageArn: string | { parameter: string };
}

/** Transform step config (batch inference). */
export interface TransformStepConfig {
  /** Step name to get model name from */
  readonly modelNameStep: string;
  readonly instanceType: string;
  readonly instanceCount?: number;
  readonly inputDataUri?: string;
  /** Reference a previous step's output: "<stepName>.<outputName>" */
  readonly inputDataStepOutput?: string;
  readonly contentType?: string;
  readonly splitType?: string;
  readonly outputPath: string;
  readonly assembleWith?: string;
  readonly maxConcurrentTransforms?: number;
  readonly maxPayloadInMB?: number;
  readonly strategy?: string;
}

/** A single pipeline step in YAML config. */
export interface PipelineStepYamlConfig {
  readonly name: string;
  readonly type: 'Processing' | 'Training' | 'RegisterModel' | 'Condition' | 'Model' | 'Transform';
  readonly processing?: ProcessingStepConfig;
  readonly training?: TrainingStepConfig;
  readonly register?: RegisterModelStepConfig;
  readonly condition?: ConditionStepConfig;
  readonly model?: ModelStepConfig;
  readonly transform?: TransformStepConfig;
  readonly dependsOn?: string[];
}

/** Pipeline parameter from YAML config. */
export interface PipelineParameterConfig {
  readonly name: string;
  readonly type: 'String' | 'Integer' | 'Float' | 'Boolean';
  readonly defaultValue: string | number | boolean;
}

/** Network configuration from YAML config. */
export interface NetworkConfigYaml {
  readonly enableNetworkIsolation?: boolean;
  readonly encryptInterContainerTraffic?: boolean;
  readonly subnetIds?: string[];
  readonly securityGroupIds?: string[];
}

/** Pipeline mode config — for CfnPipeline-based pipeline definition. */
export interface PipelineConfigContents extends MdaaBaseConfigContents {
  readonly projectName: string;
  /** Explicit pipeline name (if not provided, generated from MDAA naming convention). */
  readonly pipelineName?: string;
  readonly domainId?: string;
  readonly domainArn?: string;
  readonly modelPackageGroupName?: string;
  /** Controls whether this module creates a new SageMaker Model Package Group.
   *  When true (default), a Model Package Group is created and its name is generated via MDAA naming conventions.
   *  When false, the Model Package Group named by modelPackageGroupName already exists and is only referenced —
   *  no resource is created and the name is used as-is without any prefix being applied.
   *  Set to false when the Model Package Group was created by a separate construct, such as the
   *  sagemaker-model-training-l3-construct deployed via the sagemaker-mlops-app. In that scenario the
   *  modelPackageGroupName value is a fully-qualified name (e.g. "myorg-dev-core-abalone-mpg") and
   *  applying the naming convention on top of it would produce an incorrect double-prefixed name. */
  readonly createModelPackageGroup?: boolean;
  readonly preProdAccountId?: string;
  readonly prodAccountId?: string;
  /** Additional S3 bucket names the pipeline execution role needs read access to. */
  readonly additionalReadBucketNames?: string[];
  /** Prefix used by seed code when naming SageMaker jobs (default: projectName). Used to scope IAM resource ARNs. */
  readonly baseJobPrefix?: string;
  /** Existing S3 bucket name to reuse for pipeline artifacts (e.g. the core stack's pipeline bucket).
   *  When omitted, the construct creates its own bucket. */
  readonly pipelineBucketName?: string;
  /** KMS key ARN for the existing pipeline bucket. Required when pipelineBucketName is set. */
  readonly pipelineKmsKeyArn?: string;
  readonly pipeline: {
    readonly parameters?: PipelineParameterConfig[];
    readonly steps: PipelineStepYamlConfig[];
    readonly networkConfig?: NetworkConfigYaml;
  };
}

export class SageMakerPipelineConfigParser extends MdaaAppConfigParser<PipelineConfigContents> {
  public readonly projectName: string;
  public readonly pipelineName?: string;
  public readonly domainId?: string;
  public readonly domainArn?: string;
  public readonly modelPackageGroupName?: string;
  public readonly createModelPackageGroup?: boolean;
  public readonly preProdAccountId?: string;
  public readonly prodAccountId?: string;
  public readonly additionalReadBucketNames?: string[];
  public readonly baseJobPrefix?: string;
  public readonly pipelineBucketName?: string;
  public readonly pipelineKmsKeyArn?: string;
  public readonly pipeline: PipelineConfigContents['pipeline'];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.projectName = this.configContents.projectName;
    this.pipelineName = this.configContents.pipelineName;
    this.domainId = this.configContents.domainId;
    this.domainArn = this.configContents.domainArn;
    this.modelPackageGroupName = this.configContents.modelPackageGroupName;
    this.createModelPackageGroup = this.configContents.createModelPackageGroup;
    this.preProdAccountId = this.configContents.preProdAccountId;
    this.prodAccountId = this.configContents.prodAccountId;
    this.additionalReadBucketNames = this.configContents.additionalReadBucketNames;
    this.baseJobPrefix = this.configContents.baseJobPrefix;
    this.pipelineBucketName = this.configContents.pipelineBucketName;
    this.pipelineKmsKeyArn = this.configContents.pipelineKmsKeyArn;
    this.pipeline = this.configContents.pipeline;
  }
}
