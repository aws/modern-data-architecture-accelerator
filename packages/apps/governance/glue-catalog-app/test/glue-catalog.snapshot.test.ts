/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { GlueCatalogSettingsCDKApp } from '../lib/glue-catalog';
import * as path from 'path';

describe('glue-catalog Snapshot Tests', () => {
  snapShotTestApp(
    'Glue Catalog App',
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
});

describe('glue-catalog Minimal Snapshot Tests', () => {
  snapShotTestApp(
    'Glue Catalog App Minimal',
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
