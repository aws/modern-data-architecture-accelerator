/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Template for creating snapshot tests for MDAA modules
 *
 * Instructions:
 * 1. Copy this file to your module's test directory
 * 2. Rename it to match your module (e.g., my-module.snapshot.test.ts)
 * 3. Replace the placeholders with your actual module details
 * 4. Create test configuration files in test/test-configs/
 * 5. Run the tests with: npm run test:snapshots
 */

import { describe } from '@jest/globals';
import { snapShotTest, snapShotTestApp, Create } from '@aws-mdaa/testing';
// TODO: Import your module's main class
// import { MyModuleCDKApp } from '../lib/my-module';

describe('MyModule Snapshot Tests', () => {
  // TODO: Replace 'MyModule' with your actual module name

  // Test with basic configuration
  snapShotTest(
    'MyModule Stack (Basic Config): ',
    Create.stackProvider(
      'MyModuleStack',
      (app, context) => {
        // TODO: Replace with your module's CDK App class
        // const myApp = new MyModuleCDKApp({
        //   context: {
        //     ...context,
        //     module_configs: path.join(__dirname, 'test-configs', 'basic-config.yaml')
        //   }
        // });
        // myApp.generateStack();
        // return myApp.stacks[0];

        // Placeholder - remove this when implementing
        throw new Error('TODO: Implement your module test');
      },
      {
        module_name: 'test-my-module-basic',
      },
    ),
  );

  // Test with advanced configuration
  snapShotTest(
    'MyModule Stack (Advanced Config): ',
    Create.stackProvider(
      'MyModuleStackAdvanced',
      (app, context) => {
        // TODO: Replace with your module's CDK App class
        // const myApp = new MyModuleCDKApp({
        //   context: {
        //     ...context,
        //     module_configs: path.join(__dirname, 'test-configs', 'advanced-config.yaml')
        //   }
        // });
        // myApp.generateStack();
        // return myApp.stacks[0];

        // Placeholder - remove this when implementing
        throw new Error('TODO: Implement your advanced module test');
      },
      {
        module_name: 'test-my-module-advanced',
      },
    ),
  );

  // Test the entire app synthesis (optional)
  snapShotTestApp(
    'MyModule App (Complete): ',
    Create.appProvider(
      context => {
        // TODO: Replace with your module's CDK App class
        // const myApp = new MyModuleCDKApp({
        //   context: {
        //     ...context,
        //     module_configs: path.join(__dirname, 'test-configs', 'basic-config.yaml')
        //   }
        // });
        // myApp.generateStack();
        // return myApp.app;

        // Placeholder - remove this when implementing
        throw new Error('TODO: Implement your app test');
      },
      {
        module_name: 'test-my-module-app',
      },
    ),
  );
});

/*
TODO: Create test configuration files in test/test-configs/:

1. basic-config.yaml - Minimal configuration for your module
2. advanced-config.yaml - Full-featured configuration
3. security-config.yaml - Security-focused configuration (if applicable)

Example basic-config.yaml:
```yaml
# Replace with your module's configuration structure
myModuleSettings:
  enabled: true
  name: test-module
  properties:
    - key: value
```

Example advanced-config.yaml:
```yaml
# Replace with your module's advanced configuration
myModuleSettings:
  enabled: true
  name: test-advanced-module
  properties:
    - key: value
    - advancedKey: advancedValue
  advancedFeatures:
    feature1: enabled
    feature2: configured
```
*/
