/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for referencing IAM roles across MDAA modules using multiple identification methods. Enables flexible role resolution for cross-module dependencies, external role integration, and SSO-managed roles while supporting both mutable and immutable role references.
 *
 * Use cases: Cross-module IAM role sharing; External role integration from Landing Zone Accelerator; SSO-managed role references for federated access
 *
 * AWS: References AWS IAM roles for service permissions, cross-account access, and federated identity integration
 *
 * Validation: At least one of name, arn, or id must be provided; arn must be valid IAM role ARN format; name must be valid IAM role name
 */
export interface MdaaRoleRef {
  /**
   * Q-ENHANCED-PROPERTY
   * Unique identifier for the role reference within a configuration scope, enabling role reference management and resolution tracking. Provides a logical name for the role reference that can be used for cross-referencing and dependency management.
   *
   * Use cases: Role reference tracking in complex configurations; Cross-module role dependency mapping; Configuration validation and debugging
   *
   * AWS: Logical identifier for IAM role references in MDAA configurations
   *
   * Validation: Must be unique within the configuration scope if provided; alphanumeric and hyphens recommended
   **/
  readonly refId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * IAM role name for role resolution within the same AWS account. Enables simple role references when the role exists in the current account and provides the most straightforward method for role identification.
   *
   * Use cases: Same-account role references; MDAA-generated role references; Simple role configuration
   *
   * AWS: AWS IAM role name for role lookup and permission assignment
   *
   * Validation: Must be valid IAM role name (1-64 characters, alphanumeric plus +=,.@-_ characters)
   **/
  readonly name?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Full IAM role ARN for cross-account role references and explicit role identification. Enables precise role targeting across AWS accounts and regions, essential for cross-account data sharing and federated access scenarios.
   *
   * Use cases: Cross-account role references; External role integration; Precise role identification with account/region context
   *
   * AWS: AWS IAM role ARN for cross-account permissions and explicit role targeting
   *
   * Validation: Must be valid IAM role ARN format (arn:aws:iam::account-id:role/role-name)
   **/
  readonly arn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * IAM role unique identifier for role resolution using the role's AWS-generated ID. Provides the most stable role reference method that persists across role name changes and enables precise role targeting.
   *
   * Use cases: Stable role references across name changes; Precise role identification; Role references in automated systems
   *
   * AWS: AWS IAM role unique ID for stable role identification
   *
   * Validation: Must be valid IAM role ID format (typically AROA followed by alphanumeric characters)
   **/
  readonly id?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Flag indicating whether the referenced role should be treated as immutable and not modified by MDAA operations. Prevents accidental role modifications for externally managed roles and ensures role integrity for critical system roles.
   *
   * Use cases: External role protection; System role preservation; Landing Zone Accelerator role integration
   *
   * AWS: Role modification protection flag for IAM role management
   *
   * Validation: Boolean value, defaults to false if not specified
   **/
  readonly immutable?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Flag indicating the role should be resolved as an AWS SSO auto-generated role, enabling integration with AWS Identity Center managed roles. Automatically implies immutability and enables federated access patterns for MDAA resources.
   *
   * Use cases: AWS Identity Center integration; Federated user access; SSO-managed role references
   *
   * AWS: AWS Identity Center (SSO) role resolution for federated access
   *
   * Validation: Boolean value, implies immutable=true when set to true
   **/
  readonly sso?: boolean;
}
export interface MdaaResolvableRoleRef {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique identifier for the role reference within a configuration scope, ensuring deterministic role resolution and enabling dependency tracking. Mandatory for resolvable role references to guarantee successful role lookup.
   *
   * Use cases: Guaranteed role resolution; Dependency graph construction; Configuration validation
   *
   * AWS: Required logical identifier for IAM role references in MDAA configurations
   *
   * Validation: Must be unique within the configuration scope; alphanumeric and hyphens recommended
   **/
  readonly refId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * IAM role name for role resolution within the same AWS account in resolvable role references. Enables simple role references when the role exists in the current account with guaranteed resolution context.
   *
   * Use cases: Same-account resolvable role references; MDAA-generated role references with tracking; Simple role configuration with resolution guarantees
   *
   * AWS: AWS IAM role name for role lookup and permission assignment in resolvable contexts
   *
   * Validation: Must be valid IAM role name (1-64 characters, alphanumeric plus +=,.@-_ characters)
   **/
  readonly name?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Full IAM role ARN for cross-account role references in resolvable role contexts. Enables precise role targeting across AWS accounts and regions with guaranteed resolution tracking for cross-account data sharing scenarios.
   *
   * Use cases: Cross-account resolvable role references; External role integration with tracking; Precise role identification with resolution context
   *
   * AWS: AWS IAM role ARN for cross-account permissions and explicit role targeting in resolvable contexts
   *
   * Validation: Must be valid IAM role ARN format (arn:aws:iam::account-id:role/role-name)
   **/
  readonly arn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * IAM role unique identifier for stable role resolution using the role's AWS-generated ID in resolvable contexts. Provides the most stable role reference method with guaranteed resolution tracking that persists across role name changes.
   *
   * Use cases: Stable resolvable role references; Precise role identification with tracking; Role references in automated systems with resolution guarantees
   *
   * AWS: AWS IAM role unique ID for stable role identification in resolvable contexts
   *
   * Validation: Must be valid IAM role ID format (typically AROA followed by alphanumeric characters)
   **/
  readonly id?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Flag indicating whether the referenced role should be treated as immutable in resolvable role contexts. Prevents accidental role modifications for externally managed roles while maintaining resolution tracking capabilities.
   *
   * Use cases: External role protection with tracking; System role preservation in resolvable contexts; Landing Zone Accelerator role integration with resolution
   *
   * AWS: Role modification protection flag for IAM role management in resolvable contexts
   *
   * Validation: Boolean value, defaults to false if not specified
   **/
  readonly immutable?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Flag indicating the role should be resolved as an AWS SSO auto-generated role in resolvable contexts. Enables integration with AWS Identity Center managed roles while maintaining resolution tracking for federated access patterns.
   *
   * Use cases: AWS Identity Center integration with tracking; Federated user access in resolvable contexts; SSO-managed role references with resolution guarantees
   *
   * AWS: AWS Identity Center (SSO) role resolution for federated access in resolvable contexts
   *
   * Validation: Boolean value, implies immutable=true when set to true
   **/
  readonly sso?: boolean;
}
