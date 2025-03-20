/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import { MdaaDataOpsConfigContents, MdaaDataOpsConfigParser } from '../lib';
import { MdaaTestApp } from '@aws-mdaa/testing';

describe('Dataops Shared Config Parser Testing', () => {
  interface TestConfigContents extends MdaaDataOpsConfigContents {
    testing: string;
  }

  class TestDataOpsConfigParser extends MdaaDataOpsConfigParser<TestConfigContents> {
    constructor(stack: Stack, props: MdaaAppConfigParserProps, configSchema: Schema) {
      super(stack, props, configSchema);
    }
  }

  const testApp = new MdaaTestApp();
  const testStack = new Stack(testApp, 'testStack');
  const parserProps: MdaaAppConfigParserProps = {
    org: 'test-org',
    domain: 'test-domain',
    environment: 'test-env',
    module_name: 'test-module',
    rawConfig: {
      testing_ssm: 'ssm:some-ssm-path',
      testing: 'some-value',
      projectName: 'someproject',
    },
    naming: testApp.naming,
  };
  test('Constructor', () => {
    expect(() => {
      new TestDataOpsConfigParser(testStack, parserProps, {});
    }).not.toThrow();
  });
});
