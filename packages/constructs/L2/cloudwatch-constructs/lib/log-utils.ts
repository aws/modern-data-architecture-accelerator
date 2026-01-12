/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Clean query string by stripping leading whitespace from each line.
 * This is useful for YAML multiline strings that may have indentation.
 *
 * @param queryString - The query string to clean
 * @returns The cleaned query string with leading whitespace removed from each line
 */
export function cleanQueryString(queryString: string): string {
  const lines = queryString.split('\n');
  const cleanedLines = lines.map(line => line.trimStart());
  return cleanedLines.join('\n');
}

/**
 * Ensure query string has a limit clause, appending a default if missing.
 * CloudWatch Logs Insights queries should have a limit to prevent excessive results.
 *
 * @param queryString - The query string to check
 * @returns The query string with a limit clause (either existing or appended)
 */
export function ensureLimitClause(queryString: string): string {
  const trimmedQuery = queryString.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  // Check if query already has a limit clause
  if (lowerQuery.includes('| limit ') || lowerQuery.includes('|limit ')) {
    return trimmedQuery;
  }

  // Append default limit
  return `${trimmedQuery}\n| limit 10000`;
}
