/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaRole and MdaaManagedPolicy.
 *
 * Standalone test — no fixtures needed.
 *
 * Verifies that:
 *   - MdaaRole creates an IAM role with MDAA naming
 *   - MdaaManagedPolicy creates a managed policy with MDAA naming
 *   - Service principal trust relationships work correctly
 */

import { MdaaManagedPolicy, MdaaRole } from '../../lib';
import { getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Stack } from 'aws-cdk-lib';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegIamStack', { env });

const naming = getIntegNaming(app, 'iam');

// Basic Role
new MdaaRole(stack, 'BasicRole', {
  naming,
  roleName: 'basic-role',
  assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
});

// Basic Managed Policy
new MdaaManagedPolicy(stack, 'BasicPolicy', {
  naming,
  managedPolicyName: 'basic-policy',
  statements: [
    new PolicyStatement({
      actions: ['logs:CreateLogGroup'],
      resources: ['*'],
    }),
  ],
});

app.synth();
