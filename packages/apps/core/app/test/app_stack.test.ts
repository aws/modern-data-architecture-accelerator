/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProps, Stack } from 'aws-cdk-lib';
import { MdaaCdkApp } from '../lib';

class TestMdaaCdkApp extends MdaaCdkApp {
  constructor(appProps: AppProps) {
    super(appProps);
  }
  protected subGenerateResources(stack: Stack) {
    const testStack = stack;
    return [testStack];
  }
}

const context = {
  org: 'testorg',
  domain: 'testdomain',
  env: 'testenv',
  module_name: 'testmodule',
};

const extraContext = {
  nag_suppressions: {
    by_path: [
      {
        path: '/sample-org-dev-shared-datawarehouse/cluster/Secret/Resource',
        suppressions: [{ id: 'AwsSolutions-SMG4', reason: 'Examplesuppression' }],
      },
    ],
  },
  tag_config_data: '{}',
  module_config_data: {
    'test-key': 'test-val',
  },
  module_configs: './test/test_config1.yaml,./test/test_config2.yaml',
  tag_configs: './test/tag_config.yaml',
  custom_aspects: [
    {
      aspect_module: './test/custom_aspect',
      aspect_class: 'SampleCustomAspect',
      aspect_props: { permissionsBoundaryArn: 'some-test-arn' },
    },
  ],

  additional_stacks: [{ account: '1234567890' }],
};
describe('Test App Stack', () => {
  // test('App Basic Context', () => {
  //   expect(() => {
  //     const testApp = new TestMdaaCdkApp({ context: context });
  //     testApp.generateStack();
  //   }).not.toThrow();
  // });

  test('App Extra Context', () => {
    expect(() => {
      const testApp = new TestMdaaCdkApp({ context: { ...extraContext, ...context } });
      testApp.generateStack();
    }).not.toThrow();
  });

  // test('App Service Catalog Product Stack', () => {
  //   const serviceCatalogConfig = {
  //     service_catalog_product_config:
  //       '{"portfolio_arn":"arn:test-partition:catalog:test-region:test-account:portfolio/test-portfolio","owner":"testOwner","name":"testName","launch_role_name":"test-launch-role"}',
  //   };
  //   expect(() => {
  //     const testApp = new TestMdaaCdkApp({ context: { ...serviceCatalogConfig, ...context } });
  //     testApp.generateStack();
  //   }).not.toThrow();
  // });
});
