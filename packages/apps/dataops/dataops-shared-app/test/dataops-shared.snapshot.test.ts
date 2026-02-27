/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { snapShotTest, snapShotTestApp, Create } from '@aws-mdaa/testing';
import { MdaaDataOpsConfigParser, MdaaDataOpsConfigContents } from '../lib/dataops-shared-config';
import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { MdaaStringParameter } from '@aws-mdaa/construct';
import { Schema } from 'ajv';
import * as path from 'path';

interface TestDataOpsConfigContents extends MdaaDataOpsConfigContents {
  readonly testParameter?: string;
}

class TestDataOpsConfigParser extends MdaaDataOpsConfigParser<TestDataOpsConfigContents> {
  public readonly testParameter?: string;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, {} as Schema);
    this.testParameter = this.configContents.testParameter;
  }
}

class TestDataOpsSharedApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const configParser = new TestDataOpsConfigParser(stack, parserProps);
    if (configParser.securityConfigurationName) {
      new MdaaStringParameter(stack, 'SecurityConfigParam', {
        parameterName: l3ConstructProps.naming.ssmPath('security-config-name', true, false),
        stringValue: configParser.securityConfigurationName,
        description: 'DataOps security configuration name',
      });
    }
    if (configParser.projectName) {
      new MdaaStringParameter(stack, 'ProjectNameParam', {
        parameterName: l3ConstructProps.naming.ssmPath('project-name', true, false),
        stringValue: configParser.projectName,
        description: 'DataOps project name',
      });
    }
    if (configParser.projectBucket) {
      new MdaaStringParameter(stack, 'ProjectBucketParam', {
        parameterName: l3ConstructProps.naming.ssmPath('project-bucket', true, false),
        stringValue: configParser.projectBucket,
        description: 'DataOps project bucket reference',
      });
    }
    if (configParser.projectTopicArn) {
      new MdaaStringParameter(stack, 'ProjectTopicParam', {
        parameterName: l3ConstructProps.naming.ssmPath('project-topic-arn', true, false),
        stringValue: configParser.projectTopicArn,
        description: 'DataOps project topic ARN reference',
      });
    }
    if (configParser.deploymentRole) {
      new MdaaStringParameter(stack, 'DeploymentRoleParam', {
        parameterName: l3ConstructProps.naming.ssmPath('deployment-role', true, false),
        stringValue: configParser.deploymentRole,
        description: 'DataOps deployment role reference',
      });
    }
    if (configParser.kmsArn) {
      new MdaaStringParameter(stack, 'KmsArnParam', {
        parameterName: l3ConstructProps.naming.ssmPath('kms-arn', true, false),
        stringValue: configParser.kmsArn,
        description: 'DataOps KMS ARN reference',
      });
    }

    if (configParser.testParameter) {
      new MdaaStringParameter(stack, 'TestParam', {
        parameterName: l3ConstructProps.naming.ssmPath('test-parameter', true, false),
        stringValue: configParser.testParameter,
        description: 'Test parameter for DataOps shared config',
      });
    }

    return [stack];
  }
}
snapShotTest(
  'DataOps Shared Config',
  Create.stackProvider(
    'DataOpsSharedStackProject',
    (_, context) => {
      const moduleApp = new TestDataOpsSharedApp({
        context: {
          ...context,
          module_configs: path.join(__dirname, 'test-config.yaml'),
        },
      });
      return moduleApp.generateStack();
    },
    {
      module_name: 'test-dataops-shared-project',
      org: 'analytics-org',
      env: 'prod',
      domain: 'data-platform',
    },
  ),
);

snapShotTestApp(
  'DataOps Shared App',
  Create.appProvider(
    context => {
      const moduleApp = new TestDataOpsSharedApp({
        context: {
          ...context,
          module_configs: path.join(__dirname, 'test-config.yaml'),
        },
      });
      moduleApp.generateStack();
      return moduleApp;
    },
    {
      module_name: 'test-dataops-shared-app',
      org: 'test-org',
      env: 'test-env',
      domain: 'test-domain',
    },
  ),
);
