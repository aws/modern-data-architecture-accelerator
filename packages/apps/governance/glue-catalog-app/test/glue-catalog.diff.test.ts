/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { GlueCatalogSettingsCDKApp } from '../lib/glue-catalog';
import * as path from 'path';

describe('Glue Catalog Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Glue Catalog Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new GlueCatalogSettingsCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-glue-catalog-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Glue Catalog Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new GlueCatalogSettingsCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-glue-catalog-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
