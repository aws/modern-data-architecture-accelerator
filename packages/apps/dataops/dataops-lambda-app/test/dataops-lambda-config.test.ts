/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { LambdaFunctionConfigParser } from '../lib/dataops-lambda-config';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Builds a minimal, schema-valid config that can be mutated per test to trigger
 * a specific validation failure.
 */
function baseConfig(): any {
  return {
    projectName: 'test-project',
    queues: {
      'data-pipeline-queue': {
        dlq: { maxReceiveCount: 5 },
      },
    },
  };
}

function parse(config: any): LambdaFunctionConfigParser {
  const app = new MdaaTestApp();
  return new LambdaFunctionConfigParser(app.testStack, {
    org: 'test-org',
    domain: 'test-domain',
    environment: 'test-env',
    module_name: 'test-module',
    naming: app.naming,
    rawConfig: config,
  });
}

function dlq(config: any): any {
  return config.queues['data-pipeline-queue'].dlq;
}

describe('LambdaFunctionConfigParser schema-enforced validation', () => {
  it('parses a valid queues section with a dlq maxReceiveCount', () => {
    const parser = parse(baseConfig());
    expect(parser.queues?.['data-pipeline-queue'].dlq?.maxReceiveCount).toEqual(5);
  });

  it('accepts maxReceiveCount at the lower bound of 1', () => {
    const config = baseConfig();
    dlq(config).maxReceiveCount = 1;
    expect(() => parse(config)).not.toThrow();
  });

  it('accepts maxReceiveCount at the SQS upper bound of 1000', () => {
    const config = baseConfig();
    dlq(config).maxReceiveCount = 1000;
    expect(() => parse(config)).not.toThrow();
  });

  it('rejects a maxReceiveCount above the SQS limit of 1000 via the schema', () => {
    const config = baseConfig();
    // CDK validates only that the count is 1 or more, so without the schema's maximum this
    // would synthesize cleanly and be rejected by SQS when the queue is created.
    dlq(config).maxReceiveCount = 1001;
    expect(() => parse(config)).toThrow(/shape errors/);
  });

  it('rejects a maxReceiveCount below 1 via the schema', () => {
    const config = baseConfig();
    dlq(config).maxReceiveCount = 0;
    expect(() => parse(config)).toThrow(/shape errors/);
  });
});
