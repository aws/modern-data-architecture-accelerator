/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { GAIAL3Construct, GAIAL3ConstructProps } from '../lib';

describe('GAIA v2 L3 Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  const constructProps: GAIAL3ConstructProps = {
    gaia: {
      waf: {
        skipGlobalDefaultWaf: true,
      },
      dataAdminRoles: [
        {
          name: 'test-admin',
        },
      ],
      restApi: {
        restApiDomainName: 'rest-api-domain',
        hostedZoneName: 'test',
      },
      bedrock: {
        knowledgeBaseId: 'knowledgeBaseId',
      },
      webSocketApi: {
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: {
            id: 'generated-role-id:bedrock-rag-datasource',
          },
        },
      },
      vpc: {
        vpcId: 'XXXXXXXX',
        appSubnets: ['subnet1'],
      },
      auth: {
        cognitoDomain: 'some-unique-pool-domain-name',
        wafArn: 'arn:aws:wafv2:ca-central-1:123456789102:regional/webacl/waf/5a6a6393-1e39-4279-9838-fc82b847e46d',
        entraIdOIDCConfiguration: {
          entraIdConfigSecretArn: 'arn:aws:secretsmanager:ca-central-1:123456789102:secret:oidc-secret-rkfLVz',
          attributeMapping: {
            fullname: 'name',
          },
        },
        cognitoAddAsIdentityProvider: true,
        cognitoBrandingFileLocation: `${__dirname}/branding-config-test.json`,
      },
      userFeedback: {
        reasons: ['accuracy', 'unhelpful', 'app_issue', 'other'],
        feedbackRetentionDays: 90,
      },
      clientUi: {
        domainName: 'example.com',
        acmCertArn: 'arn:aws:acm:us-east-1:123456789102:certificate/a1b2c3d4-e5f6-4789-a012-3456789abcde',
      },
      adminUi: {
        hostedZoneId: 'id',
        domainName: 'example.com',
        acmCertArn: 'arn:aws:acm:us-east-1:123456789102:certificate/a1b2c3d4-e5f6-4789-a012-3456789abcde',
      },
    },
    roleHelper: roleHelper,
    naming: testApp.naming,
  };

  new GAIAL3Construct(testApp.testStack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  describe('Core Infrastructure Resources', () => {
    test('KMS Key for encryption', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
        Enabled: true,
      });
    });

    test('S3 Buckets for file uploads', () => {
      template.resourceCountIs('AWS::S3::Bucket', 4);
    });

    test('DynamoDB Tables for sessions and connections', () => {
      template.resourceCountIs('AWS::DynamoDB::Table', 3);
    });
  });

  describe('API Gateway Resources', () => {
    test('REST API Gateway', () => {
      template.hasResource('AWS::ApiGateway::RestApi', {});
    });

    test('WebSocket API (AppSync)', () => {
      template.hasResource('AWS::AppSync::Api', {});
    });

    test('API Gateway Domain Names', () => {
      template.hasResource('AWS::ApiGateway::DomainName', {});
    });
  });

  describe('Authentication Resources', () => {
    test('Cognito User Pool', () => {
      template.hasResource('AWS::Cognito::UserPool', {});
    });

    test('Cognito User Pool Client', () => {
      template.hasResource('AWS::Cognito::UserPoolClient', {});
    });

    test('Cognito Domain', () => {
      template.hasResource('AWS::Cognito::UserPoolDomain', {});
    });
  });

  describe('Lambda Functions', () => {
    test('Lambda functions for processing', () => {
      template.resourceCountIs('AWS::Lambda::Function', 8);
    });

    test('Lambda Layer Versions', () => {
      template.resourceCountIs('AWS::Lambda::LayerVersion', 3);
    });
  });

  describe('Security Resources', () => {
    test('WAF Web ACL', () => {
      template.hasResource('AWS::WAFv2::WebACL', {});
    });

    test('WAF IP Set', () => {
      template.hasResource('AWS::WAFv2::IPSet', {});
    });

    test('Secrets Manager Secret', () => {
      template.hasResource('AWS::SecretsManager::Secret', {});
    });
  });

  describe('IAM Resources', () => {
    test('IAM Roles for Lambda execution', () => {
      template.resourceCountIs('AWS::IAM::Role', 10);
    });

    test('IAM Managed Policies', () => {
      template.resourceCountIs('AWS::IAM::ManagedPolicy', 5);
    });
  });

  describe('CloudFront Distribution', () => {
    test('CloudFront Distribution for UI', () => {
      template.hasResource('AWS::CloudFront::Distribution', {});
    });

    test('CloudFront Origin Access Control', () => {
      template.hasResource('AWS::CloudFront::OriginAccessControl', {});
    });
  });
});
