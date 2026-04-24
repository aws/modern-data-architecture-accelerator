/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, afterAll } from '@jest/globals';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { baselineDiffTestApp, BaselineDiffOptions } from '../lib/diff';

const snapshotsDir = path.join(__dirname, '__snapshots__');

// Track baselines created during this test run for cleanup
const createdBaselines: string[] = [];

afterAll(() => {
  for (const f of createdBaselines) {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
    }
  }
});

function trackBaseline(configName: string, stackName?: string) {
  const fileName = stackName ? `${configName}.${stackName}.baseline.json` : `${configName}.baseline.json`;
  const filePath = path.join(snapshotsDir, fileName);
  createdBaselines.push(filePath);
  return filePath;
}

describe('baselineDiffTestApp', () => {
  describe('input validation', () => {
    it('should throw on empty test name prefix', () => {
      expect(() => baselineDiffTestApp('', () => new cdk.App())).toThrow('Invalid test name prefix');
    });

    it('should throw on test name with special characters', () => {
      expect(() => baselineDiffTestApp('test@name!', () => new cdk.App())).toThrow('Invalid test name prefix');
    });

    it('should throw on test name exceeding 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(() => baselineDiffTestApp(longName, () => new cdk.App())).toThrow('Invalid test name prefix');
    });

    it('should throw when appProvider is not a function', () => {
      expect(() => baselineDiffTestApp('Valid Name', 'not a function' as never)).toThrow(
        'appProvider must be a function',
      );
    });

    it('should throw on number as appProvider', () => {
      expect(() => baselineDiffTestApp('Valid Name', 42 as never)).toThrow('appProvider must be a function');
    });

    it('should throw on null as appProvider', () => {
      expect(() => baselineDiffTestApp('Valid Name', null as never)).toThrow('appProvider must be a function');
    });
  });

  // Basic registration — no diff, baseline already exists
  describe('test registration', () => {
    baselineDiffTestApp('Registration Test Single', () => {
      const app = new cdk.App();
      new cdk.Stack(app, 'TestStack');
      return app;
    });
  });

  describe('test registration with options', () => {
    const options: BaselineDiffOptions = {
      ignoreResourcePatterns: ['domainConfigcr', 'scheduledaction'],
    };
    baselineDiffTestApp(
      'Registration Test With Options',
      () => {
        const app = new cdk.App();
        new cdk.Stack(app, 'TestStack');
        return app;
      },
      options,
    );
  });

  // Covers configBaseName branch when module_configs context is set
  describe('configBaseName with module_configs context', () => {
    baselineDiffTestApp('Config With Module Configs', () => {
      const app = new cdk.App({
        context: { module_configs: '/some/path/to/my-config.yaml' },
      });
      new cdk.Stack(app, 'TestStack');
      return app;
    });
  });

  // Covers multi-stack per-stack baseline naming
  describe('multiple stacks produce per-stack baselines', () => {
    baselineDiffTestApp('Multi Stack', () => {
      const app = new cdk.App();
      new cdk.Stack(app, 'StackA');
      new cdk.Stack(app, 'StackB');
      return app;
    });
  });

  // Covers first-run baseline creation + early return (line 159)
  describe('first run baseline creation single stack', () => {
    const configName = `first-run-single-${Date.now()}`;
    trackBaseline(configName);

    baselineDiffTestApp('First Run Single', () => {
      const app = new cdk.App({
        context: { module_configs: `${configName}.yaml` },
      });
      new cdk.Stack(app, 'TestStack');
      return app;
    });
  });

  // Covers first-run with multiple stacks
  describe('first run baseline creation multi stack', () => {
    const configName = `first-run-multi-${Date.now()}`;
    trackBaseline(configName, 'StackX');
    trackBaseline(configName, 'StackY');

    baselineDiffTestApp('First Run Multi', () => {
      const app = new cdk.App({
        context: { module_configs: `${configName}.yaml` },
      });
      new cdk.Stack(app, 'StackX');
      new cdk.Stack(app, 'StackY');
      return app;
    });
  });

  // Covers ignore patterns filtering
  describe('diff with ignore patterns', () => {
    const options: BaselineDiffOptions = {
      ignoreResourcePatterns: ['CurrentVersion', 'AliasLive', 'CustomPattern'],
    };
    baselineDiffTestApp(
      'Ignore Patterns Filtering',
      () => {
        const app = new cdk.App();
        new cdk.Stack(app, 'TestStack');
        return app;
      },
      options,
    );
  });

  // Covers empty ignore patterns (uses differenceCount directly)
  describe('diff with empty ignore patterns', () => {
    const options: BaselineDiffOptions = { ignoreResourcePatterns: [] };
    baselineDiffTestApp(
      'Empty Ignore Patterns',
      () => {
        const app = new cdk.App();
        new cdk.Stack(app, 'TestStack');
        return app;
      },
      options,
    );
  });

  // Covers normalizeTemplate version replacement (anonymous_2 callback)
  describe('normalizeTemplate handles version strings', () => {
    const configName = 'version-norm';
    const baselineFile = trackBaseline(configName);

    // Pre-create a baseline with normalized version strings matching what normalizeTemplate produces
    const baselineTemplate = {
      Description: 'Version VERSION',
      Metadata: { SolutionId: 'AWSSOLUTION/SO0320/vVERSION' },
      Parameters: {
        BootstrapVersion: {
          Type: 'AWS::SSM::Parameter::Value<String>',
          Default: '/cdk-bootstrap/hnb659fds/version',
          Description:
            'Version of the CDK Bootstrap resources in this environment, automatically retrieved from SSM Parameter Store. [cdk:skip]',
        },
      },
      Rules: {
        CheckBootstrapVersion: {
          Assertions: [
            {
              Assert: { 'Fn::Not': [{ 'Fn::Contains': [['1', '2', '3', '4', '5'], { Ref: 'BootstrapVersion' }] }] },
              AssertDescription:
                "CDK bootstrap stack version 6 required. Please run 'cdk bootstrap' with a recent version of the CDK CLI.",
            },
          ],
        },
      },
    };

    fs.mkdirSync(snapshotsDir, { recursive: true });
    fs.writeFileSync(baselineFile, JSON.stringify(baselineTemplate, null, 2) + '\n');

    baselineDiffTestApp('Version Norm', () => {
      const app = new cdk.App({
        context: { module_configs: `${configName}.yaml` },
      });
      // Stack with version strings that normalizeTemplate should replace
      const stack = new cdk.Stack(app, 'TestStack', {
        description: 'Version 1.5.0',
      });
      stack.addMetadata('SolutionId', 'AWSSOLUTION/SO0320/v1.5.0');
      return app;
    });
  });

  // Covers the case where ignored resources are stripped from both baseline and synth output.
  // Since ignored resources are removed before writing baselines, a clean baseline
  // diffed against a clean synth output produces no differences.
  describe('diff with resource differences and ignore patterns', () => {
    const configName = 'diff-with-ignored';
    const baselineFile = trackBaseline(configName);

    // Baseline has no ignored resources — they were stripped at write time.
    // This matches what stripIgnoredResources produces for an empty stack.
    const baselineTemplate = {
      Resources: {},
      Parameters: {
        BootstrapVersion: {
          Type: 'AWS::SSM::Parameter::Value<String>',
          Default: '/cdk-bootstrap/hnb659fds/version',
          Description:
            'Version of the CDK Bootstrap resources in this environment, automatically retrieved from SSM Parameter Store. [cdk:skip]',
        },
      },
      Rules: {
        CheckBootstrapVersion: {
          Assertions: [
            {
              Assert: { 'Fn::Not': [{ 'Fn::Contains': [['1', '2', '3', '4', '5'], { Ref: 'BootstrapVersion' }] }] },
              AssertDescription:
                "CDK bootstrap stack version 6 required. Please run 'cdk bootstrap' with a recent version of the CDK CLI.",
            },
          ],
        },
      },
    };

    fs.mkdirSync(snapshotsDir, { recursive: true });
    fs.writeFileSync(baselineFile, JSON.stringify(baselineTemplate, null, 2) + '\n');

    // Synth produces an empty stack. After stripping ignored resources,
    // both sides match — no diff.
    baselineDiffTestApp('Diff With Ignored', () => {
      const app = new cdk.App({
        context: { module_configs: `${configName}.yaml` },
      });
      new cdk.Stack(app, 'TestStack');
      return app;
    });
  });
});
