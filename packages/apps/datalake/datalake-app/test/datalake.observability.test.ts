/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataLakeCDKApp } from '../lib/datalake';
import * as path from 'path';

function createApp(): DataLakeCDKApp {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
  };
  const app = new DataLakeCDKApp({ context });
  app.generateStack();
  app.synth({ force: true, validateOnSynthesis: true });
  return app;
}

describe('Datalake App Observability Tests', () => {
  test('Synth succeeds with observability config', () => {
    expect(() => createApp()).not.toThrow();
  });

  test('Storage Lens created when observability.storageLens.enabled is true', () => {
    const app = createApp();
    const stacks = app.node.children.filter(
      (child): child is import('aws-cdk-lib').Stack => 'templateOptions' in child,
    );
    expect(stacks.length).toBeGreaterThan(0);
    const template = Template.fromStack(stacks[0]);
    template.resourceCountIs('AWS::S3::StorageLens', 1);
    template.hasResourceProperties('AWS::S3::StorageLens', {
      StorageLensConfiguration: {
        IsEnabled: true,
      },
    });
  });

  test('Config parsing passes observability to construct', () => {
    const app = createApp();
    const stacks = app.node.children.filter(
      (child): child is import('aws-cdk-lib').Stack => 'templateOptions' in child,
    );
    expect(stacks.length).toBeGreaterThan(0);
    const template = Template.fromStack(stacks[0]);
    template.hasResourceProperties('AWS::S3::StorageLens', {
      StorageLensConfiguration: {
        Include: {
          Buckets: Match.anyValue(),
        },
      },
    });
  });
});
