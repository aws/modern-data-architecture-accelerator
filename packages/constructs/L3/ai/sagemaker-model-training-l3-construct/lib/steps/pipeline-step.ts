/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Base types for SageMaker Pipeline steps.
 *
 * Each step class produces a JSON fragment conforming to the SageMaker Pipeline
 * Definition Language. Step output references are compile-time tokens that
 * serialize to {"Get": "Steps.<name>.<path>"} expressions — same concept
 * as CloudFormation Fn::GetAtt.
 *
 * @see https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-pipeline-structure.html
 */

/** Supported SageMaker Pipeline step types. */
export type PipelineStepType = 'Processing' | 'Training' | 'RegisterModel' | 'Condition' | 'Model' | 'Transform';

/** A reference to a previous step's output, serialized as a Get expression. */
export interface StepOutputReference {
  /** The Get expression path, e.g. "Steps.Preprocess.ProcessingOutputConfig.Outputs['train'].S3Output.S3Uri" */
  readonly get: string;
}

/**
 * Creates a StepOutputReference that serializes to {"Get": "<path>"} in JSON.
 * Uses lowercase 'get' for JSII compliance, but toJSON() produces uppercase 'Get'
 * as required by the SageMaker Pipeline Definition Language.
 */
export function stepOutputRef(path: string): StepOutputReference {
  return {
    get: path,
    toJSON() {
      return { Get: path };
    },
  } as StepOutputReference;
}

/** VPC/network configuration shared across step types. */
export interface PipelineNetworkConfig {
  /** Enable network isolation (no outbound internet from container). */
  readonly enableNetworkIsolation?: boolean;
  /** Encrypt traffic between containers in distributed jobs. */
  readonly encryptInterContainerTraffic?: boolean;
  /** VPC subnet IDs for the job. */
  readonly subnetIds?: string[];
  /** VPC security group IDs for the job. */
  readonly securityGroupIds?: string[];
}

/** JSON fragment for a single pipeline step (camelCase for JSII; converted to PascalCase during serialization). */
export interface PipelineStepDefinition {
  readonly name: string;
  readonly type: PipelineStepType;
  readonly arguments?: Record<string, unknown>;
  readonly dependsOn?: string[];
  readonly condition?: unknown;
  readonly ifSteps?: PipelineStepDefinition[];
  readonly elseSteps?: PipelineStepDefinition[];
  readonly propertyFiles?: Record<string, unknown>[];
}

/** Base class for all SageMaker Pipeline steps. */
export abstract class PipelineStep {
  /** Step name — must be unique within the pipeline. */
  public readonly name: string;

  /** Steps this step explicitly depends on (in addition to data dependencies). */
  public readonly dependsOn: string[];

  constructor(name: string, dependsOn?: string[]) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      throw new Error(
        `Invalid step name '${name}': must start with a letter and contain only letters, digits, hyphens, and underscores.`,
      );
    }
    if (name.length > 256) {
      throw new Error(`Step name '${name}' exceeds 256 character limit.`);
    }
    this.name = name;
    this.dependsOn = dependsOn ?? [];
  }

  /** Produce the JSON definition for this step. */
  abstract toDefinition(): PipelineStepDefinition;

  /**
   * Build a VPC/NetworkConfig Arguments fragment from the shared config.
   * Returns undefined if no VPC config is provided.
   */
  protected buildNetworkConfig(config?: PipelineNetworkConfig): Record<string, unknown> | undefined {
    if (!config?.subnetIds?.length && !config?.securityGroupIds?.length) {
      // Even without VPC, emit isolation/encryption flags if explicitly set
      if (config?.enableNetworkIsolation !== undefined || config?.encryptInterContainerTraffic !== undefined) {
        return {
          ...(config.enableNetworkIsolation !== undefined && {
            EnableNetworkIsolation: config.enableNetworkIsolation,
          }),
          ...(config.encryptInterContainerTraffic !== undefined && {
            EnableInterContainerTrafficEncryption: config.encryptInterContainerTraffic,
          }),
        };
      }
      return undefined;
    }
    return {
      EnableNetworkIsolation: config?.enableNetworkIsolation ?? false,
      EnableInterContainerTrafficEncryption: config?.encryptInterContainerTraffic ?? true,
      VpcConfig: {
        Subnets: config?.subnetIds,
        SecurityGroupIds: config?.securityGroupIds,
      },
    };
  }
}
