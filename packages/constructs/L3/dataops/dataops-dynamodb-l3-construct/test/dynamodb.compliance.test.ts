/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { DynamodbL3Construct, DynamodbL3ConstructProps, DynamodbProps } from '../lib';
import { AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';

describe('MDAA DynamoDB Construct Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const dynamoDefinition: DynamodbProps = {
    partitionKey: {
      name: 'pk',
      type: AttributeType.STRING,
    },
    sortKey: {
      name: 'sk',
      type: AttributeType.NUMBER,
    },
    billingMode: BillingMode.PAY_PER_REQUEST,
    timeToLiveAttribute: 'expiry',
  };

  const constructProps: DynamodbL3ConstructProps = {
    projectKMSArn: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
    tableDefinitions: { 'test-table': dynamoDefinition },
    projectName: 'test-project',
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new DynamodbL3Construct(stack, 'test-ddb-stack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('Validate resource counts', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.resourceCountIs('AWS::SSM::Parameter', 1);
  });

  test('DynamoDB Table Properties', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' },
        { AttributeName: 'sk', AttributeType: 'N' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
      SSESpecification: {
        SSEEnabled: true,
        KMSMasterKeyId: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
      },
      TimeToLiveSpecification: {
        AttributeName: 'expiry',
        Enabled: true,
      },
    });
  });

  test('SSM Parameter Creation', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-project/dynamodb/name/test-table',
      Type: 'String',
    });
  });

  test('KMS Encryption Validation', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      SSESpecification: {
        KMSMasterKeyId: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
      },
    });
  });
});
