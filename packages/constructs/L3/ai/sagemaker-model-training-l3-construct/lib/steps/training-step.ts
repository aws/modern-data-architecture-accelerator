/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateImageUri, validateInstanceType } from '@aws-mdaa/sm-shared';
import {
  PipelineStep,
  PipelineStepDefinition,
  PipelineNetworkConfig,
  StepOutputReference,
  stepOutputRef,
} from './pipeline-step';

/** Input channel for a training step. */
export interface TrainingInputChannel {
  /** Channel name (e.g. "train", "validation"). */
  readonly channelName: string;
  /** S3 URI or step output reference. */
  readonly s3Uri: string | StepOutputReference;
  /** Content type of the training data (e.g. "text/csv"). */
  readonly contentType?: string;
  /** S3 data type: S3Prefix (default) or ManifestFile. */
  readonly s3DataType?: 'S3Prefix' | 'ManifestFile';
  /** S3 data distribution type: FullyReplicated (default) or ShardedByS3Key. */
  readonly s3DataDistributionType?: 'FullyReplicated' | 'ShardedByS3Key';
  /** Input mode: File (default) or Pipe. */
  readonly inputMode?: 'File' | 'Pipe';
}

/** Configuration for a SageMaker Training step. */
export interface SmTrainingStepProps {
  /** Training container image URI. */
  readonly imageUri: string;
  /** Training instance type. */
  readonly instanceType: string;
  /** Number of training instances (default: 1). */
  readonly instanceCount?: number;
  /** Hyperparameters passed to the training algorithm. */
  readonly hyperparameters?: Record<string, string>;
  /** Input data channels. */
  readonly inputChannels: TrainingInputChannel[];
  /** S3 URI for model output artifacts. */
  readonly outputPath: string;
  /** Network configuration. */
  readonly networkConfig?: PipelineNetworkConfig;
  /** KMS key ID for output encryption. */
  readonly outputKmsKeyId?: string;
  /** SageMaker execution role ARN. */
  readonly roleArn: string;
  /** Volume size in GB (default: 30). */
  readonly volumeSizeInGB?: number;
  /** Max runtime in seconds (default: 86400). */
  readonly maxRuntimeInSeconds?: number;
  /** Explicit step dependencies. */
  readonly dependsOn?: string[];
}

/**
 * SageMaker Training step.
 *
 * Generates a Pipeline Definition step of type "Training" that runs
 * a model training job with the specified algorithm, hyperparameters,
 * and input data channels.
 */
export class SmTrainingStep extends PipelineStep {
  private readonly props: SmTrainingStepProps;

  constructor(name: string, props: SmTrainingStepProps) {
    super(name, props.dependsOn);
    validateImageUri(props.imageUri, `Step '${name}'`);
    validateInstanceType(props.instanceType, `Step '${name}'`);
    if (props.inputChannels.length === 0) {
      throw new Error(`Step '${name}': at least one input channel is required.`);
    }
    this.props = props;
  }

  /**
   * Returns a reference to the model artifacts S3 URI produced by this training step.
   */
  public modelArtifacts(): StepOutputReference {
    return stepOutputRef(`Steps.${this.name}.ModelArtifacts.S3ModelArtifacts`);
  }

  public toDefinition(): PipelineStepDefinition {
    const props = this.props;

    const inputDataConfig = props.inputChannels.map(channel => ({
      ChannelName: channel.channelName,
      ContentType: channel.contentType,
      DataSource: {
        S3DataSource: {
          S3Uri: channel.s3Uri,
          S3DataType: channel.s3DataType ?? 'S3Prefix',
          S3DataDistributionType: channel.s3DataDistributionType ?? 'FullyReplicated',
        },
      },
      ...(channel.inputMode && { InputMode: channel.inputMode }),
    }));

    const networkConfig = this.buildNetworkConfig(props.networkConfig);

    const args: Record<string, unknown> = {
      AlgorithmSpecification: {
        TrainingImage: props.imageUri,
        TrainingInputMode: 'File',
      },
      RoleArn: props.roleArn,
      InputDataConfig: inputDataConfig,
      OutputDataConfig: {
        S3OutputPath: props.outputPath,
        ...(props.outputKmsKeyId && { KmsKeyId: props.outputKmsKeyId }),
      },
      ResourceConfig: {
        InstanceType: props.instanceType,
        InstanceCount: props.instanceCount ?? 1,
        VolumeSizeInGB: props.volumeSizeInGB ?? 30,
        ...(props.outputKmsKeyId && { VolumeKmsKeyId: props.outputKmsKeyId }),
      },
      StoppingCondition: {
        MaxRuntimeInSeconds: props.maxRuntimeInSeconds ?? 86400,
      },
    };

    if (props.hyperparameters && Object.keys(props.hyperparameters).length > 0) {
      args['HyperParameters'] = props.hyperparameters;
    }

    if (networkConfig) {
      // Training step uses top-level flags + VpcConfig, not nested NetworkConfig
      if (props.networkConfig?.enableNetworkIsolation !== undefined) {
        args['EnableNetworkIsolation'] = props.networkConfig.enableNetworkIsolation;
      }
      if (props.networkConfig?.encryptInterContainerTraffic !== undefined) {
        args['EnableInterContainerTrafficEncryption'] = props.networkConfig.encryptInterContainerTraffic;
      }
      if (props.networkConfig?.subnetIds?.length || props.networkConfig?.securityGroupIds?.length) {
        args['VpcConfig'] = {
          Subnets: props.networkConfig.subnetIds,
          SecurityGroupIds: props.networkConfig.securityGroupIds,
        };
      }
    }

    return {
      name: this.name,
      type: 'Training',
      arguments: args,
      ...(this.dependsOn.length > 0 && { dependsOn: this.dependsOn }),
    };
  }
}
