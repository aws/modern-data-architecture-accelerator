/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaSecurityConfig and MdaaCatalogSettings.
 *
 * Uses fixture resources (KMS key) via environment variables.
 *
 * Verifies that:
 *   - MdaaSecurityConfig creates a Glue security configuration with all 3 KMS layers
 *     (CloudWatch, job bookmarks, S3 output)
 *   - MdaaCatalogSettings configures Data Catalog encryption (SSE-KMS + connection password)
 *   - MDAA naming convention is applied to the security configuration
 */

import { MdaaSecurityConfig, MdaaCatalogSettings } from '../../lib';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegGlueSecurityStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 'glue');

// Security configuration with all 3 KMS encryption layers (reuse same key)
new MdaaSecurityConfig(stack, 'SecurityConfig', {
  naming,
  securityConfigurationName: 'integ-sec',
  cloudWatchKmsKey: kmsKey,
  jobBookMarkKmsKey: kmsKey,
  s3OutputKmsKey: kmsKey,
});

// Catalog encryption settings
new MdaaCatalogSettings(stack, 'CatalogSettings', {
  naming,
  catalogId: Stack.of(stack).account,
  catalogKmsKey: kmsKey,
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
