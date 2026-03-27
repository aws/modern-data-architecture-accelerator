/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaAthenaWorkgroup.
 *
 * Uses fixture resources (KMS key) via environment variables.
 * Creates an in-test MdaaBucket for query results.
 *
 * Verifies that:
 *   - The workgroup is created with SSE_KMS encryption
 *   - Workgroup configuration is enforced
 *   - CloudWatch metrics are published
 *   - Query results are directed to the S3 bucket
 *   - MDAA naming convention is applied
 */

import { MdaaAthenaWorkgroup } from '../../lib';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegAthenaWorkgroupStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 'athena');

// S3 bucket for Athena query results (created in-test)
const resultsBucket = new MdaaBucket(stack, 'ResultsBucket', {
  naming,
  bucketName: 'results',
  encryptionKey: kmsKey,
});

new MdaaAthenaWorkgroup(stack, 'Workgroup', {
  naming,
  name: 'integ-wg',
  kmsKey: kmsKey,
  bucket: resultsBucket,
  description: 'MDAA integration test workgroup',
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
