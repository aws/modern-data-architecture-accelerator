/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_BUCKET_PLACEHOLDER } from '../sagemaker-pipeline-l3-construct';
import { validateImageUri, validateInstanceType } from '@aws-mdaa/sm-shared';
import {
  PipelineStep,
  PipelineStepDefinition,
  PipelineNetworkConfig,
  StepOutputReference,
  stepOutputRef,
} from './pipeline-step';

/** Input channel for a processing step. */
export interface ProcessingInput {
  /** Input name. */
  readonly inputName: string;
  /** S3 URI or step output reference. */
  readonly s3Uri: string | StepOutputReference;
  /** Local path inside the container (default: /opt/ml/processing/input/<inputName>). */
  readonly localPath?: string;
  /** S3 data type: S3Prefix (default) or ManifestFile. */
  readonly s3DataType?: 'S3Prefix' | 'ManifestFile';
  /** S3 input mode: File (default) or Pipe. */
  readonly s3InputMode?: 'File' | 'Pipe';
}

/** Output channel for a processing step. */
export interface ProcessingOutput {
  /** Output name — used to reference this output from downstream steps. */
  readonly outputName: string;
  /** Local path inside the container (default: /opt/ml/processing/<outputName>). */
  readonly localPath?: string;
  /** S3 upload mode: EndOfJob (default) or Continuous. */
  readonly s3UploadMode?: 'EndOfJob' | 'Continuous';
}

/** Property file for accessing JSON metrics from processing output. */
export interface PropertyFileConfig {
  /** Property file name (used in JsonGet references). */
  readonly propertyFileName: string;
  /** Output name that contains the file. */
  readonly outputName: string;
  /** Path to the JSON file within the output. */
  readonly filePath: string;
}

/** Configuration for a SageMaker Processing step. */
export interface SmProcessingStepProps {
  /** Container image URI. */
  readonly imageUri: string;
  /** Processing instance type. */
  readonly instanceType: string;
  /** Number of processing instances (default: 1). */
  readonly instanceCount?: number;
  /** S3 URI of the processing script. */
  readonly scriptS3Uri?: string;
  /** Container entrypoint command (default: ["python3"]). */
  readonly entrypoint?: string[];
  /** Input channels. */
  readonly inputs?: ProcessingInput[];
  /** Output channels. */
  readonly outputs?: ProcessingOutput[];
  /** Property files for metric extraction. */
  readonly propertyFiles?: PropertyFileConfig[];
  /** Network configuration. */
  readonly networkConfig?: PipelineNetworkConfig;
  /** KMS key ID for output encryption. */
  readonly outputKmsKeyId?: string;
  /** SageMaker execution role ARN. */
  readonly roleArn: string;
  /** Volume size in GB (default: 30). */
  readonly volumeSizeInGB?: number;
  /** Max runtime in seconds (default: 3600). */
  readonly maxRuntimeInSeconds?: number;
  /** Container arguments passed to the processing script. */
  readonly containerArguments?: string[];
  /** Explicit step dependencies. */
  readonly dependsOn?: string[];
}

/**
 * SageMaker Processing step.
 *
 * Generates a Pipeline Definition step of type "Processing" that runs
 * a containerized processing job (preprocessing, evaluation, etc.).
 */
export class SmProcessingStep extends PipelineStep {
  private readonly props: SmProcessingStepProps;

  constructor(name: string, props: SmProcessingStepProps) {
    super(name, props.dependsOn);
    validateImageUri(props.imageUri, `Step '${name}'`);
    validateInstanceType(props.instanceType, `Step '${name}'`);
    this.props = props;
  }

  /**
   * Returns a reference to an output of this processing step.
   * Use this to wire outputs to downstream step inputs.
   */
  public output(outputName: string): StepOutputReference {
    return stepOutputRef(`Steps.${this.name}.ProcessingOutputConfig.Outputs['${outputName}'].S3Output.S3Uri`);
  }

  public toDefinition(): PipelineStepDefinition {
    const props = this.props;
    const inputs: Record<string, unknown>[] = [];

    // Script input (code channel)
    if (props.scriptS3Uri) {
      inputs.push({
        InputName: 'code',
        AppManaged: false,
        S3Input: {
          S3Uri: props.scriptS3Uri,
          LocalPath: '/opt/ml/processing/input/code',
          S3DataType: 'S3Prefix',
          S3InputMode: 'File',
          S3DataDistributionType: 'FullyReplicated',
        },
      });
    }

    // Data inputs
    for (const input of props.inputs ?? []) {
      inputs.push({
        InputName: input.inputName,
        AppManaged: false,
        S3Input: {
          S3Uri: input.s3Uri,
          LocalPath: input.localPath ?? `/opt/ml/processing/input/${input.inputName}`,
          S3DataType: input.s3DataType ?? 'S3Prefix',
          S3InputMode: input.s3InputMode ?? 'File',
          S3DataDistributionType: 'FullyReplicated',
        },
      });
    }

    // Outputs
    const outputConfigs = (props.outputs ?? []).map(output => ({
      OutputName: output.outputName,
      AppManaged: false,
      S3Output: {
        S3Uri: `s3://${DEFAULT_BUCKET_PLACEHOLDER}/${this.name}/${output.outputName}`,
        LocalPath: output.localPath ?? `/opt/ml/processing/${output.outputName}`,
        S3UploadMode: output.s3UploadMode ?? 'EndOfJob',
      },
    }));

    const appSpec: Record<string, unknown> = {
      ImageUri: props.imageUri,
      ContainerEntrypoint: props.scriptS3Uri
        ? (() => {
            const scriptName = props.scriptS3Uri!.split('/').pop();
            if (!scriptName) {
              throw new Error(`scriptS3Uri '${props.scriptS3Uri}' must end with a filename, not '/'.`);
            }
            return ['python3', `/opt/ml/processing/input/code/${scriptName}`];
          })()
        : (props.entrypoint ?? ['python3']),
      ...(props.containerArguments && { ContainerArguments: props.containerArguments }),
    };

    const networkConfig = this.buildNetworkConfig(props.networkConfig);

    const args: Record<string, unknown> = {
      ProcessingResources: {
        ClusterConfig: {
          InstanceType: props.instanceType,
          InstanceCount: props.instanceCount ?? 1,
          VolumeSizeInGB: props.volumeSizeInGB ?? 30,
          ...(props.outputKmsKeyId && { VolumeKmsKeyId: props.outputKmsKeyId }),
        },
      },
      AppSpecification: appSpec,
      RoleArn: props.roleArn,
      ProcessingInputs: inputs.length > 0 ? inputs : undefined,
      ProcessingOutputConfig: outputConfigs.length > 0 ? { Outputs: outputConfigs } : undefined,
    };

    if (props.outputKmsKeyId) {
      if (args['ProcessingOutputConfig']) {
        (args['ProcessingOutputConfig'] as Record<string, unknown>)['KmsKeyId'] = props.outputKmsKeyId;
      }
    }

    if (networkConfig) {
      args['NetworkConfig'] = networkConfig;
    }

    if (props.maxRuntimeInSeconds) {
      args['StoppingCondition'] = { MaxRuntimeInSeconds: props.maxRuntimeInSeconds };
    }

    const def: PipelineStepDefinition = {
      name: this.name,
      type: 'Processing',
      arguments: args,
      ...(this.dependsOn.length > 0 && { dependsOn: this.dependsOn }),
      ...(props.propertyFiles &&
        props.propertyFiles.length > 0 && {
          propertyFiles: props.propertyFiles.map(pf => ({
            PropertyFileName: pf.propertyFileName,
            OutputName: pf.outputName,
            FilePath: pf.filePath,
          })),
        }),
    };

    return def;
  }
}
