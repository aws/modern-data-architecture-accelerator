/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as fs from 'fs';
import * as path from 'path';
import { expect, jest, test } from '@jest/globals';
import { Toolkit, DiffMethod, NonInteractiveIoHost } from '@aws-cdk/toolkit-lib';
import { Fact } from 'aws-cdk-lib/region-info';
import { TestRegionFact } from './test-app';

const UPDATE_BASELINES = process.env.UPDATE_BASELINES === 'true';

// Matches MDAA version strings like "1.5.0", "1.5.20260401145352" in known contexts
// NOSONAR
const VERSION_PATTERNS = [
  /Version \d+\.\d+\.\d+[a-zA-Z0-9.]*/g, // "Version 1.5.0" or "Version 1.5.20260401145352"
  /AWSSOLUTION\/SO\d+\/v\d+\.\d+\.\d+[a-zA-Z0-9.]*/g, // "AWSSOLUTION/SO0320/v1.5.0"
];

/**
 * Normalize volatile values in a template so that MDAA version bumps
 * don't cause diff failures.
 */
function normalizeTemplate(template: Record<string, unknown>): Record<string, unknown> {
  const json = VERSION_PATTERNS.reduce(
    (s, pattern) => s.replace(pattern, match => match.replace(/\d+\.\d+\.\d+[a-zA-Z0-9.]*/, 'VERSION')),
    JSON.stringify(template),
  );

  return JSON.parse(json) as Record<string, unknown>;
}

function isValidTestName(name: string): boolean {
  return /^[a-zA-Z0-9\s\-_]{1,100}$/.test(name);
}

function configBaseName(app: cdk.App): string {
  const configPath = app.node.tryGetContext('module_configs') as string | undefined;
  return configPath ? path.basename(configPath, path.extname(configPath)) : 'default';
}

const mockImageCode = {
  bind: jest.fn().mockReturnValue({ image: { imageUri: 'mock-image-uri' } }),
  bindToResource: jest.fn(),
};

const mockCode = {
  bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
  bindToResource: jest.fn(),
  _bind: jest.fn().mockReturnValue(mockImageCode),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOnClass = (cls: any, method: string): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spy = jest.spyOn(cls as any, method);
  spy.mockReturnValue(mockCode);
  return spy;
};

/**
 * Mock all Lambda Code and DockerImageCode factory methods to prevent
 * Docker invocation, filesystem access, and external lookups during synth.
 * Returns spies so they can be restored after the test.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockCodeFactoryMethods(): Array<any> {
  return [
    mockOnClass(lambda.Code, 'fromAsset'),
    mockOnClass(lambda.Code, 'fromAssetImage'),
    mockOnClass(lambda.Code, 'fromDockerBuild'),
    mockOnClass(lambda.Code, 'fromCustomCommand'),
    mockOnClass(lambda.Code, 'fromEcrImage'),
    mockOnClass(lambda.Code, 'fromBucket'),
    mockOnClass(lambda.Code, 'fromBucketV2'),
    mockOnClass(lambda.Code, 'fromInline'),
    mockOnClass(lambda.Code, 'fromCfnParameters'),
    mockOnClass(lambda.DockerImageCode, 'fromEcr'),
    mockOnClass(lambda.DockerImageCode, 'fromImageAsset'),
  ];
}

/**
 * Options for baselineDiffTestApp.
 */
export interface BaselineDiffOptions {
  /**
   * Resource logical ID patterns to ignore when counting diffs.
   * Each pattern is tested as a regex against the logical ID.
   * Use this for resources with expected non-deterministic changes
   * (e.g., Lambda code assets that change due to mocking).
   */
  readonly ignoreResourcePatterns?: string[];
}

/**
 * Baseline diff test using the CDK Toolkit Library.
 *
 * Stores baseline CloudFormation templates as JSON under test/__snapshots__/,
 * named after the sample config file (e.g., sample-config-comprehensive.baseline.json).
 * When a config produces multiple stacks, each gets its own file:
 * {configBaseName}.{stackName}.baseline.json.
 *
 * Docker-related Lambda Code.from* methods are mocked to prevent Docker
 * invocation during synth.
 *
 * Only resource and output differences are considered failures. Metadata,
 * input parameters, conditions, and mappings are ignored.
 *
 * @param testNamePrefix - Human-readable test name (shown in failures)
 * @param appProvider - Memoized factory that returns the CDK app
 * @param options - Optional configuration (e.g., ignoreResourcePatterns)
 *
 * To create or update baselines:
 *   UPDATE_BASELINES=true npx jest <test-file>
 */
export function baselineDiffTestApp(
  testNamePrefix: string,
  appProvider: () => cdk.App,
  options?: BaselineDiffOptions,
): void {
  if (!isValidTestName(testNamePrefix)) {
    throw new Error('Invalid test name prefix: must be 1-100 characters, alphanumeric/spaces/hyphens/underscores only');
  }

  if (typeof appProvider !== 'function') {
    throw new TypeError('appProvider must be a function');
  }

  // Global patterns for resources with non-deterministic logical IDs
  const defaultIgnorePatterns = [
    'CurrentVersion', // Lambda version hash changes with code/config across version bumps
    'Alias', // Lambda aliases reference CurrentVersion, so they drift too
  ];
  const ignorePatterns = [...defaultIgnorePatterns, ...(options?.ignoreResourcePatterns ?? [])].map(p => new RegExp(p));

  test(`${testNamePrefix} Baseline Diff Test`, async () => {
    const spies = mockCodeFactoryMethods();

    // Set deterministic AWS environment for stable synth output
    const prevAccount = process.env.CDK_DEFAULT_ACCOUNT;
    const prevRegion = process.env.CDK_DEFAULT_REGION;
    process.env.CDK_DEFAULT_ACCOUNT = 'test-account';
    process.env.CDK_DEFAULT_REGION = 'test-region';
    Fact.register(new TestRegionFact(), true);

    try {
      const app = appProvider();
      expect(app).toBeDefined();

      const configName = configBaseName(app);
      const assembly = app.synth();
      const testFile = expect.getState().testPath;
      if (!testFile) {
        throw new Error('Could not determine test file path');
      }
      const snapshotsDir = path.join(path.dirname(testFile), '__snapshots__');

      const stacks = assembly.stacks.filter(
        s => s?.stackName && s?.template && typeof s.stackName === 'string' && isValidTestName(s.stackName),
      );
      expect(stacks.length).toBeGreaterThan(0);

      const singleStack = stacks.length === 1;

      // Write baselines for stacks that have no baseline yet (first run)
      let firstRun = false;
      for (const stack of stacks) {
        const fileName = singleStack ? `${configName}.baseline.json` : `${configName}.${stack.stackName}.baseline.json`;
        const baselineFile = path.join(snapshotsDir, fileName);

        if (!fs.existsSync(baselineFile)) {
          fs.mkdirSync(snapshotsDir, { recursive: true });
          const normalized = normalizeTemplate(stack.template as Record<string, unknown>);
          fs.writeFileSync(baselineFile, JSON.stringify(normalized, null, 2) + '\n');
          firstRun = true;
        }
      }

      if (firstRun && !UPDATE_BASELINES) {
        return; // First run — baselines created, nothing to diff
      }

      // Diff each stack against its baseline using the CDK toolkit
      const failures: string[] = [];

      // Normalize synth output on disk so the toolkit diffs version-stable templates
      for (const stack of stacks) {
        const templateFile = path.join(assembly.directory, stack.templateFile);
        const raw = JSON.parse(fs.readFileSync(templateFile, 'utf-8'));
        const normalized = normalizeTemplate(raw as Record<string, unknown>);
        fs.writeFileSync(templateFile, JSON.stringify(normalized, null, 2));
      }

      for (const stack of stacks) {
        const fileName = singleStack ? `${configName}.baseline.json` : `${configName}.${stack.stackName}.baseline.json`;
        const baselineFile = path.join(snapshotsDir, fileName);
        const ioHost = new NonInteractiveIoHost({ isCI: true });
        const toolkit = new Toolkit({ ioHost });
        const source = await toolkit.fromAssemblyDirectory(assembly.directory);

        const result = await toolkit.diff(source, {
          method: DiffMethod.LocalFile(baselineFile),
          stacks: { strategy: 'pattern-must-match-single' as never, patterns: [stack.hierarchicalId] },
        });

        const stackDiff = result[stack.stackName];
        if (stackDiff) {
          // Log ignored diffs
          if (ignorePatterns.length > 0) {
            Object.keys(stackDiff.resources.changes)
              .filter(logicalId => ignorePatterns.some(p => p.test(logicalId)))
              .filter(logicalId => stackDiff.resources.changes[logicalId]?.isDifferent)
              .forEach(logicalId => {
                console.warn(`[diff-ignored] ${stack.stackName}: ${logicalId}`);
              });
          }

          const resourceDiffs =
            ignorePatterns.length > 0
              ? Object.keys(stackDiff.resources.changes)
                  .filter(logicalId => !ignorePatterns.some(p => p.test(logicalId)))
                  .filter(logicalId => stackDiff.resources.changes[logicalId]?.isDifferent).length
              : stackDiff.resources.differenceCount;
          const outputDiffs = stackDiff.outputs.differenceCount;
          const total = resourceDiffs + outputDiffs;
          if (total > 0) {
            const diffSummary = `[${testNamePrefix}] Stack "${stack.stackName}" has ${resourceDiffs} resource and ${outputDiffs} output difference(s).`;

            if (UPDATE_BASELINES) {
              // Print the diff, update the baseline, and continue without failing
              console.log(`\n${diffSummary}`);
              const normalized = normalizeTemplate(stack.template as Record<string, unknown>);
              fs.writeFileSync(baselineFile, JSON.stringify(normalized, null, 2) + '\n');
              console.log(`[baseline-updated] ${baselineFile}\n`);
            } else {
              failures.push(`${diffSummary} Run npm run test:diff:update to accept.`);
            }
          }
        }
      }

      if (failures.length > 0) {
        throw new Error(failures.join('\n\n'));
      }
    } finally {
      spies.forEach((spy: { mockRestore: () => void }) => spy.mockRestore());
      process.env.CDK_DEFAULT_ACCOUNT = prevAccount;
      process.env.CDK_DEFAULT_REGION = prevRegion;
    }
  }, 120000);
}
