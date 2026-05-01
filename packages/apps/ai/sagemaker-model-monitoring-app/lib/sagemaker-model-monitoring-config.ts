/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { MonitorsMap } from '@aws-mdaa/sagemaker-model-monitoring-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface SageMakerModelMonitoringConfigContents extends MdaaBaseConfigContents {
  /** Name of the SageMaker endpoint to monitor */
  readonly endpointName: string;
  /** Map of monitor type to config */
  readonly monitors: MonitorsMap;
  /** VPC ID for monitoring jobs */
  readonly vpcId?: string;
  /** Subnet IDs for monitoring jobs */
  readonly subnetIds?: string[];
  /** Security group IDs for monitoring jobs */
  readonly securityGroupIds?: string[];
  /** S3 bucket ARN for model artifacts */
  readonly modelBucketArn?: string;
  /** Enable network isolation for monitoring jobs */
  readonly networkIsolation?: boolean;
  /** KMS key ARN for encryption (if omitted, a new key is created) */
  readonly kmsKeyArn?: string;
  /** S3 URI for baseline training data (enables automated baselining) */
  readonly baselineTrainingDataS3Uri?: string;
  /** S3 URI for baseline output (enables automated baselining) */
  readonly baselineOutputDataS3Uri?: string;
  /** Schedule expression for periodic re-baselining */
  readonly baselineSchedule?: string;
  /** Dataset format for baselining (default: '{"csv": {"header": true}}') */
  readonly baselineDatasetFormat?: string;
}

export class SageMakerModelMonitoringConfigParser extends MdaaAppConfigParser<SageMakerModelMonitoringConfigContents> {
  public readonly endpointName: string;
  public readonly monitors: MonitorsMap;
  public readonly vpcId?: string;
  public readonly subnetIds?: string[];
  public readonly securityGroupIds?: string[];
  public readonly modelBucketArn?: string;
  public readonly networkIsolation?: boolean;
  public readonly kmsKeyArn?: string;
  public readonly baselineTrainingDataS3Uri?: string;
  public readonly baselineOutputDataS3Uri?: string;
  public readonly baselineSchedule?: string;
  public readonly baselineDatasetFormat?: string;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.endpointName = this.configContents.endpointName;
    this.monitors = this.configContents.monitors;
    this.vpcId = this.configContents.vpcId;
    this.subnetIds = this.configContents.subnetIds;
    this.securityGroupIds = this.configContents.securityGroupIds;
    this.modelBucketArn = this.configContents.modelBucketArn;
    this.networkIsolation = this.configContents.networkIsolation;
    this.kmsKeyArn = this.configContents.kmsKeyArn;
    this.baselineTrainingDataS3Uri = this.configContents.baselineTrainingDataS3Uri;
    this.baselineOutputDataS3Uri = this.configContents.baselineOutputDataS3Uri;
    this.baselineSchedule = this.configContents.baselineSchedule;
    this.baselineDatasetFormat = this.configContents.baselineDatasetFormat;
  }
}
