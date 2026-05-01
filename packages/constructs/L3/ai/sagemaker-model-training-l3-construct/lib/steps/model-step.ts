/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PipelineStep, PipelineStepDefinition, StepOutputReference, stepOutputRef } from './pipeline-step';

/** Configuration for a SageMaker Model step. */
export interface SmModelStepProps {
  /** Model package ARN (from Model Registry) or step output reference. */
  readonly modelPackageArn: string | StepOutputReference;
  /** SageMaker execution role ARN for the model. */
  readonly roleArn: string;
  /** Explicit step dependencies. */
  readonly dependsOn?: string[];
}

/**
 * SageMaker Model step.
 *
 * Creates a SageMaker Model from a registered Model Package.
 * Typically used in batch inference pipelines before a Transform step.
 */
export class SmModelStep extends PipelineStep {
  private readonly props: SmModelStepProps;

  constructor(name: string, props: SmModelStepProps) {
    super(name, props.dependsOn);
    this.props = props;
  }

  /** Returns a reference to the model name created by this step. */
  public modelName(): StepOutputReference {
    return stepOutputRef(`Steps.${this.name}.ModelName`);
  }

  public toDefinition(): PipelineStepDefinition {
    const args: Record<string, unknown> = {
      ExecutionRoleArn: this.props.roleArn,
      Containers: [
        {
          ModelPackageName: this.props.modelPackageArn,
        },
      ],
    };

    return {
      name: this.name,
      type: 'Model',
      arguments: args,
      ...(this.dependsOn.length > 0 && { dependsOn: this.dependsOn }),
    };
  }
}
