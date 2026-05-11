/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { GAIAL3Construct, GAIAL3ConstructProps } from '../../lib';

describe('Feedback Infrastructure Tests', () => {
  let testApp: MdaaTestApp;
  let template: Template;
  let roleHelper: MdaaRoleHelper;
  let constructProps: GAIAL3ConstructProps;

  beforeAll(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    constructProps = {
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
        vpc: {
          vpcId: 'XXXXXXXX',
          appSubnets: ['subnet1'],
        },
        auth: {
          cognitoDomain: 'some-unique-pool-domain-name',
        },
        userFeedback: {
          reasons: ['accuracy', 'unhelpful', 'app_issue', 'other'],
          feedbackRetentionDays: 90,
        },
      },
      roleHelper: roleHelper,
      naming: testApp.naming,
    };

    new GAIAL3Construct(testApp.testStack, 'teststack', constructProps);
    template = Template.fromStack(testApp.testStack);
  });

  describe('DynamoDB Feedback Table', () => {
    it('should create feedback table with correct configuration', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: Match.stringLikeRegexp('.*user-message-feedback.*'),
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          {
            AttributeName: 'PK',
            AttributeType: 'S',
          },
          {
            AttributeName: 'SK',
            AttributeType: 'S',
          },
          {
            AttributeName: 'feedback_id',
            AttributeType: 'S',
          },
        ],
        KeySchema: [
          {
            AttributeName: 'PK',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'SK',
            KeyType: 'RANGE',
          },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'FeedbackIdIndex',
            KeySchema: [
              {
                AttributeName: 'feedback_id',
                KeyType: 'HASH',
              },
            ],
            Projection: {
              ProjectionType: 'ALL',
            },
          },
        ],
      });
    });

    it('should have encryption enabled', () => {
      template.hasResourceProperties(
        'AWS::DynamoDB::Table',
        Match.objectLike({
          TableName: Match.stringLikeRegexp('.*user-message-feedback.*'),
          SSESpecification: {
            SSEEnabled: true,
            KMSMasterKeyId: Match.anyValue(),
          },
        }),
      );
    });

    it('should create SSM parameter for feedback table name', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('.*/table/feedback/name'),
        Type: 'String',
        Value: Match.anyValue(),
      });
    });
  });

  describe('Lambda Function Configuration', () => {
    it('should create REST API handler Lambda function', () => {
      template.hasResourceProperties(
        'AWS::Lambda::Function',
        Match.objectLike({
          FunctionName: Match.stringLikeRegexp('.*rest-api-handler.*'),
          Runtime: Match.anyValue(),
          Handler: Match.anyValue(),
        }),
      );
    });
  });

  describe('Lambda Environment Variables', () => {
    it('should set FEEDBACK_TABLE_NAME environment variable', () => {
      template.hasResourceProperties(
        'AWS::Lambda::Function',
        Match.objectLike({
          FunctionName: Match.stringLikeRegexp('.*rest-api-handler.*'),
          Environment: {
            Variables: Match.objectLike({
              FEEDBACK_TABLE_NAME: Match.anyValue(),
            }),
          },
        }),
      );
    });
  });

  describe('API Gateway Integration', () => {
    it('should create API Gateway with proxy integration', () => {
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'ANY',
        ResourceId: Match.anyValue(),
        RestApiId: Match.anyValue(),
        AuthorizationType: 'COGNITO_USER_POOLS',
      });
    });

    it('should have request validation enabled', () => {
      template.hasResourceProperties(
        'AWS::ApiGateway::Method',
        Match.objectLike({
          RequestValidatorId: Match.anyValue(),
        }),
      );
    });
  });

  describe('Security Configuration', () => {
    it('should use KMS encryption for DynamoDB', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: Match.objectLike({
                AWS: Match.stringLikeRegexp('.*root.*'),
              }),
              Action: 'kms:*',
              Resource: '*',
            }),
          ]),
        }),
      });
    });

    it('should configure Cognito authorizer', () => {
      template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
        Type: 'COGNITO_USER_POOLS',
        IdentitySource: 'method.request.header.Authorization',
      });
    });
  });

  describe('Monitoring and Logging', () => {
    it('should enable CloudWatch logging for Lambda', () => {
      template.hasResourceProperties(
        'AWS::Lambda::Function',
        Match.objectLike({
          Environment: {
            Variables: Match.objectLike({
              POWERTOOLS_SERVICE_NAME: 'chatbot',
              POWERTOOLS_METRICS_NAMESPACE: 'chatbot-admin-restapi',
              LOG_LEVEL: 'INFO',
            }),
          },
        }),
      );
    });

    it('should enable API Gateway access logging', () => {
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        AccessLogSetting: Match.objectLike({
          DestinationArn: Match.anyValue(),
          Format: Match.anyValue(),
        }),
      });
    });
  });

  describe('Resource Configuration', () => {
    it('should create feedback table with proper retention policy', () => {
      template.hasResourceProperties(
        'AWS::DynamoDB::Table',
        Match.objectLike({
          TableName: Match.stringLikeRegexp('.*user-message-feedback.*'),
          DeletionProtectionEnabled: true,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
        }),
      );
    });
  });
});
