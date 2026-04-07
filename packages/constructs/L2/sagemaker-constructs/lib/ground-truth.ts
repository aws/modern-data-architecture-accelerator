/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IRole } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import {
  serializeTaskPrice,
  validateNumberOfHumanWorkersPerDataObject,
  validateTaskAvailabilityLifetimeInSeconds,
  validateTaskTimeLimitInSeconds,
} from './utils';

export type GroundTruthTaskType =
  // Image tasks
  | 'image_bounding_box'
  | 'image_semantic_segmentation'
  | 'image_single_label_classification'
  | 'image_multi_label_classification'
  // Text tasks
  | 'text_single_label_classification'
  | 'text_multi_label_classification'
  | 'named_entity_recognition'
  // Video tasks
  | 'video_classification'
  | 'video_object_detection'
  | 'video_object_tracking'
  // 3D point cloud tasks
  | '3d_point_cloud_object_detection'
  | '3d_point_cloud_object_tracking'
  | '3d_point_cloud_semantic_segmentation';

export interface GroundTruthTaskConfigBase {
  /** ARN of the workteam */
  readonly workteamArn: string;
  /** Title of the task */
  readonly taskTitle: string;
  /** Description of the task */
  readonly taskDescription: string;
  /** Number of workers per data object */
  readonly numberOfHumanWorkersPerDataObject?: number;
  /** Time limit per task in seconds */
  readonly taskTimeLimitInSeconds?: number;
  /** How long the task remains available for a worker to accept, in seconds */
  readonly taskAvailabilityLifetimeInSeconds?: number;
  /** Pricing for AMT/vendor workforce tasks, in tenthFractionsOfACent (e.g. 60 = $0.006) */
  readonly taskPrice?: number;
}

export interface GroundTruthLabelingTaskConfig extends GroundTruthTaskConfigBase {
  /** Keywords for the labeling task */
  readonly taskKeywords: string[];
}

export interface GroundTruthVerificationConfig extends GroundTruthTaskConfigBase {
  /** Keywords for the verification task */
  readonly taskKeywords?: string[];
  /** S3 URI for the verification UI template */
  readonly templateS3Uri?: string;
  /** S3 URI for the verification categories file */
  readonly categoriesS3Uri?: string;
}

export interface MdaaGroundTruthProps extends MdaaConstructProps {
  /** Job name prefix for the labeling job */
  readonly jobName: string;
  /** The labeling task type */
  readonly taskType: GroundTruthTaskType;
  /** IAM role for the labeling job */
  readonly role: IRole;
  /** S3 URI for the input manifest file */
  readonly inputManifestS3Uri: string;
  /** S3 URI for labeling output */
  readonly outputS3Uri: string;
  /** KMS key for output encryption */
  readonly outputKmsKey: IKey;
  /** S3 URI for the labeling UI template */
  readonly templateS3Uri?: string;
  /** S3 URI for the labeling categories file */
  readonly categoriesS3Uri: string;
  /** Labeling task configuration */
  readonly labelingTaskConfig: GroundTruthLabelingTaskConfig;
  /**
   * Pre-annotation Lambda.
   * For built-in task types, AWS provides default pre-annotation Lambdas derived
   * from the task type and region. Only specify this to override the default or
   * for custom annotation workflows.
   */
  readonly preAnnotationLambda?: IFunction;
  /**
   * Post-annotation (consolidation) Lambda.
   * For built-in task types, AWS provides default consolidation Lambdas derived
   * from the task type and region. Only specify this to override the default or
   * for custom annotation workflows.
   */
  readonly postAnnotationLambda?: IFunction;
  /** Optional verification step configuration */
  readonly verification?: GroundTruthVerificationConfig;
}

/**
 * A construct for creating SageMaker Ground Truth labeling job configurations.
 * Supports image and text labeling task types with optional verification.
 *
 * Note: SageMaker Ground Truth labeling jobs do not have a CloudFormation resource type.
 * This construct stores the job configuration as SSM parameters for use by
 * the L3 Step Functions orchestration workflow.
 */
export class MdaaGroundTruth extends Construct {
  /** The resolved labeling job name */
  public readonly jobName: string;

  /**
   * The labeling output attribute name for this task type.
   * Semantic segmentation uses 'label-ref'; all other task types use 'label'.
   * The downstream Step Functions workflow uses this to locate annotation results.
   */
  public readonly labelingAttributeName: string;

  constructor(scope: Construct, id: string, props: MdaaGroundTruthProps) {
    super(scope, id);

    this.jobName = props.naming.resourceName(props.jobName, 63);
    this.labelingAttributeName = props.taskType === 'image_semantic_segmentation' ? 'label-ref' : 'label';

    const param = (name: string, value: string) =>
      new MdaaParamAndOutput(
        this,
        { ...props, resourceType: 'ground-truth', resourceId: props.jobName, name, value },
        scope,
      );

    // Core job identity
    param('job-name', this.jobName);
    param('task-type', props.taskType);
    param('role-arn', props.role.roleArn);
    param('labeling-attribute-name', this.labelingAttributeName);

    // Input / output
    param('input-manifest-s3-uri', props.inputManifestS3Uri);
    param('output-s3-uri', props.outputS3Uri);
    param('output-kms-key-id', props.outputKmsKey.keyArn);

    // UI template and categories
    if (props.templateS3Uri) param('template-s3-uri', props.templateS3Uri);
    param('categories-s3-uri', props.categoriesS3Uri);

    // Labeling task config
    param('workteam-arn', props.labelingTaskConfig.workteamArn);
    param('task-title', props.labelingTaskConfig.taskTitle);
    param('task-description', props.labelingTaskConfig.taskDescription);
    this.registerTaskConfigParams(param, props.labelingTaskConfig, '', props.labelingTaskConfig.taskKeywords);

    // Lambda hooks
    if (props.preAnnotationLambda) param('pre-annotation-lambda-arn', props.preAnnotationLambda.functionArn);
    if (props.postAnnotationLambda) param('post-annotation-lambda-arn', props.postAnnotationLambda.functionArn);

    // Verification step
    if (props.verification) this.registerVerificationParams(param, props.verification);
  }

  private registerTaskConfigParams(
    param: (name: string, value: string) => void,
    config: GroundTruthTaskConfigBase,
    prefix: string,
    taskKeywords?: string[],
  ): void {
    if (taskKeywords) param(`${prefix}task-keywords`, JSON.stringify(taskKeywords));
    if (config.numberOfHumanWorkersPerDataObject !== undefined) {
      validateNumberOfHumanWorkersPerDataObject(config.numberOfHumanWorkersPerDataObject);
      param(`${prefix}workers-per-object`, String(config.numberOfHumanWorkersPerDataObject));
    }
    if (config.taskTimeLimitInSeconds !== undefined) {
      validateTaskTimeLimitInSeconds(config.taskTimeLimitInSeconds);
      param(`${prefix}task-time-limit`, String(config.taskTimeLimitInSeconds));
    }
    if (config.taskAvailabilityLifetimeInSeconds !== undefined) {
      validateTaskAvailabilityLifetimeInSeconds(config.taskAvailabilityLifetimeInSeconds);
      param(`${prefix}task-availability-lifetime`, String(config.taskAvailabilityLifetimeInSeconds));
    }
    if (config.taskPrice !== undefined) {
      param(`${prefix}task-price`, serializeTaskPrice(config.taskPrice));
    }
  }

  private registerVerificationParams(
    param: (name: string, value: string) => void,
    verification: GroundTruthVerificationConfig,
  ): void {
    param('verification-enabled', 'true');
    param('verification-workteam-arn', verification.workteamArn);
    if (verification.templateS3Uri) param('verification-template-s3-uri', verification.templateS3Uri);
    if (verification.categoriesS3Uri) param('verification-categories-s3-uri', verification.categoriesS3Uri);
    param('verification-task-title', verification.taskTitle);
    param('verification-task-description', verification.taskDescription);
    this.registerTaskConfigParams(param, verification, 'verification-', verification.taskKeywords);
  }
}
