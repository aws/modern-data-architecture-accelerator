/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { SourceType, CodeStarConnectionConfig } from '@aws-mdaa/sm-shared';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface SageMakerBatchInferenceConfigContents extends MdaaBaseConfigContents {
  /** SageMaker project name */
  readonly projectName: string;
  /** SageMaker domain ID */
  readonly domainId?: string;
  /** SageMaker domain ARN */
  readonly domainArn?: string;
  /** Model Package Group name */
  readonly modelPackageGroupName: string;
  /** Model bucket name */
  readonly modelBucketName: string;
  /** Training pipeline bucket name (where model.tar.gz lives) */
  readonly trainingPipelineBucketName?: string;
  /** S3 URI for batch input data */
  readonly inputDataS3Uri?: string;
  /** S3 prefix for batch output */
  readonly outputDataS3Prefix?: string;
  /** Instance type for batch transform (default: ml.m5.xlarge) */
  readonly instanceType?: string;
  /** Instance count (default: 1) */
  readonly instanceCount?: number;
  /** Base job prefix */
  readonly baseJobPrefix?: string;
  /** Path to seed code directory or zip file (required). */
  readonly seedCodePath?: string;
  /** Source repository type (default: CODECOMMIT) */
  readonly sourceType?: SourceType;
  /** CodeStar Connections config */
  readonly codeStarConnection?: CodeStarConnectionConfig;
  /** Enable network isolation for SageMaker jobs */
  readonly enableNetworkIsolation?: boolean;
  /** Subnet IDs for SageMaker jobs (VPC mode) */
  readonly subnetIds?: string[];
  /** Security group IDs for SageMaker jobs (VPC mode) */
  readonly securityGroupIds?: string[];
  /** Additional S3 bucket names for read access */
  readonly additionalReadBucketNames?: string[];
  /** Additional S3 bucket names for write access */
  readonly additionalWriteBucketNames?: string[];
}

export class SageMakerBatchInferenceConfigParser extends MdaaAppConfigParser<SageMakerBatchInferenceConfigContents> {
  public readonly projectName: string;
  public readonly domainId?: string;
  public readonly domainArn?: string;
  public readonly modelPackageGroupName: string;
  public readonly modelBucketName: string;
  public readonly trainingPipelineBucketName?: string;
  public readonly inputDataS3Uri?: string;
  public readonly outputDataS3Prefix?: string;
  public readonly instanceType?: string;
  public readonly instanceCount?: number;
  public readonly baseJobPrefix?: string;
  public readonly seedCodePath?: string;
  public readonly sourceType?: SourceType;
  public readonly codeStarConnection?: CodeStarConnectionConfig;
  public readonly enableNetworkIsolation?: boolean;
  public readonly subnetIds?: string[];
  public readonly securityGroupIds?: string[];
  public readonly additionalReadBucketNames?: string[];
  public readonly additionalWriteBucketNames?: string[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.projectName = this.configContents.projectName;
    this.domainId = this.configContents.domainId;
    this.domainArn = this.configContents.domainArn;
    this.modelPackageGroupName = this.configContents.modelPackageGroupName;
    this.modelBucketName = this.configContents.modelBucketName;
    this.trainingPipelineBucketName = this.configContents.trainingPipelineBucketName;
    this.inputDataS3Uri = this.configContents.inputDataS3Uri;
    this.outputDataS3Prefix = this.configContents.outputDataS3Prefix;
    this.instanceType = this.configContents.instanceType;
    this.instanceCount = this.configContents.instanceCount;
    this.baseJobPrefix = this.configContents.baseJobPrefix;
    this.seedCodePath = this.configContents.seedCodePath;
    this.sourceType = this.configContents.sourceType;
    this.codeStarConnection = this.configContents.codeStarConnection;
    this.enableNetworkIsolation = this.configContents.enableNetworkIsolation;
    this.subnetIds = this.configContents.subnetIds;
    this.securityGroupIds = this.configContents.securityGroupIds;
    this.additionalReadBucketNames = this.configContents.additionalReadBucketNames;
    this.additionalWriteBucketNames = this.configContents.additionalWriteBucketNames;
  }
}
