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

/**
 * Deterministic AWS environment for stable synth output. MdaaCdkApp prefers the
 * CDK_DEPLOY_* variables over CDK_DEFAULT_*, so they are cleared (undefined) rather
 * than inherited from a developer shell that exports them.
 */
const SYNTH_ENV: Record<string, string | undefined> = {
  CDK_DEFAULT_ACCOUNT: 'test-account',
  CDK_DEFAULT_REGION: 'test-region',
  CDK_DEPLOY_ACCOUNT: undefined,
  CDK_DEPLOY_REGION: undefined,
};

/** Assigning undefined to process.env stores the string "undefined", so unset values are deleted. */
function applyEnv(values: Record<string, string | undefined>): void {
  Object.entries(values).forEach(([name, value]) => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  });
}

// Matches MDAA version strings like "1.5.0", "1.5.20260401145352" in known contexts.
// The version suffix uses non-overlapping groups to avoid super-linear backtracking (S5852).
const VERSION_PATTERNS = [
  /Version \d+\.\d+\.\d+(?:[a-zA-Z][a-zA-Z0-9.]*|\.\d[a-zA-Z0-9.]*)*/g, // "Version 1.5.0" or "Version 1.5.20260401145352"
  /AWSSOLUTION\/SO\d+\/v\d+\.\d+\.\d+(?:[a-zA-Z][a-zA-Z0-9.]*|\.\d[a-zA-Z0-9.]*)*/g, // "AWSSOLUTION/SO0320/v1.5.0"
];

// Replacement regex for the version number portion — uses the same non-overlapping structure.
const VERSION_NUMBER_PATTERN = /\d+\.\d+\.\d+(?:[a-zA-Z][a-zA-Z0-9.]*|\.\d[a-zA-Z0-9.]*)*/; //NOSONAR

/**
 * Normalize volatile values in a template so that MDAA version bumps
 * don't cause diff failures.
 */
export function normalizeTemplate(template: Record<string, unknown>): Record<string, unknown> {
  const json = VERSION_PATTERNS.reduce(
    (s, pattern) => s.replace(pattern, match => match.replace(VERSION_NUMBER_PATTERN, 'VERSION')),
    JSON.stringify(template),
  );

  const normalized = JSON.parse(json) as Record<string, unknown>;

  // Strip encoded cdk_nag suppression reasons. CDK Nag base64-encodes reasons
  // containing characters > U+00FF (e.g. em-dashes), and embeds the full temp-dir
  // config path in the reason prefix. This makes the value non-deterministic across
  // runs. We strip only the `reason` field when `is_reason_encoded` is true — the
  // `id` field still detects new/removed suppressions.
  const resources = normalized.Resources as Record<string, Record<string, unknown>> | undefined;
  if (resources) {
    for (const resource of Object.values(resources)) {
      const metadata = resource.Metadata as Record<string, unknown> | undefined;
      const cdkNag = metadata?.cdk_nag as { rules_to_suppress?: Array<Record<string, unknown>> } | undefined;
      if (cdkNag?.rules_to_suppress) {
        for (const rule of cdkNag.rules_to_suppress) {
          if (rule.is_reason_encoded) {
            delete rule.reason;
            delete rule.is_reason_encoded;
          }
        }
      }
    }
  }

  return normalized;
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

/** Default resource logical ID patterns to ignore in baseline diffs. */
export const DEFAULT_IGNORE_PATTERNS: string[] = [
  'CurrentVersion[a-fA-F0-9]+$', // Lambda version hash changes with code/config
  'AliasLive[a-fA-F0-9]+$', // Lambda aliases reference CurrentVersion
  '^CDKMetadata$', // AWS::CDK::Metadata Analytics string encodes CDK construct versions (env-dependent)
];

/**
 * Default resource properties to strip from baselines.
 * These apply identically to module-level and starter kit diff tests.
 */
export const DEFAULT_IGNORE_PROPERTIES: Record<string, string[]> = {
  'Alias[a-fA-F0-9]+$': ['FunctionVersion'],
  // The datazone/sagemaker domain config custom resource carries a Date.now()
  // 'refresh' property to force re-invocation on every deploy — always non-deterministic.
  domainConfigcr: ['refresh'],
};

/**
 * Strip ignored resources and properties from a CloudFormation template.
 * Used by both module-level and starter kit baseline tests.
 */
export function stripIgnoredContent(
  template: Record<string, unknown>,
  extraPatterns: string[] = [],
  extraProperties: Record<string, string[]> = {},
): Record<string, unknown> {
  const ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...extraPatterns].map(p => new RegExp(p));
  const mergedProps = { ...DEFAULT_IGNORE_PROPERTIES, ...extraProperties };
  const ignoreProperties = Object.entries(mergedProps).map(([pattern, props]) => ({
    pattern: new RegExp(pattern),
    properties: props,
  }));

  const resources = template.Resources as Record<string, Record<string, unknown>> | undefined;
  if (!resources) return template;

  const filtered: Record<string, Record<string, unknown>> = {};
  for (const [logicalId, resource] of Object.entries(resources)) {
    if (ignorePatterns.some(p => p.test(logicalId))) continue;
    let processedResource = resource;
    for (const { pattern, properties } of ignoreProperties) {
      if (pattern.test(logicalId) && processedResource.Properties) {
        const props = { ...(processedResource.Properties as Record<string, unknown>) };
        for (const prop of properties) {
          delete props[prop];
        }
        processedResource = { ...processedResource, Properties: props };
      }
    }
    filtered[logicalId] = processedResource;
  }
  return { ...template, Resources: filtered };
}

/**
 * Options for baselineDiffTestApp.
 */
export interface BaselineDiffOptions {
  /**
   * Resource logical ID patterns to ignore when writing baselines.
   * Each pattern is tested as a regex against the logical ID.
   * Matching resources are stripped entirely from the baseline template.
   * Use this for resources with fully non-deterministic output
   * (e.g., Lambda code assets that change due to mocking).
   */
  readonly ignoreResourcePatterns?: string[];

  /**
   * Properties to strip from specific resources before writing baselines.
   * Keys are regex patterns matched against logical IDs; values are arrays
   * of property names to remove from the resource's Properties object.
   * Use this for resources that are mostly stable but have one or two
   * non-deterministic properties (e.g., a `refresh` timestamp).
   *
   * @example
   * { 'domainConfigcr': ['refresh'] }
   */
  readonly ignoreResourceProperties?: Record<string, string[]>;
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

  /**
   * Remove ignored resources and properties from a template.
   */
  function stripIgnored(template: Record<string, unknown>): Record<string, unknown> {
    return stripIgnoredContent(template, options?.ignoreResourcePatterns, options?.ignoreResourceProperties);
  }

  test(`${testNamePrefix} Baseline Diff Test`, async () => {
    const spies = mockCodeFactoryMethods();

    const prevEnv = Object.fromEntries(Object.keys(SYNTH_ENV).map(name => [name, process.env[name]]));
    applyEnv(SYNTH_ENV);
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
          const normalized = stripIgnored(normalizeTemplate(stack.template as Record<string, unknown>));
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
      // Also strip ignored resources so they don't appear in diffs
      for (const stack of stacks) {
        const templateFile = path.join(assembly.directory, stack.templateFile);
        const raw = JSON.parse(fs.readFileSync(templateFile, 'utf-8'));
        const normalized = stripIgnored(normalizeTemplate(raw as Record<string, unknown>));
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
          const resourceDiffs = stackDiff.resources.differenceCount;
          const outputDiffs = stackDiff.outputs.differenceCount;
          const total = resourceDiffs + outputDiffs;
          if (total > 0) {
            const diffSummary = `[${testNamePrefix}] Stack "${stack.stackName}" has ${resourceDiffs} resource and ${outputDiffs} output difference(s).`;

            if (UPDATE_BASELINES) {
              // Print the diff, update the baseline, and continue without failing
              console.log(`\n${diffSummary}`);
              const normalized = stripIgnored(normalizeTemplate(stack.template as Record<string, unknown>));
              fs.writeFileSync(baselineFile, JSON.stringify(normalized, null, 2) + '\n');
              console.log(`[baseline-updated] ${baselineFile}\n`);
            } else {
              failures.push(`${diffSummary} Run npm run test:update-baselines to accept.`);
            }
          }
        }
      }

      if (failures.length > 0) {
        throw new Error(failures.join('\n\n'));
      }
    } finally {
      spies.forEach((spy: { mockRestore: () => void }) => spy.mockRestore());
      applyEnv(prevEnv);
    }
  }, 120000);
}
