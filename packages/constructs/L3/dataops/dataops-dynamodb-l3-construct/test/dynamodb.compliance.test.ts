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
    kmsArn: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
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

  test('Should throw error when kmsArn is missing', () => {
    const testApp2 = new MdaaTestApp();
    const propsWithoutKMS: DynamodbL3ConstructProps = {
      ...constructProps,
      kmsArn: undefined,
      roleHelper: new MdaaRoleHelper(testApp2.testStack, testApp2.naming),
      naming: testApp2.naming,
    };

    expect(() => {
      new DynamodbL3Construct(testApp2.testStack, 'test-ddb-no-kms', propsWithoutKMS);
    }).toThrow('Project KMS ARN is required for DynamoDB L3 construct');
  });
});

describe('Multiple Tables Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const table1: DynamodbProps = {
    partitionKey: { name: 'pk1', type: AttributeType.STRING },
    billingMode: BillingMode.PAY_PER_REQUEST,
  };

  const table2: DynamodbProps = {
    partitionKey: { name: 'pk2', type: AttributeType.NUMBER },
    sortKey: { name: 'sk2', type: AttributeType.STRING },
    billingMode: BillingMode.PAY_PER_REQUEST,
  };

  const constructProps: DynamodbL3ConstructProps = {
    kmsArn: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
    tableDefinitions: {
      'table-one': table1,
      'table-two': table2,
    },
    projectName: 'test-project',
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new DynamodbL3Construct(stack, 'multi-ddb-stack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('Multiple DynamoDB Table Resource Count', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 2);
  });

  test('Multiple SSM Parameters', () => {
    template.resourceCountIs('AWS::SSM::Parameter', 2);
  });

  test('Table One Properties', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [{ AttributeName: 'pk1', KeyType: 'HASH' }],
    });
  });

  test('Table Two Properties', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'pk2', KeyType: 'HASH' },
        { AttributeName: 'sk2', KeyType: 'RANGE' },
      ],
    });
  });
});
