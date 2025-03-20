/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { GlueWorkflowL3Construct, GlueWorkflowL3ConstructProps } from '@aws-mdaa/dataops-workflow-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { GlueWorkflowConfigParser } from './dataops-workflow-config';

export class GlueWorkflowCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new GlueWorkflowConfigParser(stack, parserProps);
    const constructProps: GlueWorkflowL3ConstructProps = {
      ...{
        kmsArn: appConfig.kmsArn,
        workflowDefinitions: appConfig.workflowDefinitions,
        securityConfigurationName: appConfig.securityConfigurationName,
        projectName: appConfig.projectName,
      },
      ...l3ConstructProps,
    };
    new GlueWorkflowL3Construct(stack, 'construct', constructProps);
    return [stack];
  }
}
