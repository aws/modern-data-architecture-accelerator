/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { RetentionDays } from 'aws-cdk-lib/aws-logs';

/**
 * Validates an optional CloudWatch Logs retention value at synth against the {@link RetentionDays}
 * enum (a fixed set of numeric values), so misconfiguration fails fast at synth rather than at
 * deploy. `undefined` is valid and means never-expire — equivalent to passing `9999`
 * ({@link RetentionDays.INFINITE}), the shared audit-by-default across the AgentCore constructs: no
 * retention policy is applied, leaving the log groups at CloudWatch's never-expire default.
 *
 * `9999` ({@link RetentionDays.INFINITE}) is accepted as an explicit, lockable "never expire" choice
 * — so a config can pin indefinite retention rather than only reaching it by omission. The constructs
 * intercept the sentinel and apply no retention policy (rather than sending `9999` to CloudWatch
 * Logs' `PutRetentionPolicy`, which rejects it), so it deploys cleanly and yields the same
 * never-expire result as omission.
 *
 * Shared by the AgentCore Gateway, Runtime, and Harness L3 constructs, which all expose a
 * `logRetentionDays` knob on their audit/log-protection surface and share the same default and
 * accepted values.
 *
 * @param logRetentionDays - the configured retention in days, `9999` for never-expire, or undefined
 *   for the default (never-expire)
 * @param fieldName - the config field name to name in the error (e.g. `logRetentionDays`)
 * @throws Error naming the offending value and listing the valid retention values
 */
export function validateLogRetentionDays(logRetentionDays: number | undefined, fieldName: string): void {
  if (logRetentionDays === undefined) {
    return;
  }
  // RetentionDays is a numeric enum; Object.values yields both numbers and names, so keep only the
  // numeric members. INFINITE (9999) is included: it is an accepted, explicit never-expire value
  // that the constructs map to "no retention policy applied".
  const validValues = Object.values(RetentionDays).filter((v): v is number => typeof v === 'number');
  if (!validValues.includes(logRetentionDays)) {
    throw new Error(
      `Invalid ${fieldName} '${logRetentionDays}'. Must be a valid CloudWatch Logs ` +
        `retention value (one of: ${validValues.join(', ')}), where 9999 means never-expire.`,
    );
  }
}
