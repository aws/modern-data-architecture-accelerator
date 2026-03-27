/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaCfnCrawler and MdaaCfnJob.
 *
 * Uses fixture resources (KMS key) via environment variables.
 *
 * Verifies that:
 *   - MdaaSecurityConfig creates a Glue security configuration with all 3 KMS layers
 *   - MdaaCfnCrawler creates a crawler with security config, IAM role, and S3 target
 *   - MdaaCfnJob creates a job with security config, IAM role, and glueetl command
 *   - MDAA naming convention is applied to all resources
 */

import { MdaaSecurityConfig, MdaaCfnCrawler, MdaaCfnJob } from '../../lib';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { CfnDatabase } from 'aws-cdk-lib/aws-glue';
import { ManagedPolicy, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegGlueDataopsStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 'gluedo');

// Security configuration with all 3 KMS encryption layers
const securityConfig = new MdaaSecurityConfig(stack, 'SecurityConfig', {
  naming,
  securityConfigurationName: 'integ-dataops-sec',
  cloudWatchKmsKey: kmsKey,
  jobBookMarkKmsKey: kmsKey,
  s3OutputKmsKey: kmsKey,
});

// Glue service role with AWSGlueServiceRole managed policy
const glueRole = new MdaaRole(stack, 'GlueRole', {
  naming,
  roleName: 'glue-dataops',
  assumedBy: new ServicePrincipal('glue.amazonaws.com'),
  managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')],
});

// S3 bucket as crawler target
const targetBucket = new MdaaBucket(stack, 'TargetBucket', {
  naming,
  bucketName: 'target',
  encryptionKey: kmsKey,
});

// Glue database for crawler output
const glueDb = new CfnDatabase(stack, 'GlueDatabase', {
  catalogId: env.account!,
  databaseInput: {
    name: naming.resourceName('integ-db', 255),
    description: 'MDAA integ test Glue database',
  },
});

// Crawler with security config, role, S3 target, and database
new MdaaCfnCrawler(stack, 'Crawler', {
  naming,
  name: 'integ-crawler',
  role: glueRole.roleArn,
  crawlerSecurityConfiguration: securityConfig.securityConfigurationName,
  databaseName: glueDb.ref,
  targets: {
    s3Targets: [{ path: `s3://${targetBucket.bucketName}/` }],
  },
});

// Job with security config, role, and glueetl command
new MdaaCfnJob(stack, 'Job', {
  naming,
  name: 'integ-job',
  role: glueRole.roleArn,
  securityConfiguration: securityConfig.securityConfigurationName,
  command: {
    name: 'glueetl',
    scriptLocation: `s3://${targetBucket.bucketName}/scripts/etl.py`,
    pythonVersion: '3',
  },
  glueVersion: '4.0',
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
