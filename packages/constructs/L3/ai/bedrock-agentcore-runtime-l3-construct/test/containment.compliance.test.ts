/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { RuntimeContainment, RuntimeContainmentProps } from '../lib';

const RUNTIME_ARN = 'arn:aws:bedrock-agentcore:test-region:test-account:runtime/compliance_runtime-abc123';

function containmentProps(
  testApp: MdaaTestApp,
  overrides: Partial<RuntimeContainmentProps> = {},
): RuntimeContainmentProps {
  return {
    naming: testApp.naming,
    runtimeName: 'compliance-runtime',
    runtimeId: 'compliance_runtime-abc123',
    runtimeArn: RUNTIME_ARN,
    runtimeEndpointArns: [`${RUNTIME_ARN}/runtime-endpoint/DEFAULT`],
    qualifiers: ['DEFAULT'],
    executionRoleArn: 'arn:aws:iam::test-account:role/compliance-execution-role',
    maxLifetimeSeconds: 28800,
    ...overrides,
  };
}

describe('RuntimeContainment Compliance Tests', () => {
  describe('Containment for an MDAA-created execution role', () => {
    const testApp = new MdaaTestApp();
    new RuntimeContainment(testApp.testStack, 'containment', containmentProps(testApp));
    testApp.checkCdkNagCompliance(testApp.testStack);
  });

  describe('Containment for a role referenced through an SSM dynamic reference, with a named endpoint', () => {
    const testApp = new MdaaTestApp();
    new RuntimeContainment(
      testApp.testStack,
      'containment',
      containmentProps(testApp, {
        executionRoleArn: '{{resolve:ssm:/shared/agentcore/execution-role-arn}}',
        runtimeEndpointArns: [`${RUNTIME_ARN}/runtime-endpoint/DEFAULT`, `${RUNTIME_ARN}/runtime-endpoint/prod`],
        qualifiers: ['prod', 'DEFAULT'],
      }),
    );
    testApp.checkCdkNagCompliance(testApp.testStack);
  });
});
