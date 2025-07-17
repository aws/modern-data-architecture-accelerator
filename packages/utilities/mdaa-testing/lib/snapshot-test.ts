/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// NOSONAR
/* istanbul ignore file */
/* sonar-disable */
// This file is excluded from SonarQube coverage analysis as it contains test utilities

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { expect, test } from '@jest/globals';

// Define interface for stack templates to improve type safety
interface StackTemplates {
  [stackName: string]: Record<string, unknown>;
}

function isValidTestName(testNamePrefix: string): boolean {
  const validNameRegex = /^[a-zA-Z0-9\s\-_]{1,100}$/;
  return (
    typeof testNamePrefix === 'string' &&
    testNamePrefix.length > 0 &&
    testNamePrefix.length <= 100 &&
    validNameRegex.test(testNamePrefix)
  );
}

export function snapShotTest(testNamePrefix: string, stackProvider: () => cdk.Stack | undefined): void {
  if (!isValidTestName(testNamePrefix)) {
    throw new Error(
      'Invalid test name prefix: must be 1-100 characters and contain only alphanumeric characters, spaces, hyphens, and underscores',
    );
  }

  if (typeof stackProvider !== 'function') {
    throw new Error('stackProvider must be a function');
  }

  test(`${testNamePrefix} Snapshot Test`, () => {
    let stack: cdk.Stack | undefined;

    try {
      stack = stackProvider();
    } catch (error) {
      throw new Error(`Failed to create stack: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    expect(stack).toBeDefined();
    if (!stack) return;

    configureSnapshotSerializers();

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
}

export function snapShotTestApp(testNamePrefix: string, appProvider: () => cdk.App): void {
  if (!isValidTestName(testNamePrefix)) {
    throw new Error(
      'Invalid test name prefix: must be 1-100 characters and contain only alphanumeric characters, spaces, hyphens, and underscores',
    );
  }

  if (typeof appProvider !== 'function') {
    throw new Error('appProvider must be a function');
  }

  test(`${testNamePrefix} App Snapshot Test`, () => {
    let app: cdk.App;

    try {
      app = appProvider();
    } catch (error) {
      throw new Error(`Failed to create app: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    expect(app).toBeDefined();

    configureSnapshotSerializers();

    let assembly;
    try {
      assembly = app.synth();
    } catch (error) {
      throw new Error(`Failed to synthesize app: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const stackTemplates: StackTemplates = {};

    for (const stack of assembly.stacks) {
      if (stack?.stackName && stack?.template && typeof stack.stackName === 'string') {
        if (isValidTestName(stack.stackName)) {
          stackTemplates[stack.stackName] = stack.template as Record<string, unknown>;
        }
      }
    }

    expect(stackTemplates).toMatchSnapshot();
  });
}

const MAX_STRING_LENGTH = 1000; 
const REGEX_TIMEOUT_MS = 100; 

function safeRegexTest(pattern: RegExp, input: string): boolean {
  if (typeof input !== 'string' || input.length > MAX_STRING_LENGTH) {
    return false;
  }

  try {
    const startTime = Date.now();
    const result = pattern.test(input);
    const endTime = Date.now();

    if (endTime - startTime > REGEX_TIMEOUT_MS) {
      console.warn('Regex operation took too long, potential ReDoS attack');
      return false;
    }

    return result;
  } catch (error) {
    console.warn('Regex test failed:', error);
    return false;
  }
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (val: unknown): boolean => {
  return (
    typeof val === 'string' &&
    val.length === 36 && 
    safeRegexTest(uuidRegex, val)
  );
};

const zipRegex = /^[0-9a-f]{64}\.zip$/i;
const isZip = (val: unknown): boolean => {
  return (
    typeof val === 'string' &&
    val.length === 68 && 
    safeRegexTest(zipRegex, val)
  );
};

const jsonRegex = /^[a-z0-9]{1,50}\.json$/i;
const isGreedyJson = (val: unknown): boolean => {
  return (
    typeof val === 'string' &&
    val.length >= 6 && 
    val.length <= 55 && 
    safeRegexTest(jsonRegex, val)
  );
};

const md5Regex = /^[0-9a-f]{32}$/i;
const isMd5 = (val: unknown): boolean => {
  return typeof val === 'string' && val.length === 32 && !val.startsWith('REPLACED') && safeRegexTest(md5Regex, val);
};

const sha256Regex = /^[0-9a-f]{64}$/i;
const isSha256 = (val: unknown): boolean => {
  return typeof val === 'string' && val.length === 64 && !val.startsWith('REPLACED') && safeRegexTest(sha256Regex, val);
};

const assetHashRegex = /^[0-9a-f]{64}$/i;
const isAssetHash = (val: unknown): boolean => {
  return typeof val === 'string' && val.length === 64 && safeRegexTest(assetHashRegex, val);
};

const s3BucketRegex = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]-[0-9a-f]{8}$/;
const isS3BucketWithSuffix = (val: unknown): boolean => {
  return (
    typeof val === 'string' &&
    val.length >= 12 &&
    val.length <= 63 && 
    safeRegexTest(s3BucketRegex, val)
  );
};

const cfnLogicalIdRegex = /^[A-Za-z][A-Za-z0-9]{0,246}[0-9A-F]{8}$/;
const isCfnLogicalId = (val: unknown): boolean => {
  return (
    typeof val === 'string' &&
    val.length >= 9 && 
    val.length <= 255 && 
    safeRegexTest(cfnLogicalIdRegex, val)
  );
};

const arnWithAccountRegex = /^arn:aws[a-z0-9-]*:[a-z0-9-]+:[a-z0-9-]*:\d{12}:/;
const isArnWithAccount = (val: unknown): boolean => {
  return (
    typeof val === 'string' &&
    val.length >= 20 && 
    val.length <= MAX_STRING_LENGTH &&
    safeRegexTest(arnWithAccountRegex, val)
  );
};

const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/;
const isTimestamp = (val: unknown): boolean => {
  return (
    typeof val === 'string' &&
    val.length >= 19 && 
    val.length <= 24 && 
    safeRegexTest(timestampRegex, val)
  );
};

function safeArnReplace(val: unknown): string {
  if (typeof val !== 'string') {
    return '"REPLACED-ARN"';
  }

  try {
    const accountIdRegex = /:\d{12}:/;
    if (safeRegexTest(accountIdRegex, val)) {
      return val.replace(accountIdRegex, ':REPLACED-ACCOUNT-ID:');
    }
    return val;
  } catch (error) {
    console.warn('Failed to replace account ID in ARN:', error);
    return '"REPLACED-ARN"';
  }
}

function configureSnapshotSerializers(): void {
  expect.addSnapshotSerializer({
    test: isUuid,
    print: (): string => '"REPLACED-UUID"',
  });

  expect.addSnapshotSerializer({
    test: isZip,
    print: (): string => '"REPLACED-GENERATED-NAME.zip"',
  });

  expect.addSnapshotSerializer({
    test: isGreedyJson,
    print: (): string => '"REPLACED-JSON-PATH.json"',
  });

  expect.addSnapshotSerializer({
    test: isMd5,
    print: (): string => '"REPLACED-MD5-HASH"',
  });

  expect.addSnapshotSerializer({
    test: isSha256,
    print: (): string => '"REPLACED-SHA256-HASH"',
  });

  expect.addSnapshotSerializer({
    test: isAssetHash,
    print: (): string => '"REPLACED-ASSET-HASH"',
  });

  expect.addSnapshotSerializer({
    test: isS3BucketWithSuffix,
    print: (): string => '"REPLACED-S3-BUCKET-NAME"',
  });

  expect.addSnapshotSerializer({
    test: isCfnLogicalId,
    print: (): string => '"REPLACED-CFN-LOGICAL-ID"',
  });

  expect.addSnapshotSerializer({
    test: isArnWithAccount,
    print: safeArnReplace,
  });

  expect.addSnapshotSerializer({
    test: isTimestamp,
    print: (): string => '"REPLACED-TIMESTAMP"',
  });
}
