/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { GatewayExceptionLevel, MdaaAgentcoreGateway } from '../lib';

// Input references to external resources — use the mdaa-testing placeholder partition/region/account
// (test-partition / test-region / 111111111111) per the testing standard for region-bearing values.
const ROLE_ARN = 'arn:test-partition:iam::111111111111:role/gateway-execution-role';
const KMS_KEY_ARN = 'arn:test-partition:kms:test-region:111111111111:key/1234abcd-12ab-34cd-56ef-1234567890ab';

describe('MdaaAgentcoreGateway Compliance Tests', () => {
  describe('AWS_IAM gateway', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new MdaaAgentcoreGateway(stack, 'compliant-iam-gateway', {
      naming: testApp.naming,
      gatewayName: 'compliant-iam-gateway',
      roleArn: ROLE_ARN,
      kmsKeyArn: KMS_KEY_ARN,
      authorizerType: 'AWS_IAM',
    });

    testApp.checkCdkNagCompliance(stack);
  });

  describe('CUSTOM_JWT gateway with semantic search and interceptors', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new MdaaAgentcoreGateway(stack, 'compliant-jwt-gateway', {
      naming: testApp.naming,
      gatewayName: 'compliant-jwt-gateway',
      roleArn: ROLE_ARN,
      kmsKeyArn: KMS_KEY_ARN,
      authorizerType: 'CUSTOM_JWT',
      authorizerConfiguration: {
        customJwtAuthorizer: {
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
          lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:req',
        },
        {
          interceptionPoints: ['RESPONSE'],
          lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:res',
        },
      ],
    });

    testApp.checkCdkNagCompliance(stack);
  });
});
