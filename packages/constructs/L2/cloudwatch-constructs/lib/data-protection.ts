/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataIdentifier } from 'aws-cdk-lib/aws-logs';

/**
 * Built-in set of AWS-managed data identifiers that MDAA always masks on the log groups it protects.
 * This is the compliance floor: configuration may add identifiers on top of it, but never remove one.
 */
export const BUILTIN_DATA_IDENTIFIERS: readonly DataIdentifier[] = [
  DataIdentifier.EMAILADDRESS,
  DataIdentifier.CREDITCARDNUMBER,
  DataIdentifier.SSN_US,
  DataIdentifier.NAME,
  DataIdentifier.ADDRESS,
  DataIdentifier.PHONENUMBER_US,
  DataIdentifier.IPADDRESS,
];

/**
 * CloudWatch Logs data protection (PII masking) configuration. The module always masks a built-in
 * set of sensitive data types (emails, SSNs, credit card numbers, etc.) in log events on ingestion;
 * this configuration only tightens that posture by adding identifiers, and can never reduce it.
 *
 * Use cases: extending PII masking with additional identifiers, organization-specific masking requirements
 *
 * AWS: CloudWatch Logs Data Protection Policy
 *
 * Validation: Optional; additionalIdentifiers only adds to the built-in identifier set
 */
export interface DataProtectionProperty {
  /**
   * Additional AWS-managed data identifiers to mask, on top of the built-in
   * comprehensive set (EmailAddress, CreditCardNumber, Ssn-US, Name, Address,
   * PhoneNumber-US, IpAddress). Each entry is a name matching an AWS-managed data
   * identifier (e.g., "DriversLicense-US", "PassportNumber-US").
   *
   * This field is additive only - it cannot remove or override the built-in
   * identifiers, so it can never reduce the masking baseline.
   *
   * Use cases: stricter PII masking, organization-specific identifier requirements
   *
   * AWS: CloudWatch Logs managed data identifiers
   *
   * Validation: Optional; String[]; must be valid AWS data identifier names
   **/
  readonly additionalIdentifiers?: string[];
}

/**
 * Builds a CloudWatch Logs data protection policy document. The built-in identifier floor
 * ({@link BUILTIN_DATA_IDENTIFIERS}) is always masked; any `additionalIdentifiers` supplied via
 * config are added on top (deduplicated). This is additive only - the floor can never be reduced.
 *
 * @param policyName - the CloudWatch data-protection policy `Name` (per-module, e.g.
 *   `agentcore-runtime-data-protection` / `bedrock-invocation-data-protection`)
 * @param dataProtection - optional config adding identifiers on top of the built-in floor
 * @returns a CloudWatch Logs data protection policy document (audit + redact statements)
 */
export function buildDataProtectionPolicy(
  policyName: string,
  dataProtection?: DataProtectionProperty,
): Record<string, unknown> {
  const identifierNames = new Set<string>(BUILTIN_DATA_IDENTIFIERS.map(id => id.name));
  for (const name of dataProtection?.additionalIdentifiers ?? []) {
    identifierNames.add(new DataIdentifier(name).name);
  }

  const dataIdentifierArns = Array.from(identifierNames).map(
    name => `arn:aws:dataprotection::aws:data-identifier/${name}`,
  );

  return {
    Name: policyName,
    Version: '2021-06-01',
    Statement: [
      {
        Sid: 'audit-policy',
        DataIdentifier: dataIdentifierArns,
        Operation: {
          Audit: {
            FindingsDestination: {},
          },
        },
      },
      {
        Sid: 'redact-policy',
        DataIdentifier: dataIdentifierArns,
        Operation: {
          Deidentify: {
            MaskConfig: {},
          },
        },
      },
    ],
  };
}
