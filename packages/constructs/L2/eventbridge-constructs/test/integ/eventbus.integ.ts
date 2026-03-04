/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaEventBus.
 *
 * Standalone test — no fixtures needed.
 *
 * Verifies that:
 *   - MdaaEventBus creates an EventBridge event bus
 *   - Archive can be configured with retention period
 *   - MDAA naming convention is applied
 */

import { MdaaEventBus } from '../../lib';
import { getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Stack } from 'aws-cdk-lib';

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegEventBusStack', { env });

const naming = getIntegNaming(app, 'eventbus');

// Basic EventBus
new MdaaEventBus(stack, 'BasicEventBus', {
  naming,
  eventBusName: 'basic',
});

// EventBus with archive
new MdaaEventBus(stack, 'EventBusWithArchive', {
  naming,
  eventBusName: 'with-archive',
  archiveRetention: 7,
});

app.synth();
