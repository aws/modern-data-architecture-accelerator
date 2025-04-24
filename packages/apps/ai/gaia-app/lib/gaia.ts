/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { GAIAL3Construct, GAIAL3ConstructProps } from '@aws-mdaa/gaia-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { GAIAConfigParser } from './gaia-config';

export class GAIAApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new GAIAConfigParser(stack, parserProps);

    const constructProps: GAIAL3ConstructProps = {
      ...{
        gaia: appConfig.gaia,
      },
      ...l3ConstructProps,
    };
    new GAIAL3Construct(stack, 'gaia', constructProps);
    return [stack];
  }
}
