/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Mock aws-cdk-lib/aws-lambda to avoid Docker build during tests
jest.mock('aws-cdk-lib/aws-lambda', () => {
  const actual = jest.requireActual('aws-cdk-lib/aws-lambda');
  return {
    ...actual,
    Code: {
      ...actual.Code,
      fromAsset: jest.fn().mockReturnValue({
        bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
        bindToResource: jest.fn(),
      }),
      fromDockerBuild: jest.fn().mockReturnValue({
        bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
        bindToResource: jest.fn(),
      }),
      fromCustomCommand: jest.fn().mockReturnValue({
        bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
        bindToResource: jest.fn(),
      }),
    },
  };
});

// Mock command-exists to simulate Docker availability
jest.mock('command-exists', () => ({
  sync: jest.fn().mockReturnValue(false), // Simulate Docker not available to use pip fallback
}));

import { QuickSightAccountCDKApp } from '../lib/quicksight-account';

test('SynthTest', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-comprehensive.yaml',
  };
  const app = new QuickSightAccountCDKApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});

test('SynthTest - Minimal config with STANDARD edition and IAM_ONLY auth', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-minimal.yaml',
  };
  const app = new QuickSightAccountCDKApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});

test('SynthTest - Enterprise+Q edition with Active Directory auth', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-enterprise-q.yaml',
  };
  const app = new QuickSightAccountCDKApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});
