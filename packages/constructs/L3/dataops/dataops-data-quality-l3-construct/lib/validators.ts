/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Validates AWS Glue Data Quality ruleset name.
 *
 * AWS Glue ruleset name requirements:
 * - Length: 1-255 characters
 * - Valid characters: alphanumeric (A-Z, a-z, 0-9), hyphen (-), period (.), underscore (_)
 * - No spaces allowed (even though AWS docs mention spaces, we exclude them for SSM path compatibility)
 *
 * @param name - The ruleset name to validate
 * @throws Error if the name is invalid
 */
export function validateRulesetName(name: string): void {
  if (name.length < 1 || name.length > 255) {
    throw new Error(
      `Invalid ruleset name "${name}": must be between 1 and 255 characters (current length: ${name.length})`,
    );
  }

  const validPattern = /^[A-Za-z0-9._-]+$/;
  if (!validPattern.test(name)) {
    throw new Error(
      `Invalid ruleset name "${name}": must contain only alphanumeric characters, hyphens, periods, and underscores (no spaces)`,
    );
  }
}
