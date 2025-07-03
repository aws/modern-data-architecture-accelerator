/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DMSCDKApp } from '../lib/dms';
import { Template } from 'aws-cdk-lib/assertions';

test('SynthTest', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './test/test-config.yaml',
  };
  const app = new DMSCDKApp({ context: context });
  const stack = app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::DMS::Endpoint', 2);
  template.resourceCountIs('AWS::IAM::Role', 1);
  template.hasResourceProperties('AWS::IAM::Role', {
    RoleName: 'dms-vpc-role',
    ManagedPolicyArns: [
      {
        'Fn::Join': [
          '',
          ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/service-role/AmazonDMSVPCManagementRole'],
        ],
      },
    ],
  });
});
