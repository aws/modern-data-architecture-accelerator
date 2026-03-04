/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test helpers entry point.
 *
 * This module exports only the integration test helpers without any Jest dependencies.
 * Use this import path for integration tests that run outside of Jest:
 *
 *   import { getIntegEnv, getIntegNaming, ... } from '@aws-mdaa/testing/lib/integ';
 *
 * For unit tests running in Jest, use the main entry point:
 *
 *   import { MdaaTestApp, ... } from '@aws-mdaa/testing';
 */

export * from './mdaa-integ-helpers';
