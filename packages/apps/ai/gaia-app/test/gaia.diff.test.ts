/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { GAIAApp } from '../lib/gaia';
import * as path from 'path';

describe('GAIA Baseline Diff Tests', () => {
  const gaiaIgnorePatterns = {
    // The FileImportBatchJob Docker image hash is derived from the lib/shared/ directory
    // contents, which vary between local dev and CI due to generated artifacts (.js, .d.ts,
    // __pycache__, .venv). Ignore this resource in diff tests since the image content is
    // validated by the Dockerfile and Python tests, not the CDK template diff.
    ignoreResourcePatterns: ['FileImportBatchJob'],
  };

  baselineDiffTestApp(
    'GAIA Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new GAIAApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-gaia-app',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
    gaiaIgnorePatterns,
  );

  baselineDiffTestApp(
    'GAIA Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new GAIAApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-gaia-minimal-app',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'GAIA AD',
    Create.appProvider(
      context => {
        const moduleApp = new GAIAApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-ad.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-gaia-ad-app',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
    gaiaIgnorePatterns,
  );

  baselineDiffTestApp(
    'GAIA Existing',
    Create.appProvider(
      context => {
        const moduleApp = new GAIAApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-existing.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-gaia-existing-app',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
    gaiaIgnorePatterns,
  );
});
