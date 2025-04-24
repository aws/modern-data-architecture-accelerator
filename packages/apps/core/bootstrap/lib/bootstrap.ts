/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { AppProps, Stack } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

export class MdaaBootstrapCDKApp extends MdaaCdkApp {
  constructor(props?: AppProps) {
    super({ ...props, ...{ useBootstrap: false } }, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(stack: Stack, l3ConstructProps: MdaaL3ConstructProps) {
    this.createRoleHelperResources(stack, l3ConstructProps.naming);
  }

  private createRoleHelperResources(stack: Stack, naming: IMdaaResourceNaming) {
    const roleHelper = new MdaaRoleHelper(stack, naming);
    const serviceToken = roleHelper.createProviderServiceToken();
    new StringParameter(stack, `role-helper-service-token-param`, {
      parameterName: naming.ssmPath(`role-helper-service-token`, true, false),
      stringValue: serviceToken,
    });
  }
}
