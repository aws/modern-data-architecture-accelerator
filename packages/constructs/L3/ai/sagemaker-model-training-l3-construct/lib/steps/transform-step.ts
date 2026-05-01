/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateInstanceType } from '@aws-mdaa/sm-shared';
import { PipelineStep, PipelineStepDefinition, StepOutputReference } from './pipeline-step';

/** Configuration for a SageMaker Transform step. */
export interface SmTransformStepProps {
  /** Model name (from a Model step) or step output reference. */
  readonly modelName: string | StepOutputReference;
  /** Transform instance type. */
  readonly instanceType: string;
  /** Number of transform instances (default: 1). */
  readonly instanceCount?: number;
  /** S3 URI of the input data or step output reference. */
  readonly inputDataUri: string | StepOutputReference;
  /** Content type of the input data. */
  readonly contentType?: string;
  /** How to split input: None, Line, or RecordIO. */
  readonly splitType?: 'None' | 'Line' | 'RecordIO';
  /** S3 URI for transform output. */
  readonly outputPath: string | StepOutputReference;
  /** How to assemble output: None or Line. */
  readonly assembleWith?: 'None' | 'Line';
  /** Max concurrent transforms (default: 1). */
  readonly maxConcurrentTransforms?: number;
  /** Max payload size in MB (default: 6). */
  readonly maxPayloadInMB?: number;
  /** Strategy for batching: SingleRecord or MultiRecord. */
  readonly strategy?: 'SingleRecord' | 'MultiRecord';
  /** KMS key ID for output encryption. */
  readonly outputKmsKeyId?: string;
  /** Explicit step dependencies. */
  readonly dependsOn?: string[];
}

/**
 * SageMaker Transform step.
 *
 * Runs a batch transform job against a model, processing input data
 * and writing predictions to S3.
 */
export class SmTransformStep extends PipelineStep {
  private readonly props: SmTransformStepProps;

  constructor(name: string, props: SmTransformStepProps) {
    super(name, props.dependsOn);
    validateInstanceType(props.instanceType, `Step '${name}'`);
    if (props.maxPayloadInMB !== undefined && (props.maxPayloadInMB < 0 || props.maxPayloadInMB > 100)) {
      throw new Error(`Step '${name}': maxPayloadInMB must be between 0 and 100. Received: ${props.maxPayloadInMB}.`);
    }
    this.props = props;
  }

  public toDefinition(): PipelineStepDefinition {
    const props = this.props;

    const args: Record<string, unknown> = {
      ModelName: props.modelName,
      TransformInput: {
        DataSource: {
          S3DataSource: {
            S3Uri: props.inputDataUri,
            S3DataType: 'S3Prefix',
          },
        },
        ...(props.contentType && { ContentType: props.contentType }),
        ...(props.splitType && { SplitType: props.splitType }),
      },
      TransformOutput: {
        S3OutputPath: props.outputPath,
        ...(props.assembleWith && { AssembleWith: props.assembleWith }),
        ...(props.outputKmsKeyId && { KmsKeyId: props.outputKmsKeyId }),
      },
      TransformResources: {
        InstanceType: props.instanceType,
        InstanceCount: props.instanceCount ?? 1,
      },
      ...(props.maxConcurrentTransforms !== undefined && { MaxConcurrentTransforms: props.maxConcurrentTransforms }),
      ...(props.maxPayloadInMB !== undefined && { MaxPayloadInMB: props.maxPayloadInMB }),
      ...(props.strategy && { BatchStrategy: props.strategy }),
    };

    return {
      name: this.name,
      type: 'Transform',
      arguments: args,
      ...(this.dependsOn.length > 0 && { dependsOn: this.dependsOn }),
    };
  }
}
