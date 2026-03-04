/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaDDBTable.
 *
 * Uses fixture resources (KMS key) via environment variables.
 *
 * Verifies that:
 *   - The table is created with customer-managed KMS encryption
 *   - Deletion protection is enabled (overridden to false for cleanup)
 *   - Point-in-time recovery is enabled
 *   - MDAA naming convention is applied
 *
 * Note: ForceDestroy aspect overrides both RemovalPolicy and DeletionProtection
 * on CfnTable to allow clean teardown.
 */

import { MdaaDDBTable } from '../../lib';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegDdbTableStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 'ddb');

new MdaaDDBTable(stack, 'Table', {
  naming,
  tableName: 'integ-table',
  encryptionKey: kmsKey,
  partitionKey: { name: 'pk', type: AttributeType.STRING },
  sortKey: { name: 'sk', type: AttributeType.STRING },
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
