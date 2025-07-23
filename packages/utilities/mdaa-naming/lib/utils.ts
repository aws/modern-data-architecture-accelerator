/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function validateResourceName(resourceName: string): string {
  // Handle single character case separately
  if (resourceName.length === 1) {
    if (!/^[A-Za-z0-9]$/.test(resourceName)) {
      throw new Error(`Invalid single-character format: ${resourceName}. Must be alphanumeric.`);
    }
    return resourceName;
  }

  // Regex breakdown:
  // ^[A-Za-z]        - Starts with letter
  // [A-Za-z0-9-]*    - Contains only letters, numbers, and hyphens
  // [A-Za-z0-9]$     - Ends with letter/number (not hyphen)
  const validPattern = /^[A-Za-z0-9][A-Za-z0-9\-_.]*[A-Za-z0-9]$/;

  if (!isException(resourceName) && !validPattern.test(resourceName)) {
    throw new Error(`Invalid string format: ${resourceName}`);
  }

  return resourceName;
}

export function isException(name: string): boolean {
  return name.indexOf('Token[TOKEN') > -1 || name.endsWith('vpc-');
}
