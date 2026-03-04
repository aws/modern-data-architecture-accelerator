/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaSnsTopic.
 *
 * Uses fixture resources (KMS key) via environment variables.
 *
 * Verifies that:
 *   - The topic is created with KMS encryption
 *   - EnforceSSL resource policy is applied (deny SNS actions when SecureTransport=false)
 *   - MDAA naming convention is applied
 */

import { MdaaSnsTopic } from '../../lib';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegSnsTopicStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 'sns');

new MdaaSnsTopic(stack, 'Topic', {
  naming,
  topicName: 'integ-topic',
  masterKey: kmsKey,
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
