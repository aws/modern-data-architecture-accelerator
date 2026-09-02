/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sanitizes Bedrock AgentCore names to match CloudFormation pattern requirements.
 * Pattern: ^[a-zA-Z][a-zA-Z0-9_]{0,47}$ (no hyphens allowed)
 *
 * The naming service (props.naming.resourceName) caps the name passed in, but the leading-letter
 * prefix below is prepended *after* that cap — so a name already sitting at the limit (e.g. a naming
 * prefix beginning with a digit) would overflow the CloudFormation limit. Pass `maxLength` (the
 * resource's CFN name limit) to enforce the final length here, after prefixing. When omitted this is a
 * pure character sanitizer, preserving the original contract for callers that cap elsewhere.
 *
 * Transformations applied:
 * - Replaces hyphens with underscores
 * - Removes invalid characters (keeps only alphanumeric and underscores)
 * - Ensures name starts with a letter (adds prefix if needed)
 * - Truncates the result to `maxLength` when provided (after prefixing)
 *
 * @param name - The name to sanitize
 * @param prefix - Optional prefix to add if name doesn't start with a letter (default: 'r_')
 * @param maxLength - Optional CFN name limit enforced after prefixing; omit to skip length enforcement
 * @returns Sanitized name matching CloudFormation pattern
 */
export function sanitizeBedrockAgentcoreName(name: string, prefix: string = 'r_', maxLength?: number): string {
  // Replace hyphens with underscores (Bedrock AgentCore doesn't allow hyphens)
  let sanitized = name.replace(/-/g, '_');

  // Remove any invalid characters (keep only alphanumeric and underscores)
  sanitized = sanitized.replace(/\W/g, '_');

  // Ensure it starts with a letter
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = `${prefix}${sanitized}`;
  }

  // Enforce the CFN name limit after prefixing. Truncating the tail keeps the required leading letter
  // and leaves every remaining character valid; the result stays deterministic for a given input.
  if (maxLength !== undefined && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}
