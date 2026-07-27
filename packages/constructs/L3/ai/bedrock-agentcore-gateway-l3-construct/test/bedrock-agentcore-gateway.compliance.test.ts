/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Key } from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { BedrockAgentcoreGatewayL3Construct, GatewayExceptionLevel } from '../lib';

// Interceptor functions are deployed via the shared LambdaFunctionL3Construct (Code.fromAsset).
// Redirect fromAsset to this test dir so no on-disk fixture is needed.
const originalFromAsset = lambda.Code.fromAsset.bind(lambda.Code);
jest.spyOn(lambda.Code, 'fromAsset').mockImplementation(() => originalFromAsset(__dirname));

describe('BedrockAgentcoreGatewayL3Construct Compliance Tests', () => {
  describe('Basic CUSTOM_JWT gateway', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new BedrockAgentcoreGatewayL3Construct(stack, 'compliant-jwt-gateway', {
      gatewayName: 'compliant-jwt-gateway',
      authorizerConfiguration: {
        customJwt: {
          discoveryUrl: 'https://example.com/.well-known/openid-configuration',
          allowedAudience: ['my-audience'],
        },
      },
      kmsKey: new Key(stack, 'GwKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    });

    testApp.checkCdkNagCompliance(stack);
  });

  describe('AWS_IAM gateway', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new BedrockAgentcoreGatewayL3Construct(stack, 'compliant-iam-gateway', {
      gatewayName: 'compliant-iam-gateway',
      authorizerConfiguration: {},
      kmsKey: new Key(stack, 'GwKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    });

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Gateway with interceptors and semantic search', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new BedrockAgentcoreGatewayL3Construct(stack, 'compliant-full-gateway', {
      gatewayName: 'compliant-full-gateway',
      authorizerConfiguration: {
        customJwt: {
          discoveryUrl: 'https://example.com/.well-known/openid-configuration',
          allowedClients: ['client-1'],
        },
      },
      protocolConfiguration: {
        searchType: 'SEMANTIC',
        instructions: 'Use these tools',
        supportedVersions: ['2025-06-18'],
      },
      exceptionLevel: GatewayExceptionLevel.DEBUG,
      interceptors: [
        {
          interceptionPoints: ['REQUEST'],
          passRequestHeaders: true,
          lambdaFunction: {
            functionName: 'req-interceptor',
            srcDir: __dirname,
            handler: 'index.handler',
            runtime: 'python3.14',
            roleArn: 'arn:aws:iam::123456789012:role/interceptor-fn-role',
          },
        },
        {
          interceptionPoints: ['RESPONSE'],
          lambdaFunction: {
            functionName: 'res-interceptor',
            srcDir: __dirname,
            handler: 'index.handler',
            runtime: 'python3.14',
            roleArn: 'arn:aws:iam::123456789012:role/interceptor-fn-role',
          },
        },
      ],
      kmsKey: new Key(stack, 'GwKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    });

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Gateway with a by-ref (lambdaArn) interceptor', () => {
    // The by-ref interceptor path deploys no function; it wires the gateway to an existing ARN and
    // grants scoped lambda:InvokeFunction via the same buildScopedInvokePolicy (with its
    // AwsSolutions-IAM4 suppression) as the inline path. Validate that this shared policy raises no
    // unsuppressed cdk-nag findings when the interceptor is supplied by ARN.
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new BedrockAgentcoreGatewayL3Construct(stack, 'compliant-byref-interceptor-gateway', {
      gatewayName: 'compliant-byref-interceptor-gateway',
      authorizerConfiguration: {},
      interceptors: [
        {
          interceptionPoints: ['REQUEST'],
          lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:already-deployed-interceptor',
        },
      ],
      kmsKey: new Key(stack, 'GwKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    });

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Gateway with a Lambda target', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new BedrockAgentcoreGatewayL3Construct(stack, 'compliant-target-gateway', {
      gatewayName: 'compliant-target-gateway',
      authorizerConfiguration: {},
      targets: {
        weather: {
          targetConfiguration: {
            lambda: {
              lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:weather',
              toolSchema: {
                inlinePayload: [
                  {
                    name: 'getWeather',
                    description: 'Returns the weather for a city',
                    inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
                  },
                ],
              },
            },
          },
        },
      },
      kmsKey: new Key(stack, 'GwKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    });

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Gateway with an S3 tool-schema target', () => {
    // The S3 tool-schema path (bucket owner defaulted to the deploying account by the L2). Validate
    // it against the cdk-nag rulesets alongside the inline-schema variant above.
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new BedrockAgentcoreGatewayL3Construct(stack, 'compliant-s3-target-gateway', {
      gatewayName: 'compliant-s3-target-gateway',
      authorizerConfiguration: {},
      targets: {
        catalog: {
          targetConfiguration: {
            lambda: {
              lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:catalog',
              toolSchema: { s3: { uri: 's3://schemas/catalog.json' } },
            },
          },
        },
      },
      kmsKey: new Key(stack, 'GwKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    });

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Gateway with a custom log-delivery retention', () => {
    // The default CMK-encrypted vended log-delivery pipeline is on for every scenario above; this
    // block exercises a finite custom retention (90 days) and confirms the delivery resources plus
    // the CMK log-delivery grants raise no unsuppressed cdk-nag findings.
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new BedrockAgentcoreGatewayL3Construct(stack, 'compliant-logdelivery-gateway', {
      gatewayName: 'compliant-logdelivery-gateway',
      authorizerConfiguration: {},
      logDelivery: { logRetentionDays: 90 },
      kmsKey: new Key(stack, 'GwKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    });

    testApp.checkCdkNagCompliance(stack);
  });
});
