/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, beforeAll } from '@jest/globals';
import { snapShotTest, Create, snapShotTestApp } from '@aws-mdaa/testing';
import { SageMakerStudioDomainApp } from '../lib/sm-studio-domain';
import * as path from 'path';

describe('SageMaker Studio Domain Snapshot Tests', () => {
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
    'SageMaker Studio Domain Stack',
    Create.stackProvider(
      'SageMakerStudioDomainStackMain',
      (_, context) => {
        const moduleApp = new SageMakerStudioDomainApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-sagemaker-studio-domain-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'SageMaker Studio Domain App',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerStudioDomainApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-studio-domain-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
