/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SageMakerEndpointConfigParser } from './sagemaker-endpoint-config';
import {
  SageMakerEndpointL3Construct,
  SageMakerEndpointL3ConstructProps,
} from '@aws-mdaa/sagemaker-model-deploy-l3-construct';

/**
 * SageMaker Endpoint App — creates a real-time inference endpoint via pure CDK.
 *
 * This app creates the endpoint resources (CfnModel, CfnEndpointConfig, CfnEndpoint)
 * directly in CloudFormation with full MDAA compliance, replacing the CodeBuild-based
 * approach that delegates to seed code.
 *
 * Creates:
 * - CfnModel (from approved ModelPackage)
 * - CfnEndpointConfig (KMS encrypted, optional data capture)
 * - CfnEndpoint
 * - MdaaRole for model execution
 * - MdaaKmsKey for endpoint encryption
 *
 * Exports via SSM:
 * - endpoint-name, endpoint-arn, model-name, kms-key-id
 */
export class SageMakerEndpointApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const config = new SageMakerEndpointConfigParser(stack, parserProps);

    const constructProps: SageMakerEndpointL3ConstructProps = {
      ...l3ConstructProps,
      projectName: config.projectName,
      domainId: config.domainId,
      domainArn: config.domainArn,
      modelPackageArn: config.modelPackageArn,
      modelBucketName: config.modelBucketName,
      stageName: config.stageName,
      productionVariant: config.productionVariant,
      dataCaptureConfig: config.dataCaptureConfig,
      networkConfig: config.networkConfig,
      modelArtifactKmsKeyArn: config.modelArtifactKmsKeyArn,
    };

    new SageMakerEndpointL3Construct(stack, 'endpoint', constructProps);
    return [stack];
  }
}
