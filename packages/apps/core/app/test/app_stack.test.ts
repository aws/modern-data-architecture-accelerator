/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProps, Stack } from 'aws-cdk-lib';
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
// eslint-disable-next-line prettier/prettier
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
});
