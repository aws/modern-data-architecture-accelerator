/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProps, Stack } from 'aws-cdk-lib';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaCdkApp } from '../lib';
import * as utils from '../lib/utils';

jest.mock('../lib/utils', () => ({
  ...jest.requireActual('../lib/utils'),
  readYamlFile: jest.fn(),
}));
const mockedUtils = utils as jest.Mocked<typeof utils>;

class TestMdaaCdkApp extends MdaaCdkApp {
  constructor(appProps: AppProps) {
    super(appProps);
  }

  protected subGenerateResources(stack: Stack) {
    return [stack];
  }
}

const context = {
  org: 'testorg',
  domain: 'testdomain',
  env: 'testenv',
  module_name: 'testmodule',
};

// prettier-ignore
const extraContext = {
  nag_suppressions: {
    by_path: [
      {
        path: '/sample-org-dev-shared-datawarehouse/cluster/Secret/Resource',
        suppressions: [{ id: 'AwsSolutions-SMG4', reason: 'Examplesuppression' }],
      },
    ],
  },
  tag_config_data: '{"test-tag-key":"test-tag-val"}',
  module_config_data: '{"test-key":"test-val"}',
  module_configs: './test/test_config1.yaml,./test/test_config2.yaml',
  tag_configs: './test/tag_config.yaml',
  custom_aspects:
    '[{"aspect_module":"./test/custom_aspect","aspect_class":"SampleCustomAspect","aspect_props":{"permissionsBoundaryArn":"some-test-arn"}}]',
  additional_stacks: '[{"account":"109876543210"}]',
  allow_cross_reference_stack: 'true',
};
describe('Test App Stack', () => {
  beforeEach(() => {
    mockedUtils.readYamlFile.mockReturnValue({ test: 'value', other: 'data' });
  });

  test('App stringy context values', () => {
    expect(() => {
      const testApp = new TestMdaaCdkApp({
        context: {
          module_configs: '"abc.yaml,efg.yaml"',
          use_bootstrap: '"true"',
          log_suppressions: '"false"',
          ...context,
        },
      });
      testApp.generateStack();
    }).not.toThrow();

    expect(mockedUtils.readYamlFile).toHaveBeenCalledWith('abc.yaml');
    expect(mockedUtils.readYamlFile).toHaveBeenCalledWith('efg.yaml');
  });

  test('App Extra Context', () => {
    expect(() => {
      const testApp = new TestMdaaCdkApp({ context: { ...extraContext, ...context } });
      testApp.generateStack();
    }).not.toThrow();
  });

  test('App Extra Stacks', () => {
    expect(() => {
      const testApp = new TestMdaaCdkApp({
        context: {
          ...extraContext,
          ...context,
          additional_stacks: '[{"account":"109876543210"},{"account":"012345678901"}]',
        },
      });
      testApp.generateStack();
    }).not.toThrow();
  });

  test('Permissions boundary applied when context value present', () => {
    const testApp = new TestMdaaCdkApp({
      context: {
        ...context,
        permissions_boundary_arn: 'arn:aws:iam::123456789012:policy/test-boundary-policy',
      },
    });
    const stack = testApp.generateStack();
    // Create a role so we can verify the boundary is applied
    new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    const template = Template.fromStack(stack);

    const roles = template.findResources('AWS::IAM::Role');
    const roleKeys = Object.keys(roles);
    expect(roleKeys.length).toBeGreaterThan(0);
    for (const key of roleKeys) {
      expect(roles[key].Properties.PermissionsBoundary).toBeDefined();
      expect(JSON.stringify(roles[key].Properties.PermissionsBoundary)).toContain('test-boundary-policy');
    }
  });

  test('No permissions boundary when context value absent', () => {
    const testApp = new TestMdaaCdkApp({
      context: { ...context },
    });
    const stack = testApp.generateStack();
    new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    const template = Template.fromStack(stack);

    const roles = template.findResources('AWS::IAM::Role');
    for (const key of Object.keys(roles)) {
      expect(roles[key].Properties?.PermissionsBoundary).toBeUndefined();
    }
  });

  test('Permissions boundary coexists with custom_aspects boundary pattern', () => {
    const testApp = new TestMdaaCdkApp({
      context: {
        ...extraContext,
        ...context,
        permissions_boundary_arn: 'arn:aws:iam::123456789012:policy/first-class-boundary',
      },
    });
    const stack = testApp.generateStack();
    new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    const template = Template.fromStack(stack);

    // The first-class permissions_boundary_arn should be applied to all roles
    const roles = template.findResources('AWS::IAM::Role');
    const roleKeys = Object.keys(roles);
    expect(roleKeys.length).toBeGreaterThan(0);
    for (const key of roleKeys) {
      expect(roles[key].Properties.PermissionsBoundary).toBeDefined();
      expect(JSON.stringify(roles[key].Properties.PermissionsBoundary)).toContain('first-class-boundary');
    }
  });
});
