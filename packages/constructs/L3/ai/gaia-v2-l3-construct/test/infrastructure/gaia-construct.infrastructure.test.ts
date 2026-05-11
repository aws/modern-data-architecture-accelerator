/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Match } from 'aws-cdk-lib/assertions';
import { createGaiaTemplate } from './test-helpers';

describe('GAIA L3 Construct Infrastructure Tests', () => {
  describe('Chat History Configuration', () => {
    test('chat history DynamoDB table uses PK/SK schema, KMS encryption, and point-in-time recovery', () => {
      const template = createGaiaTemplate();
      // The chat history table is uniquely identified by its PK/SK composite
      // key (other DynamoDB tables in the stack use different key names such
      // as "id" for ServiceInterruption or a single userId partition key).
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: Match.arrayWith([
          Match.objectLike({ AttributeName: 'PK', KeyType: 'HASH' }),
          Match.objectLike({ AttributeName: 'SK', KeyType: 'RANGE' }),
        ]),
        SSESpecification: Match.objectLike({
          KMSMasterKeyId: Match.anyValue(),
          SSEEnabled: true,
          SSEType: 'KMS',
        }),
        PointInTimeRecoverySpecification: Match.objectLike({
          PointInTimeRecoveryEnabled: true,
        }),
      });
    });

    test('chat history TTL attribute is disabled when no retention is configured', () => {
      const template = createGaiaTemplate();
      // Without chatRetentionInMinutes the ChatHistory construct passes
      // timeToLiveAttribute: undefined, so the CloudFormation template omits
      // TimeToLiveSpecification on the chat history table.
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: Match.arrayWith([
          Match.objectLike({ AttributeName: 'PK', KeyType: 'HASH' }),
          Match.objectLike({ AttributeName: 'SK', KeyType: 'RANGE' }),
        ]),
        TimeToLiveSpecification: Match.absent(),
      });
    });

    test('chat history TTL attribute is enabled with attribute name "TTL" when retention is configured', () => {
      const template = createGaiaTemplate({
        chatHistory: {
          chatRetentionInMinutes: 60,
        },
      });
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: Match.arrayWith([
          Match.objectLike({ AttributeName: 'PK', KeyType: 'HASH' }),
          Match.objectLike({ AttributeName: 'SK', KeyType: 'RANGE' }),
        ]),
        TimeToLiveSpecification: Match.objectLike({
          AttributeName: 'TTL',
          Enabled: true,
        }),
      });
    });
  });

  describe('Admin Group Configuration', () => {
    test('creates construct with admin group', () => {
      const template = createGaiaTemplate({
        adminGroup: 'admin-users',
      });
      template.hasResource('AWS::ApiGateway::RestApi', {});
    });
  });
});
