/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaBucket.
 *
 * Uses fixture resources (KMS key) via environment variables.
 *
 * Verifies that:
 *   - The bucket is created with KMS encryption (CMK)
 *   - DenyAES and ForceKMS bucket policies are applied (default)
 *   - Block all public access is enforced
 *   - Versioning is enabled
 *   - SSL is enforced
 *   - A second bucket with enforceExclusiveKmsKeys=false skips DenyAES/ForceKMS policies
 */

import { MdaaBucket } from '../../lib';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegS3BucketStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 's3');

// Bucket with default enforceExclusiveKmsKeys (DenyAES + ForceKMS policies)
new MdaaBucket(stack, 'DefaultBucket', {
  naming,
  bucketName: 'default',
  encryptionKey: kmsKey,
});

// Bucket with enforceExclusiveKmsKeys=false (no DenyAES/ForceKMS policies)
new MdaaBucket(stack, 'NoExclusiveBucket', {
  naming,
  bucketName: 'noexcl',
  encryptionKey: kmsKey,
  enforceExclusiveKmsKeys: false,
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
