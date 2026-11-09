/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataIdentifier } from 'aws-cdk-lib/aws-logs';
import { buildDataProtectionPolicy, BUILTIN_DATA_IDENTIFIERS } from '../lib';

describe('buildDataProtectionPolicy', () => {
  const arnFor = (name: string) => `arn:aws:dataprotection::aws:data-identifier/${name}`;

  // The floor is pinned to literal names on purpose. Every other assertion in this file derives
  // its expectation from BUILTIN_DATA_IDENTIFIERS, so it would still pass if an identifier were
  // deleted from the constant - silently unmasking that category in every protected log group. This test is the
  // one that fails on such a change, so the documented "mandatory compliance floor ... cannot be
  // reduced" guarantee is actually enforced. Additions belong at the end of the list.
  it('pins the built-in PII floor so it cannot be silently reduced', () => {
    expect(BUILTIN_DATA_IDENTIFIERS.map(id => id.name)).toEqual([
      'EmailAddress',
      'CreditCardNumber',
      'Ssn-US',
      'Name',
      'Address',
      'PhoneNumber-US',
      'IpAddress',
    ]);
  });

  it('masks the built-in PII floor when no additional identifiers are supplied', () => {
    const policy = buildDataProtectionPolicy('test-data-protection');
    const expectedArns = BUILTIN_DATA_IDENTIFIERS.map(id => arnFor(id.name));

    expect(policy.Name).toBe('test-data-protection');
    expect(policy.Version).toBe('2021-06-01');

    const statements = policy.Statement as Array<Record<string, unknown>>;
    expect(statements).toHaveLength(2);
    statements.forEach(statement => {
      expect(statement.DataIdentifier).toEqual(expectedArns);
    });
  });

  it('emits an audit statement and a redact statement', () => {
    const policy = buildDataProtectionPolicy('test-data-protection');
    const statements = policy.Statement as Array<Record<string, unknown>>;

    expect(statements[0].Sid).toBe('audit-policy');
    expect(statements[0].Operation).toEqual({ Audit: { FindingsDestination: {} } });
    expect(statements[1].Sid).toBe('redact-policy');
    expect(statements[1].Operation).toEqual({ Deidentify: { MaskConfig: {} } });
  });

  it('adds additional identifiers on top of the built-in floor', () => {
    const policy = buildDataProtectionPolicy('test-data-protection', {
      additionalIdentifiers: ['DriversLicense-US', 'PassportNumber-US'],
    });
    const statements = policy.Statement as Array<Record<string, unknown>>;
    expect(statements).toHaveLength(2);

    // Both the audit and the redact statement carry the additions; redact is what masks them.
    statements.forEach(statement => {
      const arns = statement.DataIdentifier as string[];
      // Built-in floor still present.
      BUILTIN_DATA_IDENTIFIERS.forEach(id => {
        expect(arns).toContain(arnFor(id.name));
      });
      // Additions present.
      expect(arns).toContain(arnFor('DriversLicense-US'));
      expect(arns).toContain(arnFor('PassportNumber-US'));
      expect(arns).toHaveLength(BUILTIN_DATA_IDENTIFIERS.length + 2);
    });
  });

  it('deduplicates an addition that overlaps the built-in floor', () => {
    const policy = buildDataProtectionPolicy('test-data-protection', {
      additionalIdentifiers: [DataIdentifier.EMAILADDRESS.name],
    });
    const statements = policy.Statement as Array<Record<string, unknown>>;
    expect(statements).toHaveLength(2);

    statements.forEach(statement => {
      const arns = statement.DataIdentifier as string[];
      expect(arns).toHaveLength(BUILTIN_DATA_IDENTIFIERS.length);
      expect(arns.filter(a => a === arnFor(DataIdentifier.EMAILADDRESS.name))).toHaveLength(1);
    });
  });
});
