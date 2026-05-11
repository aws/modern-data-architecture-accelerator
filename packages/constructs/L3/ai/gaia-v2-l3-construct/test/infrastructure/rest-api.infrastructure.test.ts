/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { GAIAL3Construct, GAIAL3ConstructProps } from '../../lib';

describe('REST API Infrastructure Tests', () => {
  const createConstruct = (restApiConfig: object = {}) => {
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
        },
        userFeedback: { reasons: ['accuracy'] },
        restApi: restApiConfig,
      },
      roleHelper,
      naming: testApp.naming,
    };

    new GAIAL3Construct(testApp.testStack, 'teststack', constructProps);
    return Template.fromStack(testApp.testStack);
  };

  describe('REST API Configuration', () => {
    test('creates REST API with default configuration', () => {
      const template = createConstruct();
      template.hasResource('AWS::ApiGateway::RestApi', {});
    });

    test('creates REST API with custom domain when provided', () => {
      const template = createConstruct({
        restApiDomainName: 'api.example.com',
        hostedZoneName: 'example.com',
      });
      template.hasResourceProperties('AWS::ApiGateway::DomainName', {
        DomainName: 'api.example.com',
      });
    });

    test('enforces TLS 1.2 on custom domain', () => {
      const template = createConstruct({
        restApiDomainName: 'api.example.com',
        hostedZoneName: 'example.com',
      });
      template.hasResourceProperties('AWS::ApiGateway::DomainName', {
        DomainName: 'api.example.com',
        SecurityPolicy: 'TLS_1_2',
      });
    });

    test('disables default execute-api endpoint when configured', () => {
      const template = createConstruct({
        disableExecuteApiEndpoint: true,
      });
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        DisableExecuteApiEndpoint: true,
      });
    });

    test('does not disable default execute-api endpoint by default', () => {
      const template = createConstruct();
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        DisableExecuteApiEndpoint: false,
      });
    });

    test('disables default execute-api endpoint with custom domain and TLS 1.2', () => {
      const template = createConstruct({
        restApiDomainName: 'api.example.com',
        hostedZoneName: 'example.com',
        disableExecuteApiEndpoint: true,
      });
      template.hasResourceProperties('AWS::ApiGateway::DomainName', {
        DomainName: 'api.example.com',
        SecurityPolicy: 'TLS_1_2',
      });
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        DisableExecuteApiEndpoint: true,
      });
    });

    test('creates REST API with admin group configuration', () => {
      const template = createConstruct({
        adminGroup: 'admin-users',
      });
      template.hasResource('AWS::ApiGateway::RestApi', {});
    });

    test('creates REST API with log group path prefix', () => {
      const template = createConstruct({
        logGroupNamePathPrefix: 'custom-prefix',
      });
      template.hasResource('AWS::Logs::LogGroup', {});
    });

    test('creates REST API with API Gateway account CloudWatch role', () => {
      const template = createConstruct({
        setApiGateWayAccountCloudwatchRole: true,
      });
      template.hasResource('AWS::ApiGateway::Account', {});
    });

    test('creates REST API with provisioned concurrency', () => {
      const template = createConstruct({
        provisionedConcurrentExecutions: 5,
      });
      template.hasResourceProperties('AWS::Lambda::Alias', {
        Name: 'live',
        ProvisionedConcurrencyConfig: {
          ProvisionedConcurrentExecutions: 5,
        },
      });
    });

    test('creates REST API with PRIVATE endpoint type', () => {
      const template = createConstruct({
        endpointType: 'PRIVATE',
      });
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        EndpointConfiguration: {
          Types: ['PRIVATE'],
        },
      });
    });

    test('creates REST API with PRIVATE endpoint and VPC endpoint restrictions', () => {
      const template = createConstruct({
        endpointType: 'PRIVATE',
        privateApiSourceVpcEndpointIds: ['vpce-12345', 'vpce-67890'],
      });
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        EndpointConfiguration: {
          Types: ['PRIVATE'],
        },
      });
    });

    test('creates REST API with EDGE endpoint type', () => {
      const template = createConstruct({
        endpointType: 'EDGE',
      });
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        EndpointConfiguration: {
          Types: ['EDGE'],
        },
      });
    });

    test('includes tlsVersion and cipherSuite in access log format', () => {
      const template = createConstruct();
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        AccessLogSetting: {
          Format: Match.stringLikeRegexp('tlsVersion.*\\$context\\.identity\\.tlsVersion'),
        },
      });
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        AccessLogSetting: {
          Format: Match.stringLikeRegexp('cipherSuite.*\\$context\\.identity\\.cipherSuite'),
        },
      });
    });

    test('creates REST API with cross-account VPC owner for RAM shared VPCs', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

      const networkAccountId = '222222222222'; // Network account that owns the VPC (different from test-account)

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
          vpc: {
            vpcId: 'vpc-12345678',
            appSubnets: ['subnet-aaaaaaaa'],
            vpcOwnerAccountId: networkAccountId,
          },
          auth: {
            cognitoDomain: 'test-domain',
            entraIdOIDCConfiguration: {
              entraIdConfigSecretArn: 'arn:aws:secretsmanager:ca-central-1:111111111111:secret:oidc-secret-rkfLVz',
              attributeMapping: { fullname: 'name' },
            },
          },
          userFeedback: { reasons: ['accuracy'] },
        },
        roleHelper,
        naming: testApp.naming,
      };

      new GAIAL3Construct(testApp.testStack, 'teststack', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Get the synthesized template as JSON to inspect the IAM policies
      const templateJson = template.toJSON();
      const resources = templateJson.Resources;

      // Find the BackendRestApiHandlerRole policy that contains the ec2:CreateNetworkInterface action
      // and verify it uses the network account ID in the VPC ARN condition
      let foundNetworkAccountInVpcArn = false;
      for (const resource of Object.values(resources)) {
        if ((resource as { Type: string }).Type === 'AWS::IAM::Policy') {
          const policyDoc = (resource as { Properties: { PolicyDocument: { Statement: unknown[] } } }).Properties
            ?.PolicyDocument;
          if (policyDoc?.Statement) {
            for (const statement of policyDoc.Statement as {
              Action?: string | string[];
              Condition?: { StringEqualsIfExists?: { 'ec2:Vpc'?: unknown } };
            }[]) {
              const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
              if (actions.includes('ec2:CreateNetworkInterface')) {
                const vpcCondition = statement.Condition?.StringEqualsIfExists?.['ec2:Vpc'];
                if (vpcCondition) {
                  const vpcConditionStr = JSON.stringify(vpcCondition);
                  if (vpcConditionStr.includes(networkAccountId)) {
                    foundNetworkAccountInVpcArn = true;
                  }
                }
              }
            }
          }
        }
      }

      expect(foundNetworkAccountInVpcArn).toBe(true);
    });
  });
});
