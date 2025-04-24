/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SagemakerConfigParser } from './sagemaker-config';
import { DataZoneL3Construct, DataZoneL3ConstructProps } from '@aws-mdaa/datazone-l3-construct';

export class SagemakerCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new SagemakerConfigParser(stack, parserProps);
    const constructProps: DataZoneL3ConstructProps = {
      domains: appConfig.domains,
      ...l3ConstructProps,
    };

    new DataZoneL3Construct(stack, 'datazone', constructProps);
    return [stack];
  }
}
