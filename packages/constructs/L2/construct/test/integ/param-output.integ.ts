/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaParamAndOutput.
 *
 * Standalone test — no fixtures needed.
 *
 * Verifies that:
 *   - MdaaParamAndOutput creates SSM parameters and CloudFormation outputs
 *   - Resource type and resource ID are correctly formatted in paths
 *   - MDAA naming convention is applied to SSM paths and export names
 */

import { MdaaParamAndOutput } from '../../lib';
import { getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Stack } from 'aws-cdk-lib';

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegConstructStack', { env });

const naming = getIntegNaming(app, 'base');

// Basic param and output
new MdaaParamAndOutput(stack, {
  naming,
  resourceType: 'test',
  name: 'value',
  value: 'test-value',
});

// Param with resource ID
new MdaaParamAndOutput(stack, {
  naming,
  resourceType: 'test',
  resourceId: 'myresource',
  name: 'arn',
  value: 'arn:aws:test:us-east-1:123456789012:resource/myresource',
});

app.synth();
