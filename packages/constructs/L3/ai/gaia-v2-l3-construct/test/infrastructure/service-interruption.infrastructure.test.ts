/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ServiceInterruption } from '../../lib/chatbot-api/service-interruption/service-interruption';

describe('ServiceInterruption Infrastructure Tests', () => {
  const createTemplate = (): Template => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const encryptionKey = new MdaaKmsKey(testApp.testStack, 'test-kms-key', {
      naming: testApp.naming,
      alias: 'test-key',
    });

    new ServiceInterruption(testApp.testStack, 'test-service-interruption', {
      naming: testApp.naming,
      roleHelper,
      encryptionKey,
    });

    return Template.fromStack(testApp.testStack);
  };

  test('creates DynamoDB table encrypted with the provided KMS key', () => {
    const template = createTemplate();
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      SSESpecification: Match.objectLike({
        KMSMasterKeyId: Match.anyValue(),
        SSEEnabled: true,
        SSEType: 'KMS',
      }),
    });
  });

  test('configures TTL on the DynamoDB table with attribute name "ttl"', () => {
    const template = createTemplate();
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TimeToLiveSpecification: Match.objectLike({
        AttributeName: 'ttl',
        Enabled: true,
      }),
    });
  });

  test('uses PAY_PER_REQUEST billing mode on the DynamoDB table', () => {
    const template = createTemplate();
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
    });
  });

  test('configures the DynamoDB partition key as a string attribute named "id"', () => {
    const template = createTemplate();
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: Match.arrayWith([
        Match.objectLike({
          AttributeName: 'id',
          KeyType: 'HASH',
        }),
      ]),
      AttributeDefinitions: Match.arrayWith([
        Match.objectLike({
          AttributeName: 'id',
          AttributeType: 'S',
        }),
      ]),
    });
  });
});
