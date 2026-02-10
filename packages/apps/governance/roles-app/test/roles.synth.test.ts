/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GenerateRolesCDKApp } from '../lib/roles';
import { Template } from 'aws-cdk-lib/assertions';

test('SynthTest', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './test/test-config.yaml',
  };
  const app = new GenerateRolesCDKApp({ context: context });
  const appStack = app.generateStack();
  const template = Template.fromStack(appStack);

  // check verbatim feature
  template.hasResourceProperties('AWS::IAM::Role', {
    RoleName: 'test-org-test-env-test-domain-test-module-application_--65040600',
  });
  template.hasResourceProperties('AWS::IAM::Role', {
    RoleName: 'test-role-verbatim',
  });

  // test the synthesis
  const res = app.synth({
    force: true,
    validateOnSynthesis: true,
  });
  expect(res.stacks.length).toEqual(1);
});
