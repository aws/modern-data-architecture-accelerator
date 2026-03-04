/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaLogGroup.
 *
 * Uses fixture resources (KMS key) via environment variables.
 *
 * Verifies that:
 *   - The log group is created with KMS encryption
 *   - MDAA naming convention is applied (path prefix + resource name)
 *   - Retention policy is set
 */

import { MdaaLogGroup } from '../../lib';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegLogGroupStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 'cw');

new MdaaLogGroup(stack, 'LogGroup', {
  naming,
  encryptionKey: kmsKey,
  logGroupNamePathPrefix: '/mdaa/integ',
  logGroupName: 'integ-logs',
  retention: RetentionDays.ONE_DAY,
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
