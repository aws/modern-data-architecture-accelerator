/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import {
  DataOpsDataQualityL3Construct,
  DataOpsDataQualityL3ConstructProps,
} from '@aws-mdaa/dataops-data-quality-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataQualityConfigParser } from './dataops-data-quality-config';

export class DataQualityCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new DataQualityConfigParser(stack, parserProps);

    const constructProps: DataOpsDataQualityL3ConstructProps = {
      rulesetConfigs: appConfig.rulesetConfigs,
      dynamicTargets: appConfig.dynamicTargets,
      projectName: appConfig.projectName,
      smusPublishing: appConfig.smusPublishing,
      ...l3ConstructProps,
    };

    new DataOpsDataQualityL3Construct(stack, 'construct', constructProps);
    return [stack];
  }
}
