/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// CloudFormation custom resource type max length is 60 (including "Custom::" prefix)
export const MAX_RESOURCE_TYPE_LENGTH = 60 - 'Custom::'.length;

/**
 * Generates a hash code for a string using a simple hash algorithm.
 * Note: This is not cryptographically secure but sufficient for resource naming.
 * @param s The string to hash
 * @returns A hexadecimal hash string
 */
export function hashCodeHex(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.trunc(Math.imul(31, h) + (s.codePointAt(i) ?? 0));
  }
  return Math.abs(h).toString(16);
}

/**
 * Truncates a resource type string to fit within CloudFormation's 60 character limit.
 * If the string exceeds the limit, it preserves as much of the original string as possible
 * while appending a hash to ensure uniqueness.
 * @param resourceType The raw resource type string
 * @param maxLength Maximum length for the resource type (default: 52 to account for "Custom::" prefix)
 * @returns A truncated resource type string with hash suffix if needed
 */
export function truncateResourceType(resourceType: string, maxLength: number = MAX_RESOURCE_TYPE_LENGTH): string {
  if (resourceType.length <= maxLength) {
    return resourceType;
  }
  // Generate hash of the full string to ensure uniqueness
  const hash = hashCodeHex(resourceType);
  // Preserve as much of the original string as possible, leaving room for "-" and hash
  const truncatedLength = maxLength - hash.length - 1;
  return `${resourceType.substring(0, truncatedLength)}-${hash}`;
}
