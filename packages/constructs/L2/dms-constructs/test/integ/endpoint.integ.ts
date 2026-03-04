/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaEndpoint.
 *
 * Uses fixture resources (KMS key) via environment variables.
 *
 * Verifies that:
 *   - MdaaEndpoint creates a DMS endpoint with KMS encryption
 *   - MDAA naming convention is applied to the endpoint identifier
 *   - S3 engine type enforces SSE_KMS encryption mode
 *   - Config-level resource — no replication instance needed
 */

import { MdaaEndpoint } from '../../lib';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { ManagedPolicy, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegDmsEndpointStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 'dms');

// S3 bucket as DMS target
const targetBucket = new MdaaBucket(stack, 'TargetBucket', {
  naming,
  bucketName: 'dms-target',
  encryptionKey: kmsKey,
});

// DMS service role for S3 access
const dmsRole = new MdaaRole(stack, 'DmsRole', {
  naming,
  roleName: 'dms-s3-access',
  assumedBy: new ServicePrincipal('dms.amazonaws.com'),
  managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')],
});

// DMS S3 target endpoint — no credentials needed, uses IAM role
new MdaaEndpoint(stack, 'Endpoint', {
  naming,
  endpointIdentifier: 'integ-ep',
  endpointType: 'target',
  engineName: 's3',
  kmsKey: kmsKey,
  s3Settings: {
    bucketName: targetBucket.bucketName,
    serviceAccessRoleArn: dmsRole.roleArn,
    serverSideEncryptionKmsKeyId: kmsKey.keyArn,
  },
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
