/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Template for creating snapshot tests for MDAA modules.
 *
 * Instructions:
 * 1. Copy this file to your module's test directory
 * 2. Rename it to match your module (e.g., my-module.snapshot.test.ts)
 * 3. Replace the placeholders with your actual module details
 * 4. Run the tests with: npx jest my-module.snapshot.test.ts --no-coverage
 * 5. On first run, use --updateSnapshot to generate the initial snapshots
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import * as path from 'path';
// TODO: Import your module's main class
// import { MyModuleCDKApp } from '../lib/my-module';

describe('MyModule Snapshot Tests', () => {
  // TODO: Replace 'MyModule' with your actual module name

  // Each sample config gets one snapShotTestApp call.
  // snapShotTestApp captures all stacks in the app (including cross-account stacks),
  // so it is the only snapshot test needed per config variant.

  snapShotTestApp(
    'MyModule App',
    Create.appProvider(
      context => {
        // TODO: Replace MyModuleCDKApp with your module's CDK App class
        // const moduleApp = new MyModuleCDKApp({
        //   context: {
        //     ...context,
        //     module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
        //   },
        // });
        // moduleApp.generateStack();
        // return moduleApp;

        // Placeholder — remove this when implementing
        void context;
        throw new Error('TODO: Implement your module test');
      },
      {
        module_name: 'test-my-module',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  // Add one snapShotTestApp per additional sample config variant, e.g.:
  // snapShotTestApp(
  //   'MyModule App Minimal',
  //   Create.appProvider(
  //     context => {
  //       const moduleApp = new MyModuleCDKApp({
  //         context: {
  //           ...context,
  //           module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
  //         },
  //       });
  //       moduleApp.generateStack();
  //       return moduleApp;
  //     },
  //     {
  //       module_name: 'test-my-module-minimal',
  //       org: 'test-org',
  //       env: 'test-env',
  //       domain: 'test-domain',
  //     },
  //   ),
  // );
});

void path; // used in commented examples above
