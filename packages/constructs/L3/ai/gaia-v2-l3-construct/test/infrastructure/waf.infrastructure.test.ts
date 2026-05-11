/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { GAIAL3Construct, GAIAL3ConstructProps } from '../../lib';

describe('WAF Infrastructure Tests', () => {
  const createConstruct = (allowedCidrs?: string[], wafRules?: { [key: string]: { priority: number } }) => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: GAIAL3ConstructProps = {
      gaia: {
        waf: {
          skipGlobalDefaultWaf: true,
          allowedCidrs,
          wafRules,
        },
        dataAdminRoles: [{ name: 'test-admin' }],
        bedrock: { knowledgeBaseId: 'knowledgeBaseId' },
        webSocketApi: {
          bedrockRagDataSource: {
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            lambdaRole: { id: 'generated-role-id:bedrock-rag-datasource' },
          },
        },
        vpc: { vpcId: 'XXXXXXXX', appSubnets: ['subnet1'] },
        auth: {
          cognitoDomain: 'test-domain',
          entraIdOIDCConfiguration: {
            entraIdConfigSecretArn: 'arn:aws:secretsmanager:ca-central-1:123456789102:secret:oidc-secret-rkfLVz',
            attributeMapping: { fullname: 'name' },
          },
        },
        userFeedback: {
          reasons: ['accuracy', 'unhelpful'],
        },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new GAIAL3Construct(testApp.testStack, 'teststack', constructProps);
    return Template.fromStack(testApp.testStack);
  };

  describe('IP Set Configuration', () => {
    test('creates IPv4 IP Set when only IPv4 CIDRs provided', () => {
      const template = createConstruct(['10.0.0.0/8', '192.168.0.0/16']);
      template.hasResourceProperties('AWS::WAFv2::IPSet', {
        IPAddressVersion: 'IPV4',
        Addresses: ['10.0.0.0/8', '192.168.0.0/16'],
      });
    });

    test('creates IPv6 IP Set when only IPv6 CIDRs provided', () => {
      const template = createConstruct(['2001:db8::/32', 'fe80::/10']);
      template.hasResourceProperties('AWS::WAFv2::IPSet', {
        IPAddressVersion: 'IPV6',
        Addresses: ['2001:db8::/32', 'fe80::/10'],
      });
    });

    test('creates both IPv4 and IPv6 IP Sets when mixed CIDRs provided', () => {
      const template = createConstruct(['10.0.0.0/8', '2001:db8::/32']);
      template.hasResourceProperties('AWS::WAFv2::IPSet', {
        IPAddressVersion: 'IPV4',
        Addresses: ['10.0.0.0/8'],
      });
      template.hasResourceProperties('AWS::WAFv2::IPSet', {
        IPAddressVersion: 'IPV6',
        Addresses: ['2001:db8::/32'],
      });
    });

    test('creates empty IP Set when no CIDRs provided', () => {
      const template = createConstruct([]);
      template.hasResourceProperties('AWS::WAFv2::IPSet', {
        Addresses: [],
        IPAddressVersion: 'IPV4',
      });
    });
  });

  describe('WAF Rules', () => {
    test('creates managed rule groups when wafRules configured', () => {
      const template = createConstruct(['10.0.0.0/8'], {
        AWSManagedRulesCommonRuleSet: { priority: 10 },
        AWSManagedRulesSQLiRuleSet: { priority: 20 },
      });
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWSManagedRulesCommonRuleSet',
            Priority: 10,
          }),
        ]),
      });
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWSManagedRulesSQLiRuleSet',
            Priority: 20,
          }),
        ]),
      });
    });
  });
});
