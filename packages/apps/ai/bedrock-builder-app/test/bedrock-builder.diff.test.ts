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
    'Bedrock Builder Knowledge Base Only',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-kb-only.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-kb-only',
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
    'Bedrock Builder Gateway JWT',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-gateway-jwt.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-gateway-jwt',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Bedrock Builder Gateway Knowledge Base',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-gateway-kb.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-gateway-kb',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Bedrock Builder Guardrail Alarms Existing Topic',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockBuilderApp({
          context: {
            ...context,
            module_configs: path.join(
              __dirname,
              '..',
              'sample_configs',
              'sample-config-guardrail-alarms-existing-topic.yaml',
            ),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-builder-guardrail-alarms-existing-topic',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
