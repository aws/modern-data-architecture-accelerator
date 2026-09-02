/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { validateLogRetentionDays } from '../lib';

describe('validateLogRetentionDays', () => {
  it('accepts undefined (caller default retention)', () => {
    expect(() => validateLogRetentionDays(undefined, 'logRetentionDays')).not.toThrow();
  });

  it('accepts a valid RetentionDays numeric value', () => {
    expect(() => validateLogRetentionDays(RetentionDays.ONE_MONTH, 'logRetentionDays')).not.toThrow();
  });

  it('accepts the INFINITE sentinel (9999) as an explicit never-expire choice', () => {
    // 9999 is an accepted, lockable never-expire value across all three AgentCore constructs; the
    // constructs apply no retention policy for it (never sending the sentinel to PutRetentionPolicy),
    // so it validates cleanly at synth and yields the same never-expire result as omission.
    expect(() => validateLogRetentionDays(RetentionDays.INFINITE, 'logRetentionDays')).not.toThrow();
  });

  it('lists the INFINITE sentinel (9999) among the accepted values', () => {
    // 9999 is an accepted value, so the error's accepted-values list must advertise it.
    let message = '';
    try {
      validateLogRetentionDays(123, 'logRetentionDays');
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/Must be a valid CloudWatch Logs retention value/);
    expect(message).toContain('9999');
  });

  it('throws for an invalid value, naming the field and value', () => {
    expect(() => validateLogRetentionDays(123, 'logRetentionDays')).toThrow("Invalid logRetentionDays '123'.");
  });

  it('lists the valid retention values in the error', () => {
    expect(() => validateLogRetentionDays(123, 'logRetentionDays')).toThrow(
      /Must be a valid CloudWatch Logs retention value/,
    );
  });
});
