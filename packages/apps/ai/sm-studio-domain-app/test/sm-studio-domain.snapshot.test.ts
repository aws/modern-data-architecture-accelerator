/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { SageMakerStudioDomainApp } from '../lib/sm-studio-domain';
import * as path from 'path';

describe('SageMaker Studio Domain Snapshot Tests', () => {
  snapShotTestApp(
    'SageMaker Studio Domain App Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerStudioDomainApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
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

  snapShotTestApp(
    'SageMaker Studio Domain App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerStudioDomainApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-studio-domain-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'SageMaker Studio Domain App SSO',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerStudioDomainApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-sso.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-studio-domain-sso',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
