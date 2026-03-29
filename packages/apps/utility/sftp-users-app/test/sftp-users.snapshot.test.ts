/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { SftpUsersCDKApp } from '../lib/sftp-users';
import * as path from 'path';

describe('sftp-users Comprehensive Snapshot Tests', () => {
  snapShotTestApp(
    'SFTP users App',
    Create.appProvider(
      context => {
        const moduleApp = new SftpUsersCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sftp-users-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});

describe('sftp-users Minimal Snapshot Tests', () => {
  snapShotTestApp(
    'SFTP users App',
    Create.appProvider(
      context => {
        const moduleApp = new SftpUsersCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sftp-users-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
