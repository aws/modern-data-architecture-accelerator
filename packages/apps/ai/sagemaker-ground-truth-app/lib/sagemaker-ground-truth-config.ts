/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  GroundTruthTaskType,
  GroundTruthLabelingTaskConfig,
  GroundTruthVerificationConfig,
  GroundTruthSqsConfig,
  FeatureDefinitionConfig,
  SUPPORTED_TASK_TYPES,
} from '@aws-mdaa/sagemaker-ground-truth-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import * as configSchema from './config-schema.json';
import { Stack } from 'aws-cdk-lib';

/** Configuration for a single Ground Truth labeling job */
export interface GroundTruthJobConfig {
  /** Unique name prefix for this labeling job (used in resource naming) */
  readonly jobName: string;
  /** The labeling task type */
  readonly taskType: GroundTruthTaskType;
  /** Labeling task configuration */
  readonly labelingTaskConfig: GroundTruthLabelingTaskConfig;
  /** Optional verification step configuration */
  readonly verification?: GroundTruthVerificationConfig;
  /** SQS configuration (optional) */
  readonly sqsConfig?: GroundTruthSqsConfig;
  /** Cron schedule for the workflow (default: "cron(0 12 * * ? *)") */
  readonly workflowSchedule?: string;
  /** Additional feature definitions for the Feature Group */
  readonly additionalFeatureDefinitions?: FeatureDefinitionConfig[];
  /**
   * Optional externally-created IAM role for SageMaker Ground Truth labeling jobs.
   * When provided, the construct imports this role and attaches Ground Truth-specific
   * permissions (S3, KMS, SageMaker) to it via a managed policy.
   *
   * Use this when the role needs access to S3 buckets from other MDAA modules (e.g., datalake).
   * The external module grants bucket access to this role, then Ground Truth attaches its own permissions.
   *
   * If omitted, the construct creates a new role with sagemaker.amazonaws.com trust.
   */
  readonly groundTruthRole?: MdaaRoleRef;
}

/** Top-level config contents */
export interface SageMakerGroundTruthConfigContents extends MdaaBaseConfigContents {
  /**
   * List of labeling job configurations.
   * @minItems 1
   */
  readonly jobs: GroundTruthJobConfig[];
}

export class SageMakerGroundTruthConfigParser extends MdaaAppConfigParser<SageMakerGroundTruthConfigContents> {
  public readonly jobs: GroundTruthJobConfig[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema);
    this.jobs = this.configContents.jobs;
    this.validateJobs();
  }

  private validateJobs(): void {
    if (!this.jobs || this.jobs.length === 0) {
      throw new Error('Ground Truth config must contain at least one job in the "jobs" array.');
    }

    const seenNames = new Set<string>();
    for (const jobConfig of this.jobs) {
      if (!jobConfig.jobName || jobConfig.jobName.trim().length === 0) {
        throw new Error('Each job must have a non-empty "jobName".');
      }
      if (seenNames.has(jobConfig.jobName)) {
        throw new Error(`Duplicate jobName "${jobConfig.jobName}".`);
      }
      seenNames.add(jobConfig.jobName);

      if (!SUPPORTED_TASK_TYPES.includes(jobConfig.taskType)) {
        throw new Error(
          `Job "${jobConfig.jobName}": invalid taskType "${jobConfig.taskType}". ` +
            `Valid types: ${SUPPORTED_TASK_TYPES.join(', ')}`,
        );
      }
    }
  }
}
