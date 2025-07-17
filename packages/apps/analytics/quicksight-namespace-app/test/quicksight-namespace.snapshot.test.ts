/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTest, snapShotTestApp, Create } from '@aws-mdaa/testing';
import { QuickSightNamespaceCDKApp } from '../lib/quicksight-namespace';
import * as path from 'path';

describe('quicksight-namespace Snapshot Tests', () => {
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
    'Quicksight Namespace LOB1 Stack',
    Create.stackProvider(
      'QuicksightNamespaceStackMain',
      (_, context) => {
        const moduleApp = new QuickSightNamespaceCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config-lob1.yaml'),
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-quicksight-namespace-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTest(
    'Quicksight Namespace LOB2 Stack',
    Create.stackProvider(
      'QuicksightNamespaceStackMain',
      (_, context) => {
        const moduleApp = new QuickSightNamespaceCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config-lob2.yaml'),
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-quicksight-namespace-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTest(
    'Quicksight Namespace LOB3 Stack',
    Create.stackProvider(
      'QuicksightNamespaceStackMain',
      (_, context) => {
        const moduleApp = new QuickSightNamespaceCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config-lob3.yaml'),
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-quicksight-namespace-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Quicksight Namespace App',
    Create.appProvider(
      context => {
        const moduleApp = new QuickSightNamespaceCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config-lob1.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-quicksight-namespace-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
