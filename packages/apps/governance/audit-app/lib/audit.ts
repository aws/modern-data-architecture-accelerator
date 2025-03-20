/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditL3Construct, AuditL3ConstructProps } from '@aws-mdaa/audit-l3-construct';
import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { AuditConfigParser } from './audit-config';

export class AuditCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new AuditConfigParser(stack, parserProps);
    const constructProps: AuditL3ConstructProps = {
      ...{
        sourceAccounts: appConfig.sourceAccounts,
        sourceRegions: appConfig.sourceRegions,
        readRoleRefs: appConfig.readRoleRefs,
        bucketInventories: appConfig.inventories,
        inventoryPrefix: appConfig.inventoryPrefix,
      },
      ...l3ConstructProps,
    };

    new AuditL3Construct(stack, 'audit', constructProps);
    return [stack];
  }
}
