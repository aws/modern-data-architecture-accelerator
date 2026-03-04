/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaSqsQueue and MdaaSqsDeadLetterQueue.
 *
 * Uses fixture resources (KMS key) via environment variables.
 *
 * Verifies that:
 *   - The queue is created with KMS encryption
 *   - EnforceSSL resource policy is applied (deny sqs:* when SecureTransport=false)
 *   - Dead letter queue is properly configured
 *   - MDAA naming convention is applied
 */

import { MdaaSqsQueue, MdaaSqsDeadLetterQueue } from '../../lib';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegSqsQueueStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 'sqs');

// Dead letter queue (must be created first)
const dlq = new MdaaSqsDeadLetterQueue(stack, 'DLQ', {
  naming,
  queueName: 'integ-dlq',
  encryptionMasterKey: kmsKey,
});

// Main queue with DLQ
new MdaaSqsQueue(stack, 'MainQueue', {
  naming,
  queueName: 'integ-main',
  encryptionMasterKey: kmsKey,
  deadLetterQueue: {
    queue: dlq,
    maxReceiveCount: 3,
  },
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
