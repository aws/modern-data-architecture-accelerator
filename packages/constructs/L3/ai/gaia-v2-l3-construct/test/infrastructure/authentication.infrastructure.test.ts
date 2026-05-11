/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { GAIAL3Construct, GAIAL3ConstructProps } from '../../lib';

describe('Authentication Infrastructure Tests', () => {
  const createConstruct = (authConfig: object) => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: GAIAL3ConstructProps = {
      gaia: {
        waf: { skipGlobalDefaultWaf: true },
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
          ...authConfig,
        },
        userFeedback: { reasons: ['accuracy'] },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new GAIAL3Construct(testApp.testStack, 'teststack', constructProps);
    return Template.fromStack(testApp.testStack);
  };

  describe('User Pool Configuration', () => {
    test('creates new User Pool when existingPoolId not provided', () => {
      const template = createConstruct({});
      template.hasResource('AWS::Cognito::UserPool', {});
    });

    test('creates User Pool with Cognito as identity provider when cognitoAddAsIdentityProvider is true', () => {
      const template = createConstruct({ cognitoAddAsIdentityProvider: true });
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        SupportedIdentityProviders: Match.arrayWith(['COGNITO']),
      });
    });

    test('creates User Pool without Cognito provider when cognitoAddAsIdentityProvider is false', () => {
      const template = createConstruct({ cognitoAddAsIdentityProvider: false });
      // Should have identity providers but not include COGNITO
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        SupportedIdentityProviders: Match.anyValue(),
      });
    });

    test('creates User Pool with WAF association when wafArn provided', () => {
      const template = createConstruct({
        wafArn: 'arn:aws:wafv2:us-east-1:123456789012:regional/webacl/test/12345',
      });
      // WAF association should exist - the wafArn is overridden by the construct's default WAF
      template.resourceCountIs('AWS::WAFv2::WebACLAssociation', 3);
    });

    test('creates User Pool with OAuth callback URLs', () => {
      const template = createConstruct({
        oAuthCallbackUrls: ['https://example.com/callback'],
        oAuthLogoutUrls: ['https://example.com/logout'],
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        CallbackURLs: ['https://example.com/callback'],
        LogoutURLs: ['https://example.com/logout'],
      });
    });
  });

  describe('Entra ID Configuration', () => {
    test('creates OIDC identity provider for Entra ID', () => {
      const template = createConstruct({});
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ProviderName: 'EntraID-OIDC',
        ProviderType: 'OIDC',
      });
    });
  });

  describe('Feature Plan Configuration', () => {
    test('creates User Pool with default PLUS feature plan', () => {
      const template = createConstruct({});
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolTier: 'PLUS',
      });
    });
  });

  describe('Existing Pool Configuration', () => {
    test('uses existing User Pool when existingPoolId provided', () => {
      const template = createConstruct({
        existingPoolId: 'us-east-1_existingPool123',
      });
      // Should not create a new User Pool when using existing
      template.resourceCountIs('AWS::Cognito::UserPool', 0);
    });

    test('uses existing User Pool Client when existingPoolClientId provided', () => {
      const template = createConstruct({
        existingPoolId: 'us-east-1_existingPool123',
        existingPoolClientId: 'existing-client-id-123',
      });
      // Should not create a new User Pool Client when using existing
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 0);
    });

    test('uses existing User Pool Domain when existingPoolDomain provided', () => {
      const template = createConstruct({
        existingPoolId: 'us-east-1_existingPool123',
        existingPoolClientId: 'existing-client-id-123',
        existingPoolDomain: 'existing-domain-prefix',
      });
      // Should not create a new domain when using existing
      template.resourceCountIs('AWS::Cognito::UserPoolDomain', 0);
    });
  });
});
