/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import {
  QuickSightProjectL3Construct,
  QuickSightProjectL3ConstructProps,
} from '@aws-mdaa/quicksight-project-l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { QuickSightProjectConfigParser } from './quicksight-project-config';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';

export class QuickSightProjectCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new QuickSightProjectConfigParser(stack, parserProps);
    const constructProps: QuickSightProjectL3ConstructProps = {
      ...appConfig,
      ...l3ConstructProps,
    };
    new QuickSightProjectL3Construct(stack, 'project', constructProps);
    return [stack];
  }
}
