/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Template } from 'aws-cdk-lib/assertions';
import { BedrockAgentcoreRuntimeApp } from '../lib';
import * as path from 'node:path';

test('SnapshotTest', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: path.join(__dirname, 'test-config.yaml'),
  };
  const app = new BedrockAgentcoreRuntimeApp({ context: context });
  const stack = app.generateStack();
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
