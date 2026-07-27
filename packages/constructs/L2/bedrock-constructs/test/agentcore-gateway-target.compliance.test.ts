/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaAgentcoreGatewayTarget } from '../lib';

// Input reference to an external Lambda — uses the mdaa-testing placeholder partition/region/account
// (test-partition / test-region / 111111111111) per the testing standard for region-bearing values.
const LAMBDA_ARN = 'arn:test-partition:lambda:test-region:111111111111:function:my-tool';
const GATEWAY_IDENTIFIER = 'my-gateway-a1b2c3d4e5';

describe('MdaaAgentcoreGatewayTarget Compliance Tests', () => {
  describe('Lambda target with an inline tool schema', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new MdaaAgentcoreGatewayTarget(stack, 'compliant-inline-target', {
      naming: testApp.naming,
      targetName: 'weather',
      gatewayIdentifier: GATEWAY_IDENTIFIER,
      targetConfig: {
        description: 'Weather tools',
        targetConfiguration: {
          lambda: {
            lambdaArn: LAMBDA_ARN,
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
    });

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Lambda target with an S3 tool schema', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new MdaaAgentcoreGatewayTarget(stack, 'compliant-s3-target', {
      naming: testApp.naming,
      targetName: 'catalog',
      gatewayIdentifier: GATEWAY_IDENTIFIER,
      targetConfig: {
        targetConfiguration: {
          lambda: {
            lambdaArn: LAMBDA_ARN,
            toolSchema: { s3: { uri: 's3://my-bucket/schema.json' } },
          },
        },
      },
    });

    testApp.checkCdkNagCompliance(stack);
  });
});
