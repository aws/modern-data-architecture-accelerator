/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DynamodbCDKApp } from '../lib/dataops-dynamodb';
import { Template } from 'aws-cdk-lib/assertions';

test('SynthTest', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './test/test-config.yaml',
  };
  const app = new DynamodbCDKApp({ context: context });
  const stack = app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::DynamoDB::Table', 2);

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TableName: 'test-org-test-env-test-domain-test-module-table-complex',
    KeySchema: [
      { AttributeName: 'pk1', KeyType: 'HASH' },
      { AttributeName: 'sk1', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk1', AttributeType: 'S' },
      { AttributeName: 'sk1', AttributeType: 'S' },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 2,
      WriteCapacityUnits: 1,
    },
    TimeToLiveSpecification: {
      AttributeName: 'ttl',
      Enabled: true,
    },
  });

  // Verify the SSM Parameter is created with the expected name
  template.hasResourceProperties('AWS::SSM::Parameter', {
    Name: '/test-org/test-domain/dataops-project-sample/dynamodb/name/table-complex',
    Type: 'String',
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TableName: 'test-org-test-env-test-domain-test-module-table-simple',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'pk1', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'pk1', AttributeType: 'S' }],
  });

  // Verify the SSM Parameter is created with the expected name
  template.hasResourceProperties('AWS::SSM::Parameter', {
    Name: '/test-org/test-domain/dataops-project-sample/dynamodb/name/table-simple',
    Type: 'String',
  });
});
