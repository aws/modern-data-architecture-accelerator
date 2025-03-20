/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditTrailL3Construct, AuditTrailL3ConstructProps } from '@aws-mdaa/audit-trail-l3-construct';
import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { AuditTrailConfigParser } from './audit-trail-config';

export class AuditTrailCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new AuditTrailConfigParser(stack, parserProps);
    const constructProps: AuditTrailL3ConstructProps = {
      trail: appConfig.trail,
      ...l3ConstructProps,
    };

    new AuditTrailL3Construct(stack, 'audit-trail', constructProps);
    return [stack];
  }
}
