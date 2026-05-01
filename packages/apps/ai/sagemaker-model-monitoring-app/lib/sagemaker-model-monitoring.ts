/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SageMakerModelMonitoringConfigParser } from './sagemaker-model-monitoring-config';
import {
  SageMakerModelMonitoringL3Construct,
  SageMakerModelMonitoringL3ConstructProps,
} from '@aws-mdaa/sagemaker-model-monitoring-l3-construct';

export class SageMakerModelMonitoringApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const config = new SageMakerModelMonitoringConfigParser(stack, parserProps);
    const constructProps: SageMakerModelMonitoringL3ConstructProps = {
      ...l3ConstructProps,
      endpointName: config.endpointName,
      monitors: config.monitors,
      vpcId: config.vpcId,
      subnetIds: config.subnetIds,
      securityGroupIds: config.securityGroupIds,
      modelBucketArn: config.modelBucketArn,
      networkIsolation: config.networkIsolation,
      kmsKeyArn: config.kmsKeyArn,
      baselineTrainingDataS3Uri: config.baselineTrainingDataS3Uri,
      baselineOutputDataS3Uri: config.baselineOutputDataS3Uri,
      baselineSchedule: config.baselineSchedule,
      baselineDatasetFormat: config.baselineDatasetFormat,
    };
    new SageMakerModelMonitoringL3Construct(stack, 'model-monitoring', constructProps);
    return [stack];
  }
}
