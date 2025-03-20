/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { GlueCatalogL3Construct, GlueCatalogL3ConstructProps } from '@aws-mdaa/glue-catalog-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';

import { GlueCatalogConfigParser } from './glue-catalog-config';

export class GlueCatalogSettingsCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new GlueCatalogConfigParser(stack, parserProps);
    const constructProps: GlueCatalogL3ConstructProps = {
      ...appConfig,
      ...l3ConstructProps,
    };

    new GlueCatalogL3Construct(stack, 'construct', constructProps);
    return [stack];
  }
}
