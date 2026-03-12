/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MdaaRoleRef {
  /**
   * Unique identifier for the role reference within a configuration scope, enabling role lookup and deduplication.
   *
   * Use cases: Role reference identification; Configuration deduplication; Role lookup key
   *
   * AWS: Logical identifier for IAM role references within MDAA configuration
   *
   * Validation: Optional; must be unique within the configuration scope if provided
   */
  readonly refId?: string;
  /**
   * IAM role name for role resolution within the same AWS account.
   *
   * Use cases: Same-account role references; Role name-based resolution; Local IAM role binding
   *
   * AWS: IAM role name resolved via GetRole within the deployment account
   *
   * Validation: Optional; must be a valid IAM role name; mutually preferred with arn/id for resolution
   */
  readonly name?: string;
  /**
   * Full IAM role ARN for cross-account role references and explicit role identification.
   *
   * Use cases: Cross-account role references; Explicit role binding; Multi-account deployments
   *
   * AWS: Full IAM role ARN (arn:aws:iam::ACCOUNT:role/ROLE-NAME)
   *
   * Validation: Optional; must be a valid IAM role ARN if provided
   */
  readonly arn?: string;
  /**
   * IAM role unique identifier for role resolution using the role's AWS-generated ID.
   *
   * Use cases: Stable role references; Role resolution by unique ID; Immutable role binding
   *
   * AWS: IAM role unique ID (e.g., AROA...)
   *
   * Validation: Optional; must be a valid IAM role unique ID if provided
   */
  readonly id?: string;
  /**
   * Flag indicating whether the referenced role should be treated as immutable and not modified by MDAA operations.
   *
   * Use cases: Pre-existing role protection; Externally managed roles; Read-only role references
   *
   * AWS: Controls whether MDAA attaches policies or modifies the referenced IAM role
   *
   * Validation: Optional boolean; defaults to false
   */
  readonly immutable?: boolean;
  /**
   * Flag indicating the role should be resolved as an AWS SSO auto-generated role.
   *
   * Use cases: AWS IAM Identity Center integration; SSO permission set role binding; Federated access
   *
   * AWS: Resolves role via AWS SSO/Identity Center auto-generated role naming convention
   *
   * Validation: Optional boolean; defaults to false
   */
  readonly sso?: boolean;
}
export interface MdaaResolvableRoleRef {
  /** Unique identifier for the role reference within a configuration scope, ensuring */
  readonly refId: string;
  /** IAM role name for role resolution within the same AWS account in resolvable role references */
  readonly name?: string;
  /** Full IAM role ARN for cross-account role references in resolvable role contexts */
  readonly arn?: string;
  /** IAM role unique identifier for stable role resolution using the role's AWS-generated ID in resolvable contexts */
  readonly id?: string;
  /** Flag indicating whether the referenced role should be treated as immutable in resolvable role contexts */
  readonly immutable?: boolean;
  /** Flag indicating the role should be resolved as an AWS SSO auto-generated role in resolvable contexts */
  readonly sso?: boolean;
}
