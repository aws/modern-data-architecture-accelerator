/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { AttributeType, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';
import { MdaaDDBTable, MdaaDDBTableProps } from '../lib';
import { Stream } from 'aws-cdk-lib/aws-kinesis';

describe('MDAA Construct Mandatory Prop Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );

  const testConstructProps: MdaaDDBTableProps = {
    naming: testApp.naming,
    tableName: 'test-table',
    encryptionKey: testKey,
    partitionKey: {
      name: 'id',
      type: AttributeType.STRING,
    },
    kinesisStream: Stream.fromStreamArn(
      testApp.testStack,
      'test-stream',
      'arn:test-partition:kinesis:test-region:test-account:stream/test-stream',
    ),
    stream: StreamViewType.KEYS_ONLY,
  };

  new MdaaDDBTable(testApp.testStack, 'test-construct', testConstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('TableName', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: testApp.naming.resourceName('test-table'),
    });
  });
});
