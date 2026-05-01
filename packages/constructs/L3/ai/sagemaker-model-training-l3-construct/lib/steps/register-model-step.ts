/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateImageUri } from '@aws-mdaa/sm-shared';
import { PipelineStep, PipelineStepDefinition, StepOutputReference } from './pipeline-step';

/** Configuration for a SageMaker RegisterModel step. */
export interface SmRegisterModelStepProps {
  /** Container image URI for inference. */
  readonly imageUri: string;
  /** S3 URI of the model artifacts (typically from a training step). */
  readonly modelData: string | StepOutputReference;
  /** Model Package Group name. */
  readonly modelPackageGroupName: string;
  /** Initial approval status (default: "PendingManualApproval"). Can be a parameter reference. */
  readonly approvalStatus?: string | StepOutputReference;
  /** Supported content types for inference (e.g. ["text/csv"]). */
  readonly contentTypes?: string[];
  /** Supported response content types (e.g. ["text/csv"]). */
  readonly responseTypes?: string[];
  /** Instance types supported for real-time inference. */
  readonly inferenceInstanceTypes?: string[];
  /** Instance types supported for batch transform. */
  readonly transformInstanceTypes?: string[];
  /** Model metrics source (S3 URI or step output reference). */
  readonly modelMetricsStatisticsS3Uri?: string | StepOutputReference;
  /** Content type of the model metrics file (default: "application/json"). */
  readonly modelMetricsStatisticsContentType?: string;
  /** Explicit step dependencies. */
  readonly dependsOn?: string[];
}

/**
 * SageMaker RegisterModel step.
 *
 * Registers a trained model in the SageMaker Model Registry as a
 * versioned Model Package within a Model Package Group.
 */
export class SmRegisterModelStep extends PipelineStep {
  private readonly props: SmRegisterModelStepProps;

  constructor(name: string, props: SmRegisterModelStepProps) {
    super(name, props.dependsOn);
    validateImageUri(props.imageUri, `Step '${name}'`);
    this.props = props;
  }

  public toDefinition(): PipelineStepDefinition {
    const props = this.props;

    const args: Record<string, unknown> = {
      ModelPackageGroupName: props.modelPackageGroupName,
      ModelApprovalStatus: props.approvalStatus ?? 'PendingManualApproval',
      InferenceSpecification: {
        Containers: [
          {
            Image: props.imageUri,
            ModelDataUrl: props.modelData,
          },
        ],
        SupportedContentTypes: props.contentTypes ?? ['text/csv'],
        SupportedResponseMIMETypes: props.responseTypes ?? ['text/csv'],
        ...(props.inferenceInstanceTypes && { SupportedRealtimeInferenceInstanceTypes: props.inferenceInstanceTypes }),
        ...(props.transformInstanceTypes && { SupportedTransformInstanceTypes: props.transformInstanceTypes }),
      },
    };

    if (props.modelMetricsStatisticsS3Uri) {
      args['ModelMetrics'] = {
        ModelQuality: {
          Statistics: {
            S3Uri: props.modelMetricsStatisticsS3Uri,
            ContentType: props.modelMetricsStatisticsContentType ?? 'application/json',
          },
        },
      };
    }

    return {
      name: this.name,
      type: 'RegisterModel',
      arguments: args,
      ...(this.dependsOn.length > 0 && { dependsOn: this.dependsOn }),
    };
  }
}
