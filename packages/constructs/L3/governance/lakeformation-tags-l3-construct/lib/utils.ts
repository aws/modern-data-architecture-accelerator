/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sanitize string for use in CDK construct IDs
 * * @param str raw string
 */
export function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '');
}
