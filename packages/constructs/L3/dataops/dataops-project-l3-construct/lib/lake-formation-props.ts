/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LFTagConfig } from '@aws-mdaa/lakeformation-tags-l3-construct';

/**
 * Project-level Lake Formation configuration for centralized tag-based access control.
 *
 * Use cases: Centralized tag management, project-wide TBAC, tag vocabulary definition
 *
 * AWS: AWS Lake Formation project-level configuration for tag-based access control
 *
 * Validation: lfTags must have unique tag keys; tag values must be non-empty arrays
 */
export interface LakeFormationConfig {
  /**
   * Lake Formation tag definitions (key + allowed values) shared across all project databases.
   *
   * Use cases: Tag vocabulary definition, project-wide TBAC, centralized tag management
   *
   * AWS: AWS Lake Formation tags for tag-based access control
   *
   * Validation: Tag keys must be unique; tag values must be non-empty arrays; tags are created at account level
   **/
  readonly lfTags?: LFTagConfig[];
}

/**
 * LF-Tag expression mapping tag keys to allowed values for tag-based permission filtering.
 *
 * Use cases: Tag-based filtering, ABAC implementation, permission scoping, resource selection
 *
 * AWS: AWS Lake Formation tag expression for tag-based permission filtering
 *
 * Validation: Keys must be valid LF-Tag keys; values must be string or string array of allowed tag values
 */
export interface LFTagExpression {
  /**
   * LF-Tag key to value(s) mapping
   */
  /** @jsii ignore */
  readonly [tagKey: string]: string | string[];
}

/**
 * Tag-based grant configuration defining principals, permissions, and LF-Tag expression for fine-grained access control.
 *
 * Use cases: Tag-based permissions, fine-grained access control, ABAC implementation, data governance
 *
 * AWS: AWS Lake Formation tag-based permission grant configuration
 *
 * Validation: principalArns, permissions, and lfTagExpression are required; permissionsWithGrantOption and resourceType are optional
 */
export interface TagBasedGrantConfig {
  /**
   * Map of principal names to IAM ARNs receiving the tag-based permissions.
   *
   * Use cases: Principal assignment, permission recipients, IAM integration
   *
   * AWS: IAM principal ARNs for Lake Formation permission grants
   *
   * Validation: Must be non-empty; ARNs must be valid IAM principal ARNs; required
   **/
  readonly principalArns: NamedPrincipalArns;

  /**
   * Lake Formation permissions to grant (e.g. DESCRIBE, SELECT, ALTER, CREATE_TABLE, ALL).
   *
   * Use cases: Permission definition, access control, data operations
   *
   * AWS: AWS Lake Formation permissions
   *
   * Validation: Must be non-empty array of valid Lake Formation permission strings; required
   **/
  readonly permissions: string[];

  /**
   * Permissions that recipients can further grant to other principals.
   *
   * Use cases: Permission delegation, administrative access, grant management
   *
   * AWS: AWS Lake Formation permissions with grant option
   *
   * Validation: Must be array of valid Lake Formation permission strings if specified; should be a subset of permissions
   **/
  readonly permissionsWithGrantOption?: string[];

  /**
   * Resource type scope: DATABASE or TABLE (defaults to TABLE).
   *
   * Use cases: Resource type selection, permission scope, granular control
   *
   * AWS: AWS Lake Formation resource type for permission scope
   *
   * Validation: Must be 'DATABASE' or 'TABLE' if provided
   **/
  readonly resourceType?: 'DATABASE' | 'TABLE';

  /**
   * LF-Tag expression defining which resources the permissions apply to.
   *
   * Use cases: Resource filtering, ABAC implementation, tag-based selection, data governance
   *
   * AWS: AWS Lake Formation tag expression for resource selection
   *
   * Validation: Must be non-empty LFTagExpression; tag keys must exist; tag values must be valid; required
   **/
  readonly lfTagExpression: LFTagExpression;
}

/**
 * Mapping of descriptive principal names to their IAM ARNs for organized permission management.
 *
 * Use cases: Principal management, permission assignment, IAM organization
 *
 * AWS: IAM principal ARN mapping for Lake Formation permission grants
 *
 * Validation: Keys must be descriptive names; values must be valid IAM principal ARNs
 */
export interface NamedPrincipalArns {
  /**
   * Principal name to ARN mapping
   */
  /** @jsii ignore */
  readonly [principalName: string]: string;
}

/**
 * Named map of tag-based grant configurations for organized Lake Formation ABAC management.
 *
 * Use cases: Named tag-based grants, ABAC organization, grant management
 *
 * AWS: AWS Lake Formation tag-based grants with named configurations
 *
 * Validation: Names must be unique identifiers; each entry must be a valid TagBasedGrantConfig
 */
export interface NamedTagBasedGrants {
  /**
   * The unique name of the tag-based grant
   */
  /** @jsii ignore */
  readonly [name: string]: TagBasedGrantConfig;
}
