/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cloudwatch from '@aws-mdaa/cloudwatch-constructs';
import * as shared from '../lib';

describe('data protection and retention re-exports', () => {
  // The implementations and their tests live in cloudwatch-constructs; this pins the re-export
  // surface the AgentCore constructs import from.
  test('re-exports the cloudwatch-constructs helpers unchanged', () => {
    expect(shared.buildDataProtectionPolicy).toBe(cloudwatch.buildDataProtectionPolicy);
    expect(shared.validateLogRetentionDays).toBe(cloudwatch.validateLogRetentionDays);
    expect(shared.BUILTIN_DATA_IDENTIFIERS).toBe(cloudwatch.BUILTIN_DATA_IDENTIFIERS);
  });
});
