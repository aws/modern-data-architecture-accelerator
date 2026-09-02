/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { BedrockBuilderApp } from '../lib/bedrock-builder';
import * as path from 'path';

describe('Bedrock Builder Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Bedrock Builder Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-app',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Bedrock Builder Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Bedrock Builder Gateway',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-gateway.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-gateway',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Bedrock Builder Gateway IAM',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-gateway-iam.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-gateway-iam',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Bedrock Builder Gateway Log Delivery',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-gateway-logdelivery.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-gateway-logdelivery',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Bedrock Builder Harness Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-harness-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-harness-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Bedrock Builder Harness Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-harness-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-harness-comprehensive',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
