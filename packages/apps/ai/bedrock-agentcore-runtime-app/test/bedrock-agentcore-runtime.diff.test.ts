/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { BedrockAgentcoreRuntimeApp } from '../lib';
import * as path from 'path';

describe('Bedrock Agentcore Runtime Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Bedrock Agentcore Runtime Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockAgentcoreRuntimeApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-agentcore-runtime-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Bedrock Agentcore Runtime Codepath',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockAgentcoreRuntimeApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-codepath.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-agentcore-runtime-codepath',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Bedrock Agentcore Runtime Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockAgentcoreRuntimeApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-agentcore-runtime-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
