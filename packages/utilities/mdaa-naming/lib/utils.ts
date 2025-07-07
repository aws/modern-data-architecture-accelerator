/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function fixAndValidate(input: string): string {
  const normalized = input;

  // Handle single character case separately
  if (normalized.length === 1) {
    if (!/^[A-Za-z0-9]$/.test(normalized)) {
      throw new Error(`Invalid single-character format: ${normalized}. Must be alphanumeric.`);
    }
    return normalized;
  }

  // Regex breakdown:
  // ^[A-Za-z]        - Starts with letter
  // [A-Za-z0-9-]*    - Contains only letters, numbers, and hyphens
  // [A-Za-z0-9]$     - Ends with letter/number (not hyphen)
  const validPattern = /^[A-Za-z0-9][A-Za-z0-9\-_.]*[A-Za-z0-9]$/;

  if (!isException(normalized) && !validPattern.test(normalized)) {
    throw new Error(`Invalid string format: ${normalized}`);
  }

  return normalized;
}

function isException(name: string): boolean {
  return name.indexOf('Token[TOKEN') > -1 || name.endsWith('vpc-');
}
