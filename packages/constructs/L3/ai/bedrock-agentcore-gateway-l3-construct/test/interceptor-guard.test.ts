/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { BedrockAgentcoreGatewayL3Construct } from '../lib';

// Replace the shared Lambda L3 construct with a stub that builds no functions (empty functionsMap),
// so buildInterceptorFunctions cannot resolve the interceptor it just "deployed". This exercises the
// internal invariant guard that is otherwise unreachable through valid configuration. jest.mock is
// hoisted above the imports by the ts-jest transformer, so the stub is in place before the construct
// under test resolves the dependency.
jest.mock('@aws-mdaa/dataops-lambda-l3-construct', () => {
  const actual = jest.requireActual('@aws-mdaa/dataops-lambda-l3-construct');
  class StubLambdaFunctionL3Construct extends Construct {
    public readonly functionsMap: Record<string, unknown> = {};
    public constructor(scope: Construct, id: string) {
      super(scope, id);
    }
  }
  return { ...actual, LambdaFunctionL3Construct: StubLambdaFunctionL3Construct };
});

describe('BedrockAgentcoreGatewayL3Construct interceptor resolution guard', () => {
  test('throws when a deployed interceptor function is missing from the functions map', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    expect(
      () =>
        new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
          gatewayName: 'test-gateway',
          authorizerConfiguration: {},
          kmsKey: new Key(testApp.testStack, 'GwKey', { enableKeyRotation: true }),
          naming: testApp.naming,
          roleHelper,
          interceptors: [
            {
              interceptionPoints: ['REQUEST'],
              lambdaFunction: {
                functionName: 'req-interceptor',
                srcDir: __dirname,
                handler: 'index.handler',
                runtime: 'python3.12',
                roleArn: 'arn:aws:iam::123456789012:role/interceptor-fn-role',
              },
            },
          ],
        }),
    ).toThrow(/Interceptor function not found after build: req-interceptor/);
  });
});
