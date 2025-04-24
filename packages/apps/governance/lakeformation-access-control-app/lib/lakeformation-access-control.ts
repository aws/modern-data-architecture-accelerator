/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import {
  LakeFormationAccessControlL3Construct,
  LakeFormationAccessControlL3ConstructProps,
} from '@aws-mdaa/lakeformation-access-control-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { LakeFormationAccessControlConfigParser } from './lakeformation-access-control-config';

export class LakeFormationCdkApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new LakeFormationAccessControlConfigParser(stack, parserProps);
    const constructProps: LakeFormationAccessControlL3ConstructProps = {
      ...{
        resourceLinks: appConfig.resourceLinks,
        grants: appConfig.grants,
      },
      ...l3ConstructProps,
    };

    new LakeFormationAccessControlL3Construct(stack, 'access', constructProps);
    return [stack];
  }
}
