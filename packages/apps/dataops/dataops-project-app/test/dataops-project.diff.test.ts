/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { DataOpsProjectCDKApp } from '../lib/dataops-project';
import * as path from 'path';

const IGNORE_DOMAIN_CONFIG_REFRESH = { ignoreResourceProperties: { domainConfigcr: ['refresh'] } };

describe('Dataops Project Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Dataops Project Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new DataOpsProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
            additional_accounts: 'test-account-2',
            additional_stacks: JSON.stringify([{ account: 'test-account-2', region: 'test-region' }]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-dataops-project-comprehensive',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
    IGNORE_DOMAIN_CONFIG_REFRESH,
  );

  baselineDiffTestApp(
    'Dataops Project Datazone',
    Create.appProvider(
      context => {
        const moduleApp = new DataOpsProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-datazone.yaml'),
            additional_accounts: 'test-account-2',
            additional_stacks: JSON.stringify([{ account: 'test-account-2', region: 'test-region' }]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-dataops-project-datazone',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
    IGNORE_DOMAIN_CONFIG_REFRESH,
  );

  baselineDiffTestApp(
    'Dataops Project Sagemaker',
    Create.appProvider(
      context => {
        const moduleApp = new DataOpsProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-sagemaker.yaml'),
            additional_accounts: 'test-account-2',
            additional_stacks: JSON.stringify([{ account: 'test-account-2', region: 'test-region' }]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-dataops-project-sagemaker',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
    IGNORE_DOMAIN_CONFIG_REFRESH,
  );

  baselineDiffTestApp(
    'Dataops Project Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new DataOpsProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
            additional_accounts: 'test-account-2',
            additional_stacks: JSON.stringify([{ account: 'test-account-2', region: 'test-region' }]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-dataops-project-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
