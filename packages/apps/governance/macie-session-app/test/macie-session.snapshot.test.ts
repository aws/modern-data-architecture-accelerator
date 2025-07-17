/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTest, snapShotTestApp, Create } from '@aws-mdaa/testing';
import { MacieSessionCDKApp } from '../lib/macie-session';
import * as path from 'path';

describe('macie-session Snapshot Tests', () => {
  beforeAll(() => {
    expect.addSnapshotSerializer({
      test: (val: unknown) => typeof val === 'string' && val.includes('[CONFIG:') && val.includes('test-config.yaml]'),
      print: (val: unknown) => {
        const stringVal = val as string;
        return `"${stringVal.replace(/\[CONFIG:[^[\]]*test-config\.yaml\]/, '[CONFIG:test-config.yaml]')}"`;
      },
    });
  });
  snapShotTest(
    'Macie Stack',
    Create.stackProvider(
      'MacieStackMain',
      (_, context) => {
        const moduleApp = new MacieSessionCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-macie-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Macie App',
    Create.appProvider(
      context => {
        const moduleApp = new MacieSessionCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-macie-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
