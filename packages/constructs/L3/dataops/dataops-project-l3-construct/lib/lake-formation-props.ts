/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LFTagConfig } from '@aws-mdaa/lakeformation-tags-l3-construct';

/**
 * Q-ENHANCED-INTERFACE
 * Lake Formation configuration interface for centralized tag-based access control management. Defines project-wide Lake Formation resources including tag vocabulary definitions that are shared across all databases in the project.
 *
 * Use cases: Centralized tag management; Project-wide TBAC; Tag vocabulary definition; Shared governance configuration
 *
 * AWS: AWS Lake Formation project-level configuration for centralized tag-based access control
 *
 * Validation: lfTags must have unique tag keys; tag values must be non-empty arrays
 */
export interface LakeFormationConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lake Formation tag definitions for tag-based access control vocabulary. Defines the tag keys and their allowed values that can be used across all databases in the project for implementing consistent tag-based access control policies.
   *
   * Use cases: Tag vocabulary definition; Project-wide TBAC; Centralized tag management; Consistent classification
   *
   * AWS: AWS Lake Formation tags for tag-based access control vocabulary
   *
   * Validation: Tag keys must be unique; tag values must be non-empty arrays; tags are created at account level
   **/
  readonly lfTags?: LFTagConfig[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Lake Formation tag expression interface for tag-based permission filtering enabling attribute-based access control (ABAC) and fine-grained data governance. Maps LF-Tag keys to their allowed values for defining resource access patterns through tag-based permissions.
 *
 * Use cases: Tag-based filtering; ABAC implementation; Permission scoping; Resource selection; Fine-grained access control; Data governance
 *
 * AWS: AWS Lake Formation tag expression for tag-based permission filtering and ABAC
 *
 * Example: { environment: ['dev', 'test'], data_tier: ['bronze', 'silver'] }
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
 * Q-ENHANCED-INTERFACE
 * Lake Formation tag-based grant configuration interface for implementing fine-grained permissions through LF-Tag expressions. Defines grant properties including principals, permissions, resource types, and tag expressions for systematic tag-based access control and data governance.
 *
 * Use cases: Tag-based permissions; Fine-grained access control; ABAC implementation; Permission management; Data governance; Resource access control
 *
 * AWS: AWS Lake Formation tag-based permission grant configuration for ABAC and data governance
 *
 * Validation: principalArns must be non-empty; permissions must be valid LF permissions; lfTagExpression must be valid tag expression
 */
export interface TagBasedGrantConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required mapping of principal names to IAM ARNs for Lake Formation permission grant assignment enabling organized principal management. Defines the IAM principals that will receive tag-based permissions for data access and governance operations.
   *
   * Use cases: Principal assignment; Permission recipients; IAM integration; Access control; Principal management
   *
   * AWS: IAM principal ARNs for Lake Formation tag-based permission grants
   *
   * Validation: Must be non-empty NamedPrincipalArns; ARNs must be valid IAM principal ARNs; required for permission grants
   **/
  readonly principalArns: NamedPrincipalArns;

  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Lake Formation permissions to grant enabling data access and governance operations. Defines the specific LF permissions that principals will receive for resources matching the tag expression.
   *
   * Use cases: Permission definition; Access control; Data operations; Governance permissions; Resource access
   *
   * AWS: AWS Lake Formation permissions for data access and governance operations
   *
   * Examples: ['DESCRIBE', 'SELECT'], ['DESCRIBE', 'ALTER', 'CREATE_TABLE'], ['ALL']
   *
   * Validation: Must be non-empty array of valid Lake Formation permission strings; required for access control
   **/
  readonly permissions: string[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lake Formation permissions with grant option enabling permission delegation and administrative capabilities. Defines permissions that can be further granted by the recipient principals to other principals.
   *
   * Use cases: Permission delegation; Administrative access; Grant management; Permission propagation; Delegated administration
   *
   * AWS: AWS Lake Formation permissions with grant option for permission delegation
   *
   * Validation: Must be array of valid Lake Formation permission strings if specified; subset of permissions array
   **/
  readonly permissionsWithGrantOption?: string[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lake Formation resource type specification for permission scope enabling database-level or table-level access control. Defines whether the tag-based permissions apply to databases or tables for appropriate governance granularity.
   *
   * Use cases: Resource type selection; Permission scope; Database access; Table access; Granular control
   *
   * AWS: AWS Lake Formation resource type for permission scope and access control
   *
   * Validation: Must be 'DATABASE' or 'TABLE'; defaults to 'TABLE' for table-level permissions
   **/
  readonly resourceType?: 'DATABASE' | 'TABLE';

  /**
   * Q-ENHANCED-PROPERTY
   * Required LF-Tag expression defining resource selection criteria for tag-based permissions enabling attribute-based access control. Specifies which resources the permissions apply to based on their LF-Tag values for fine-grained data governance.
   *
   * Use cases: Resource filtering; ABAC implementation; Tag-based selection; Fine-grained access; Data governance; Resource matching
   *
   * AWS: AWS Lake Formation tag expression for resource selection and ABAC
   *
   * Validation: Must be non-empty LFTagExpression; tag keys must exist; tag values must be valid; required for tag-based permissions
   **/
  readonly lfTagExpression: LFTagExpression;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named principal ARNs mapping interface for systematic IAM principal management and permission assignment. Maps descriptive principal names to their IAM ARNs for organized permission grant management and clear principal identification.
 *
 * Use cases: Principal management; Permission assignment; IAM organization; Grant management; Principal identification
 *
 * AWS: IAM principal ARN mapping for Lake Formation permission grants
 *
 * Example: { dataAnalyst: 'arn:aws:iam::123456789012:role/DataAnalyst', dataScientist: 'arn:aws:iam::123456789012:role/DataScientist' }
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
 * Q-ENHANCED-INTERFACE
 * Named tag-based grant configuration interface for Lake Formation tag-based access control with organized grant management capabilities. Defines named tag-based grant mappings for systematic Lake Formation ABAC permission assignment with descriptive grant identifiers.
 *
 * Use cases: Named tag-based grants; ABAC organization; Grant management; Permission mapping; Systematic access control
 *
 * AWS: AWS Lake Formation tag-based grants with named configurations for organized ABAC management
 *
 * Validation: Names must be unique identifiers; each entry must map to valid TagBasedGrantConfig configuration
 */
export interface NamedTagBasedGrants {
  /**
   * The unique name of the tag-based grant
   */
  /** @jsii ignore */
  readonly [name: string]: TagBasedGrantConfig;
}
