/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Derives a SageMaker UserProfile name from a user ID by replacing
 * non-word characters with hyphens.
 *
 * This is the canonical derivation used by both SageMaker Studio Domain
 * and DataScience Team constructs. Changing this logic will break
 * space ownership associations.
 *
 * @param userid - The user identifier (e.g., SSO user ID or IAM username)
 * @returns A sanitized string suitable for SageMaker UserProfile names
 */
export function deriveUserProfileName(userid: string): string {
  return userid.replace(/\W/g, '-'); //NOSONAR - replaceAll requires es2021 but JSII targets es2020
}
