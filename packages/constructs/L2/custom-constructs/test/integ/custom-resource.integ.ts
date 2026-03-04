/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaCustomResource.
 *
 * Standalone test — no fixture needed.
 *
 * Verifies that:
 *   - MdaaCustomResource creates a Lambda-backed custom resource
 *   - The handler Lambda function is created with MDAA naming
 *   - Custom resource creation and cleanup work correctly
 */

import { MdaaCustomResource } from '../../lib';
import { ForceDestroy, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegCustomResourceStack', { env });

const naming = getIntegNaming(app, 'cr');

// Simple custom resource with inline Python handler
new MdaaCustomResource(stack, 'CustomResource', {
  naming,
  resourceType: 'IntegTest',
  runtime: Runtime.PYTHON_3_13,
  handler: 'index.handler',
  code: Code.fromInline(`
def handler(event, context):
    return {'PhysicalResourceId': 'integ-cr', 'Data': {'Status': 'OK'}}
`),
  handlerRolePolicyStatements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['logs:CreateLogGroup'],
      resources: ['*'],
    }),
  ],
  handlerProps: { testKey: 'testValue' },
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
