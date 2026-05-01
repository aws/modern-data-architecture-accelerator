/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  EndpointProductionVariant,
  EndpointDataCaptureConfig,
  EndpointNetworkConfig,
} from '@aws-mdaa/sagemaker-model-deploy-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface SageMakerEndpointConfigContents extends MdaaBaseConfigContents {
  /** SageMaker project name */
  readonly projectName: string;
  /** SageMaker domain ID (for tagging) */
  readonly domainId?: string;
  /** SageMaker domain ARN (for tagging) */
  readonly domainArn?: string;
  /** ARN of the approved Model Package to deploy */
  readonly modelPackageArn: string;
  /** S3 bucket name containing model artifacts */
  readonly modelBucketName: string;
  /** Stage name (e.g. 'dev', 'preprod', 'prod') */
  readonly stageName: string;
  /** Production variant configuration */
  readonly productionVariant?: EndpointProductionVariant;
  /** Data capture configuration */
  readonly dataCaptureConfig?: EndpointDataCaptureConfig;
  /** Network configuration */
  readonly networkConfig?: EndpointNetworkConfig;
  /** Optional external KMS key ARN for cross-account model artifact decryption */
  readonly modelArtifactKmsKeyArn?: string;
}

export class SageMakerEndpointConfigParser extends MdaaAppConfigParser<SageMakerEndpointConfigContents> {
  public readonly projectName: string;
  public readonly domainId?: string;
  public readonly domainArn?: string;
  public readonly modelPackageArn: string;
  public readonly modelBucketName: string;
  public readonly stageName: string;
  public readonly productionVariant?: EndpointProductionVariant;
  public readonly dataCaptureConfig?: EndpointDataCaptureConfig;
  public readonly networkConfig?: EndpointNetworkConfig;
  public readonly modelArtifactKmsKeyArn?: string;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.projectName = this.configContents.projectName;
    this.domainId = this.configContents.domainId;
    this.domainArn = this.configContents.domainArn;
    this.modelPackageArn = this.configContents.modelPackageArn;
    this.modelBucketName = this.configContents.modelBucketName;
    this.stageName = this.configContents.stageName;
    this.productionVariant = this.configContents.productionVariant;
    this.dataCaptureConfig = this.configContents.dataCaptureConfig;
    this.networkConfig = this.configContents.networkConfig;
    this.modelArtifactKmsKeyArn = this.configContents.modelArtifactKmsKeyArn;
  }
}
