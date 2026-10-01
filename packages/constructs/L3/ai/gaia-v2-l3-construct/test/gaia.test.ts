/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { GAIAL3Construct } from '../lib';

describe('GAIAL3Construct global WAF outside us-east-1', () => {
  // The main stack is not in us-east-1, so the CloudFront WAF must be created in the
  // us-east-1 stack supplied through crossAccountStacks.
  const testApp = new MdaaTestApp();
  const mainStack = new Stack(testApp, 'main', {
    env: { region: 'test-region', account: 'test-account' },
    crossRegionReferences: true,
  });
  const wafStack = new Stack(testApp, 'waf', { env: { region: 'us-east-1', account: 'test-account' } });

  new GAIAL3Construct(mainStack, 'teststack', {
    gaia: {
      dataAdminRoles: [{ name: 'test-admin' }],
      bedrock: { knowledgeBaseId: 'kb' },
      webSocketApi: {
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:bedrock-rag-datasource' },
        },
      },
      vpc: { vpcId: 'XXXXXXXX', appSubnets: ['subnet1'] },
      auth: { cognitoDomain: 'test-domain' },
      userFeedback: { reasons: ['accuracy'] },
    },
    roleHelper: new MdaaRoleHelper(mainStack, testApp.naming),
    naming: testApp.naming,
    crossAccountStacks: { 'test-account': { 'us-east-1': wafStack } },
  });

  const mainTemplate = Template.fromStack(mainStack);
  const wafTemplate = Template.fromStack(wafStack);

  test('creates the CloudFront WAF in the us-east-1 stack', () => {
    wafTemplate.hasResourceProperties('AWS::WAFv2::WebACL', { Scope: 'CLOUDFRONT' });
  });

  test('does not create a CloudFront WAF in the main stack', () => {
    expect(mainTemplate.findResources('AWS::WAFv2::WebACL', { Properties: { Scope: 'CLOUDFRONT' } })).toEqual({});
  });

  test('grants CloudWatch Logs in us-east-1 use of the us-east-1 stack key', () => {
    wafTemplate.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'CloudWatchLogsEncryption',
            Principal: { Service: 'logs.us-east-1.amazonaws.com' },
          }),
        ]),
      },
    });
  });
});
