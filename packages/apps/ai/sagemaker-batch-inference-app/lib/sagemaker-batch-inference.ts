/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SageMakerBatchInferenceConfigParser } from './sagemaker-batch-inference-config';
import {
  SageMakerBatchInferenceL3Construct,
  SageMakerBatchInferenceL3ConstructProps,
} from '@aws-mdaa/sagemaker-batch-inference-l3-construct';

export class SageMakerBatchInferenceApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const config = new SageMakerBatchInferenceConfigParser(stack, parserProps);
    const constructProps: SageMakerBatchInferenceL3ConstructProps = {
      ...l3ConstructProps,
      projectName: config.projectName,
      domainId: config.domainId,
      domainArn: config.domainArn,
      modelPackageGroupName: config.modelPackageGroupName,
      modelBucketName: config.modelBucketName,
      trainingPipelineBucketName: config.trainingPipelineBucketName,
      inputDataS3Uri: config.inputDataS3Uri,
      outputDataS3Prefix: config.outputDataS3Prefix,
      instanceType: config.instanceType,
      instanceCount: config.instanceCount,
      baseJobPrefix: config.baseJobPrefix,
      seedCodePath: config.seedCodePath,
      sourceType: config.sourceType,
      codeStarConnection: config.codeStarConnection,
      enableNetworkIsolation: config.enableNetworkIsolation,
      subnetIds: config.subnetIds,
      securityGroupIds: config.securityGroupIds,
      additionalReadBucketNames: config.additionalReadBucketNames,
      additionalWriteBucketNames: config.additionalWriteBucketNames,
    };
    new SageMakerBatchInferenceL3Construct(stack, 'batch-inference', constructProps);
    return [stack];
  }
}
